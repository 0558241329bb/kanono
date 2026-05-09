import express from 'express';
import pool from '../config/db.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

// Get user conversations
router.get('/conversations', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get all conversations for the user
    const [conversations] = await pool.query(
      `SELECT c.id, c.client_id, c.lawyer_id, c.appointment_id, c.created_at,
              CASE WHEN c.client_id = ? THEN l.username ELSE cl.username END as other_user_name,
              CASE WHEN c.client_id = ? THEN l.profile_picture ELSE cl.profile_picture END as other_user_pic,
              CASE WHEN c.client_id = ? THEN l.role ELSE cl.role END as other_user_role,
              CASE WHEN c.client_id = ? THEN l.id ELSE cl.id END as other_user_id
       FROM conversations c 
       JOIN users cl ON c.client_id = cl.id 
       JOIN users l ON c.lawyer_id = l.id
       WHERE c.client_id = ? OR c.lawyer_id = ?`,
      [userId, userId, userId, userId, userId, userId]
    );

    // Get last message and unread count for each conversation
    const conversationsWithDetails = await Promise.all(conversations.map(async (conv) => {
      const [lastMsg] = await pool.query(
        'SELECT content, created_at FROM messages WHERE conversation_id = ? ORDER BY created_at DESC LIMIT 1',
        [conv.id]
      );

      const [unreadCount] = await pool.query(
        'SELECT COUNT(*) as count FROM messages WHERE conversation_id = ? AND sender_id != ? AND is_read = 0',
        [conv.id, userId]
      );

      return {
        ...conv,
        last_message: lastMsg.length > 0 ? lastMsg[0] : null,
        unread_count: unreadCount[0].count
      };
    }));

    // Sort by last message time
    conversationsWithDetails.sort((a, b) => {
      const timeA = a.last_message ? new Date(a.last_message.created_at).getTime() : new Date(a.created_at).getTime();
      const timeB = b.last_message ? new Date(b.last_message.created_at).getTime() : new Date(b.created_at).getTime();
      return timeB - timeA;
    });

    res.json({ success: true, conversations: conversationsWithDetails });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// GET messages for a conversation
router.get('/conversations/:conversationId', verifyToken, async (req, res) => {
  const { conversationId } = req.params;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 30;
  const offset = (page - 1) * limit;
  const userId = req.user.id;
  
  try {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Verify participation
      const [conv] = await connection.query(
        `SELECT c.id, c.client_id, c.lawyer_id,
              CASE WHEN c.client_id = ? THEN l.username ELSE cl.username END as other_user_name,
              CASE WHEN c.client_id = ? THEN l.profile_picture ELSE cl.profile_picture END as other_user_pic,
              CASE WHEN c.client_id = ? THEN l.role ELSE cl.role END as other_user_role,
              CASE WHEN c.client_id = ? THEN l.id ELSE cl.id END as other_user_id
         FROM conversations c 
         JOIN users cl ON c.client_id = cl.id 
         JOIN users l ON c.lawyer_id = l.id
         WHERE c.id = ? AND (c.client_id = ? OR c.lawyer_id = ?)`,
        [userId, userId, userId, userId, conversationId, userId, userId]
      );

      if (conv.length === 0) {
        throw new Error('Unauthorized');
      }

      // Mark unread messages as read
      await connection.query(
        'UPDATE messages SET is_read = 1 WHERE conversation_id = ? AND sender_id != ? AND is_read = 0',
        [conversationId, userId]
      );

      // Get count
      const [countResult] = await connection.query(
        'SELECT COUNT(*) as total FROM messages WHERE conversation_id = ?',
        [conversationId]
      );
      const total = countResult[0].total;

      // Get messages
      const [messages] = await connection.query(
        `SELECT m.*, u.username, u.profile_picture 
         FROM messages m 
         JOIN users u ON m.sender_id = u.id 
         WHERE m.conversation_id = ? 
         ORDER BY m.created_at DESC 
         LIMIT ? OFFSET ?`,
        [conversationId, limit, offset]
      );

      await connection.commit();

      res.json({
        success: true,
        conversation: conv[0],
        messages,
        total,
        hasMore: offset + limit < total
      });
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error(error);
    res.status(error.message === 'Unauthorized' ? 403 : 500).json({ success: false, message: error.message || 'Internal server error' });
  }
});

// Create new conversation
router.post('/conversations', verifyToken, async (req, res) => {
  const { other_user_id } = req.body;
  const userId = req.user.id;
  const userRole = req.user.role;

  if (!other_user_id) {
    return res.status(400).json({ success: false, message: 'other_user_id is required' });
  }

  try {
    const [otherUser] = await pool.query('SELECT role FROM users WHERE id = ?', [other_user_id]);
    if (otherUser.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // A conversation is strictly between a client and a lawyer
    const clientId = userRole === 'client' ? userId : other_user_id;
    const lawyerId = userRole === 'lawyer' ? userId : other_user_id;

    // See if exists
    const [existing] = await pool.query(
      'SELECT id FROM conversations WHERE client_id = ? AND lawyer_id = ?',
      [clientId, lawyerId]
    );

    if (existing.length > 0) {
      return res.json({ success: true, conversation_id: existing[0].id });
    }

    let query = 'INSERT INTO conversations (client_id, lawyer_id) VALUES (?, ?) ON CONFLICT DO NOTHING';
    if (!process.env.DATABASE_URL || !process.env.DATABASE_URL.includes('postgres')) {
      query = 'INSERT OR IGNORE INTO conversations (client_id, lawyer_id) VALUES (?, ?)';
    }

    const [result] = await pool.query(query, [clientId, lawyerId]);

    res.status(201).json({ success: true, conversation_id: result.insertId });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Delete conversation (participant only): removes messages then conversation row
router.delete('/conversations/:conversationId', verifyToken, async (req, res) => {
  const conversationId = parseInt(req.params.conversationId, 10);
  const userId = req.user.id;
  if (Number.isNaN(conversationId)) {
    return res.status(400).json({ success: false, message: 'Invalid conversation id' });
  }

  try {
    const [conv] = await pool.query(
      'SELECT id, client_id, lawyer_id FROM conversations WHERE id = ? AND (client_id = ? OR lawyer_id = ?)',
      [conversationId, userId, userId]
    );
    if (conv.length === 0) {
      return res.status(403).json({ success: false, message: 'غير مصرح بحذف هذه المحادثة' });
    }

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      await connection.query('DELETE FROM messages WHERE conversation_id = ?', [conversationId]);
      await connection.query('DELETE FROM conversations WHERE id = ?', [conversationId]);
      await connection.commit();
    } catch (e) {
      await connection.rollback();
      throw e;
    } finally {
      connection.release();
    }

    const io = req.app.get('io');
    if (io) {
      io.emit('conversation_deleted', { conversation_id: conversationId });
    }

    res.json({ success: true, message: 'تم حذف المحادثة' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

export default router;
