import express from 'express';
import pool from '../config/db.js';
import { verifyToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Helper to create notifications
async function createNotification(connection, userId, type, title, body, refId) {
  await connection.query(
    'INSERT INTO notifications (user_id, type, title, body, ref_id) VALUES (?, ?, ?, ?, ?)',
    [userId, type, title, body, refId]
  );
}

// Create a new complaint
router.post('/', verifyToken, async (req, res) => {
  const { subject, description } = req.body;
  if (!subject || !description) {
    return res.status(400).json({ success: false, message: 'Subject and description are required' });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [result] = await connection.query(
      'INSERT INTO complaints (user_id, subject, description) VALUES (?, ?, ?)',
      [req.user.id, subject, description]
    );

    const complaintId = result.insertId;

    // Notify admins
    const [admins] = await connection.query("SELECT id FROM users WHERE role = 'admin'");
    
    for (const admin of admins) {
      await createNotification(
        connection,
        admin.id,
        'new_complaint',
        'شكوى جديدة',
        `شكوى جديدة من ${req.user.username}`,
        complaintId
      );
    }

    await connection.commit();
    res.status(201).json({ success: true, message: 'Complaint submitted successfully', complaintId });
  } catch (error) {
    await connection.rollback();
    console.error(error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  } finally {
    connection.release();
  }
});

// Admin: Get all complaints
router.get('/', verifyToken, requireRole(['admin']), async (req, res) => {
  try {
    const { status } = req.query;
    let query = `
      SELECT c.*, u.username, u.email, u.role
      FROM complaints c
      JOIN users u ON c.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      query += ' AND c.status = ?';
      params.push(status);
    }

    query += ' ORDER BY c.created_at DESC';

    const [complaints] = await pool.query(query, params);
    res.json({ success: true, complaints });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Get user's own complaints
router.get('/my', verifyToken, async (req, res) => {
  try {
    const [complaints] = await pool.query(
      'SELECT * FROM complaints WHERE user_id = ? ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json({ success: true, complaints });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Admin: Update complaint status
router.put('/:id/status', verifyToken, requireRole(['admin']), async (req, res) => {
  const { status } = req.body;
  const complaintId = req.params.id;

  if (!['in_review', 'resolved'].includes(status)) {
    return res.status(400).json({ success: false, message: 'Invalid status' });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [complaint] = await connection.query('SELECT * FROM complaints WHERE id = ?', [complaintId]);
    
    if (complaint.length === 0) {
      throw new Error('Complaint not found');
    }

    await connection.query(
      'UPDATE complaints SET status = ? WHERE id = ?',
      [status, complaintId]
    );

    let statusMsg = status === 'in_review' ? 'قيد المراجعة' : 'تم حلها';

    // Notify user
    await createNotification(
      connection,
      complaint[0].user_id,
      'complaint_status_update',
      'تحديث حالة الشكوى',
      `تم تحديث حالة الشكوى الخاصة بك إلى: ${statusMsg}`,
      complaintId
    );

    await connection.commit();
    res.json({ success: true, message: 'Complaint status updated' });
  } catch (error) {
    await connection.rollback();
    console.error(error);
    res.status(error.message.includes('not found') ? 404 : 500).json({ success: false, message: error.message || 'Internal server error' });
  } finally {
    connection.release();
  }
});

export default router;
