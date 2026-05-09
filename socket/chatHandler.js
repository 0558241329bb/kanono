import jwt from 'jsonwebtoken';
import pool from '../config/db.js';

export default function setupChatHandler(io) {

  // Auth middleware for Socket.io
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (!token) return next(new Error('Authentication error'));
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_super_secret_key');
      socket.user = decoded;
      next();
    } catch (err) {
      next(new Error('Authentication error'));
    }
  });

  // Track online users: Map<userId, socketId>
  const onlineUsers = new Map();

  io.on('connection', (socket) => {
    const userId = socket.user.id;
    
    // Register user as online
    onlineUsers.set(userId, socket.id);
    
    // Broadcast online status to all
    io.emit('user_online', { userId });
    
    // Send current online users list to connected user
    socket.emit('online_users', Array.from(onlineUsers.keys()));

    // Join conversation room
    socket.on('join_conversation', (conversationId) => {
      socket.join(`conversation_${conversationId}`);
    });

    // Leave conversation room
    socket.on('leave_conversation', (conversationId) => {
      socket.leave(`conversation_${conversationId}`);
    });

    // Send message
    socket.on('send_message', async (data) => {
      const { conversation_id, content } = data;
      
      try {
        // Verify user is part of conversation
        const [conv] = await pool.query(
          'SELECT * FROM conversations WHERE id = ? AND (client_id = ? OR lawyer_id = ?)',
          [conversation_id, userId, userId]
        );
        
        if (!conv.length) {
          socket.emit('error', { message: 'Unauthorized' });
          return;
        }

        // Save message to DB
        const [result] = await pool.query(
          'INSERT INTO messages (conversation_id, sender_id, content) VALUES (?, ?, ?)',
          [conversation_id, userId, content]
        );

        const messageId = result.insertId;

        // Get full message with sender info
        const [messages] = await pool.query(
          `SELECT m.*, u.username, u.profile_picture 
           FROM messages m 
           JOIN users u ON m.sender_id = u.id 
           WHERE m.id = ?`,
          [messageId]
        );

        const newMessage = messages[0];

        // Emit to everyone in the conversation room
        io.to(`conversation_${conversation_id}`).emit('new_message', newMessage);

        // Determine receiver
        const receiverId = conv[0].client_id === userId 
          ? conv[0].lawyer_id 
          : conv[0].client_id;

        // If receiver is online but not in room → send notification
        const receiverSocketId = onlineUsers.get(receiverId);
        if (receiverSocketId) {
          io.to(receiverSocketId).emit('message_notification', {
            conversation_id,
            message: newMessage
          });
        }

        // Save notification in DB
        await pool.query(
          'INSERT INTO notifications (user_id, type, title, body, ref_id) VALUES (?, ?, ?, ?, ?)',
          [receiverId, 'message', 'رسالة جديدة', `${newMessage.username}: ${content.substring(0, 50)}`, conversation_id]
        );

      } catch (err) {
        console.error('send_message error:', err);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Typing indicator
    socket.on('typing_start', ({ conversation_id }) => {
      socket.to(`conversation_${conversation_id}`).emit('user_typing', {
        userId,
        conversation_id
      });
    });

    socket.on('typing_stop', ({ conversation_id }) => {
      socket.to(`conversation_${conversation_id}`).emit('user_stopped_typing', {
        userId,
        conversation_id
      });
    });

    // Mark messages as read
    socket.on('mark_read', async ({ conversation_id }) => {
      await pool.query(
        'UPDATE messages SET is_read = 1 WHERE conversation_id = ? AND sender_id != ? AND is_read = 0',
        [conversation_id, userId]
      );
      socket.to(`conversation_${conversation_id}`).emit('messages_read', {
        conversation_id,
        read_by: userId
      });
    });

    // Disconnect
    socket.on('disconnect', () => {
      onlineUsers.delete(userId);
      io.emit('user_offline', { userId });
    });
  });
}
