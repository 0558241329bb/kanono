import express from 'express';
import pool from '../config/db.js';
import { verifyToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Helper to create notifications
async function createNotification(connection, userId, type, title, body, refId) {
  await connection.query(
    `INSERT INTO notifications (user_id, type, title, body, ref_id) VALUES (?, ?, ?, ?, ?)`,
    [userId, type, title, body, refId]
  );
}

// Helper to auto-create conversation
async function createConversationIfNotExists(connection, clientId, lawyerId, appointmentId) {
  const [existing] = await connection.query(
    `SELECT id FROM conversations WHERE client_id = ? AND lawyer_id = ?`,
    [clientId, lawyerId]
  );

  if (existing.length > 0) {
    return existing[0].id;
  }

  const [result] = await connection.query(
    `INSERT INTO conversations (client_id, lawyer_id, appointment_id) VALUES (?, ?, ?)`,
    [clientId, lawyerId, appointmentId]
  );
  return result.insertId;
}

// Request an appointment (client only)
router.post('/', verifyToken, requireRole(['client']), async (req, res) => {
  const { lawyer_id, type, requested_date, notes } = req.body;
  const clientId = req.user.id;
  const reqDate = new Date(requested_date);

  if (!lawyer_id || !requested_date) {
    return res.status(400).json({ success: false, message: 'Lawyer ID and requested date are required' });
  }

  if (reqDate <= new Date()) {
    return res.status(400).json({ success: false, message: 'Requested date must be in the future' });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Check if lawyer is approved
    const [lawyers] = await connection.query("SELECT id, username FROM users WHERE id = ? AND role = 'lawyer' AND approved = 1", [lawyer_id]);
    if (lawyers.length === 0) {
      throw new Error('Lawyer not found or not approved');
    }

    // Check conflicts (e.g., overlapping within 1 hour)
    // For simplicity, checking exact same time
    const [conflicts] = await connection.query(`
      SELECT id FROM appointments 
      WHERE lawyer_id = ? AND status IN ('pending', 'accepted') AND requested_date = ?
    `, [lawyer_id, reqDate]);

    if (conflicts.length > 0) {
      throw new Error('Lawyer is already booked at this time');
    }

    const [result] = await connection.query(
      `INSERT INTO appointments (client_id, lawyer_id, type, requested_date, notes, status) VALUES (?, ?, ?, ?, ?, 'pending')`,
      [clientId, lawyer_id, type || 'appointment', reqDate, notes || null]
    );

    const appointmentId = result.insertId;

    const [userRow] = await connection.query(`SELECT username FROM users WHERE id = ?`, [clientId]);
    const clientUsername = userRow.length > 0 ? userRow[0].username : 'مستخدم';

    // Create a notification for the lawyer
    await createNotification(
      connection, 
      lawyer_id, 
      'appointment_request', 
      'New Appointment Request', 
      `New appointment request from ${clientUsername}`, 
      appointmentId
    );

    await connection.commit();
    res.status(201).json({ success: true, message: 'Appointment requested successfully', appointmentId });
  } catch (error) {
    await connection.rollback();
    console.error(error);
    res.status(error.message.includes('Lawyer') ? 400 : 500).json({ success: false, message: error.message || 'Internal server error' });
  } finally {
    connection.release();
  }
});

// Get user appointments
router.get('/', verifyToken, async (req, res) => {
  try {
    const { status } = req.query;
    let query = '';
    const params = [];

    if (req.user.role === 'client') {
      query = `
        SELECT a.*, u.username as lawyer_name, u.profile_picture as lawyer_pic, lp.specialty
        FROM appointments a 
        JOIN users u ON a.lawyer_id = u.id 
        LEFT JOIN lawyer_profiles lp ON u.id = lp.user_id
        WHERE a.client_id = ?
      `;
      params.push(req.user.id);
    } else if (req.user.role === 'lawyer') {
      query = `
        SELECT a.*, u.username as client_name, u.profile_picture as client_pic
        FROM appointments a 
        JOIN users u ON a.client_id = u.id 
        WHERE a.lawyer_id = ?
      `;
      params.push(req.user.id);
    } else {
      query = `SELECT a.* FROM appointments a WHERE 1=1`;
    }

    if (status) {
      query += ` AND a.status = ?`;
      params.push(status);
    }

    query += ` ORDER BY a.requested_date DESC`;

    const [appointments] = await pool.query(query, params);
    res.json({ success: true, appointments });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Get single appointment details
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const [appointments] = await pool.query(`
      SELECT a.*, 
             c.username as client_name, c.profile_picture as client_pic,
             l.username as lawyer_name, l.profile_picture as lawyer_pic
      FROM appointments a
      JOIN users c ON a.client_id = c.id
      JOIN users l ON a.lawyer_id = l.id
      WHERE a.id = ? AND (a.client_id = ? OR a.lawyer_id = ?)
    `, [id, req.user.id, req.user.id]);

    if (appointments.length === 0) {
      return res.status(404).json({ success: false, message: 'Appointment not found or unauthorized' });
    }

    res.json({ success: true, appointment: appointments[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Accept appointment (Lawyer only)
router.put('/:id/accept', verifyToken, requireRole(['lawyer']), async (req, res) => {
  const appointmentId = req.params.id;
  const { confirmed_date } = req.body;
  
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [rows] = await connection.query(`SELECT * FROM appointments WHERE id = ? AND lawyer_id = ? AND status = 'pending'`, [appointmentId, req.user.id]);
    if (rows.length === 0) {
      throw new Error('Appointment not found, unauthorized, or already processed');
    }

    const appointment = rows[0];
    const confDate = confirmed_date ? new Date(confirmed_date) : appointment.requested_date;

    await connection.query(
      `UPDATE appointments SET status = 'accepted', confirmed_date = ? WHERE id = ?`,
      [confDate, appointmentId]
    );

    const [lawyerRow] = await connection.query(`SELECT username FROM users WHERE id = ?`, [req.user.id]);
    const lawyerUsername = lawyerRow.length > 0 ? lawyerRow[0].username : 'المحامي';

    // Notify client
    await createNotification(
      connection, 
      appointment.client_id, 
      'appointment_accepted', 
      'Appointment Accepted', 
      `Your appointment with ${lawyerUsername} has been accepted`, 
      appointmentId
    );

    // Auto-create conversation
    const conversationId = await createConversationIfNotExists(connection, appointment.client_id, req.user.id, appointmentId);

    await connection.commit();
    res.json({ success: true, message: 'Appointment accepted', conversationId });
  } catch (error) {
    await connection.rollback();
    console.error(error);
    res.status(error.message.includes('not found') ? 404 : 500).json({ success: false, message: error.message || 'Internal server error' });
  } finally {
    connection.release();
  }
});

// Reject appointment (Lawyer only)
router.put('/:id/reject', verifyToken, requireRole(['lawyer']), async (req, res) => {
  const appointmentId = req.params.id;
  const { reason } = req.body;
  
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [rows] = await connection.query(`SELECT * FROM appointments WHERE id = ? AND lawyer_id = ? AND status = 'pending'`, [appointmentId, req.user.id]);
    if (rows.length === 0) {
      throw new Error('Appointment not found, unauthorized, or already processed');
    }

    const appointment = rows[0];

    await connection.query(
      `UPDATE appointments SET status = 'rejected', notes = CONCAT(COALESCE(notes, ''), '\nRejection Reason: ', ?) WHERE id = ?`,
      [reason || 'Not specified', appointmentId]
    );

    // Notify client
    const [lawyerRow] = await connection.query(`SELECT username FROM users WHERE id = ?`, [req.user.id]);
    const lawyerUsername = lawyerRow.length > 0 ? lawyerRow[0].username : 'المحامي';
    await createNotification(
      connection, 
      appointment.client_id, 
      'appointment_rejected', 
      'Appointment Rejected', 
      `Your appointment with ${lawyerUsername} was rejected.`, 
      appointmentId
    );

    await connection.commit();
    res.json({ success: true, message: 'Appointment rejected' });
  } catch (error) {
    await connection.rollback();
    console.error(error);
    res.status(error.message.includes('not found') ? 404 : 500).json({ success: false, message: error.message || 'Internal server error' });
  } finally {
    connection.release();
  }
});

// Cancel appointment (Client only)
router.put('/:id/cancel', verifyToken, requireRole(['client']), async (req, res) => {
  const appointmentId = req.params.id;
  
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [rows] = await connection.query(`SELECT * FROM appointments WHERE id = ? AND client_id = ? AND status IN ('pending', 'accepted')`, [appointmentId, req.user.id]);
    if (rows.length === 0) {
      throw new Error('Appointment not found or cannot be cancelled');
    }

    const appointment = rows[0];

    await connection.query(
      `UPDATE appointments SET status = 'cancelled' WHERE id = ?`,
      [appointmentId]
    );

    const [clientRow] = await connection.query(`SELECT username FROM users WHERE id = ?`, [req.user.id]);
    const clientUsername = clientRow.length > 0 ? clientRow[0].username : 'مستخدم';

    // Notify lawyer
    await createNotification(
      connection, 
      appointment.lawyer_id, 
      'appointment_cancelled', 
      'Appointment Cancelled', 
      `Your appointment with ${clientUsername} was cancelled.`, 
      appointmentId
    );

    await connection.commit();
    res.json({ success: true, message: 'Appointment cancelled' });
  } catch (error) {
    await connection.rollback();
    console.error(error);
    res.status(error.message.includes('not found') ? 404 : 500).json({ success: false, message: error.message || 'Internal server error' });
  } finally {
    connection.release();
  }
});

// Complete appointment (Lawyer only)
router.put('/:id/complete', verifyToken, requireRole(['lawyer']), async (req, res) => {
  const appointmentId = req.params.id;
  
  try {
    const [result] = await pool.query(
      `UPDATE appointments SET status = 'completed' WHERE id = ? AND lawyer_id = ?`,
      [appointmentId, req.user.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Appointment not found or unauthorized' });
    }

    res.json({ success: true, message: 'Appointment marked as completed' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

export default router;
