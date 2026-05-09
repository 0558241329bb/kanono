import express from 'express';
import pool from '../config/db.js';
import { verifyToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

const ALLOWED_WILAYAS = ['الجزائر', 'الجلفة'];

// Get all approved lawyers (public or clients)
router.get('/', async (req, res) => {
  try {
    const { city, search } = req.query;
    let query = `
      SELECT u.id, u.username, u.email, u.phone, u.city, u.profile_picture, u.bio,
             lp.specialty, lp.bar_number, lp.years_experience, lp.rating
      FROM users u
      JOIN lawyer_profiles lp ON u.id = lp.user_id
      WHERE u.role = 'lawyer' AND u.approved = 1
    `;
    const params = [];

    if (city) {
      if (!ALLOWED_WILAYAS.includes(city)) {
        return res.status(400).json({ success: false, message: 'ولاية غير مدعومة' });
      }
      query += ` AND u.city = ?`;
      params.push(city);
    }
    if (search) {
      query += ` AND u.username LIKE ?`;
      params.push(`%${search}%`);
    }

    const [lawyers] = await pool.query(query, params);
    res.json({ success: true, lawyers });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Admin: Get pending lawyers
router.get('/pending', verifyToken, requireRole(['admin']), async (req, res) => {
  try {
    const [lawyers] = await pool.query(`
      SELECT u.id, u.username, u.email, u.phone, u.city, u.profile_picture, u.bio, u.created_at,
             lp.specialty, lp.bar_number, lp.years_experience, lp.certificate_path
      FROM users u
      JOIN lawyer_profiles lp ON u.id = lp.user_id
      WHERE u.role = 'lawyer' AND u.approved = 0
    `);
    res.json({ success: true, lawyers });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Admin: Approve a lawyer
router.put('/:id/approve', verifyToken, requireRole(['admin']), async (req, res) => {
  try {
    const lawyerId = parseInt(req.params.id);
    console.log(`Approving lawyer with ID: ${lawyerId}`);
    
    const [result] = await pool.query(
      'UPDATE users SET approved = 1 WHERE id = ?',
      [lawyerId]
    );

    console.log('Approve result:', result);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Lawyer not found or already approved', debug: result });
    }

    res.json({ success: true, message: 'Lawyer approved successfully', debug: result });
  } catch (error) {
    console.error('Error approving lawyer:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Admin: Reject a lawyer
router.delete('/:id/reject', verifyToken, requireRole(['admin']), async (req, res) => {
  try {
    const lawyerId = parseInt(req.params.id);
    console.log(`Rejecting lawyer with ID: ${lawyerId}`);

    const [result] = await pool.query(
      'DELETE FROM users WHERE id = ?',
      [lawyerId]
    );

    console.log('Reject result:', result);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Pending lawyer not found', debug: result });
    }

    res.json({ success: true, message: 'Lawyer rejected and deleted', debug: result });
  } catch (error) {
    console.error('Error rejecting lawyer:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Get single lawyer profile
router.get('/:id', async (req, res) => {
  try {
    // Avoid conflicting with basic routes (id must be number, but express handles it)
    if (isNaN(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid ID' });

    const [users] = await pool.query(`
      SELECT u.id, u.username, u.email, u.phone, u.city, u.profile_picture, u.bio, u.created_at,
             lp.specialty, lp.bar_number, lp.years_experience, lp.rating, lp.certificate_path,
             (SELECT COUNT(*) FROM appointments WHERE lawyer_id = u.id AND status = 'completed') as completed_appointments
      FROM users u
      JOIN lawyer_profiles lp ON u.id = lp.user_id
      WHERE u.id = ? AND u.role = 'lawyer' AND u.approved = 1
    `, [req.params.id]);

    if (users.length === 0) {
      return res.status(404).json({ success: false, message: 'Lawyer not found' });
    }

    res.json({ success: true, lawyer: users[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Get lawyer's future appointments (busy slots)
router.get('/:id/appointments', verifyToken, async (req, res) => {
  try {
    const [appointments] = await pool.query(`
      SELECT id, requested_date, confirmed_date, status, type
      FROM appointments 
      WHERE lawyer_id = ? AND status IN ('pending', 'accepted') AND requested_date > CURRENT_TIMESTAMP
      ORDER BY requested_date ASC
    `, [req.params.id]);

    res.json({ success: true, appointments });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Rate a lawyer
router.post('/:id/rate', verifyToken, requireRole(['client']), async (req, res) => {
  const lawyerId = req.params.id;
  const clientId = req.user.id;
  const { rating, comment } = req.body;

  if (!rating || rating < 1 || rating > 5) {
    return res.status(400).json({ success: false, message: 'Rating must be between 1 and 5' });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    await connection.query(`
      INSERT INTO reviews (client_id, lawyer_id, rating, comment)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(client_id, lawyer_id) DO UPDATE SET 
        rating = excluded.rating, 
        comment = excluded.comment
    `, [clientId, lawyerId, rating, comment || null]);

    const [rows] = await connection.query(`
      SELECT AVG(rating) as avgRating FROM reviews WHERE lawyer_id = ?
    `, [lawyerId]);
    
    const newRating = Number(rows[0].avgRating || 0).toFixed(2);

    await connection.query(`
      UPDATE lawyer_profiles SET rating = ? WHERE user_id = ?
    `, [newRating, lawyerId]);

    await connection.commit();
    res.json({ success: true, message: 'Rating submitted successfully', newRating });
  } catch (error) {
    await connection.rollback();
    console.error(error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  } finally {
    connection.release();
  }
});

export default router;
