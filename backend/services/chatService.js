import pool, { encrypt, decrypt } from '../config/database.js';

export const setupChat = (io) => {
  // Store connected users
  const connectedUsers = new Map();

  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Authenticate socket connection
    socket.on('authenticate', async (token) => {
      try {
        // Verify JWT token (simplified - in production use proper JWT verification)
        const userId = token.userId; // Extract from JWT
        
        connectedUsers.set(socket.id, userId);
        socket.userId = userId;

        // Join user to their own room
        socket.join(`user:${userId}`);

        // Get user's sites
        const [shifts] = await pool.execute(
          'SELECT DISTINCT site_id FROM shifts WHERE user_id = ?',
          [userId]
        );

        // Join site rooms
        shifts.forEach(shift => {
          socket.join(`site:${shift.site_id}`);
        });

        socket.emit('authenticated', { userId });
      } catch (error) {
        socket.emit('auth_error', { message: 'Authentication failed' });
      }
    });

    // Send message to specific user
    socket.on('send_message', async (data) => {
      try {
        const { recipientId, message, siteId } = data;

        // Save to database
        const [result] = await pool.execute(`
          INSERT INTO chat_messages (sender_id, recipient_id, site_id, message_encrypted)
          VALUES (?, ?, ?, ?)
        `, [socket.userId, recipientId || null, siteId || null, encrypt(message)]);

        const messageData = {
          id: result.insertId,
          senderId: socket.userId,
          recipientId,
          siteId,
          message,
          sentAt: new Date(),
          isRead: false
        };

        // Send to recipient
        if (recipientId) {
          io.to(`user:${recipientId}`).emit('new_message', messageData);
        }

        // Send to site room if applicable
        if (siteId) {
          io.to(`site:${siteId}`).emit('new_message', messageData);
        }

        // Confirm to sender
        socket.emit('message_sent', messageData);
      } catch (error) {
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Mark message as read
    socket.on('mark_read', async (messageId) => {
      try {
        await pool.execute(
          'UPDATE chat_messages SET is_read = true WHERE id = ? AND recipient_id = ?',
          [messageId, socket.userId]
        );

        socket.emit('message_read', { messageId });
      } catch (error) {
        console.error('Mark read error:', error);
      }
    });

    // Get conversation history
    socket.on('get_messages', async (data) => {
      try {
        const { recipientId, siteId, limit = 50 } = data;

        let query = `
          SELECT id, sender_id, recipient_id, site_id, message_encrypted, is_read, sent_at
          FROM chat_messages
          WHERE 
        `;
        const params = [];

        if (recipientId) {
          query += '((sender_id = ? AND recipient_id = ?) OR (sender_id = ? AND recipient_id = ?))';
          params.push(socket.userId, recipientId, recipientId, socket.userId);
        } else if (siteId) {
          query += 'site_id = ?';
          params.push(siteId);
        }

        query += ' ORDER BY sent_at DESC LIMIT ?';
        params.push(limit);

        const [messages] = await pool.execute(query, params);

        const decryptedMessages = messages.map(m => ({
          ...m,
          message: decrypt(m.message_encrypted)
        }));

        socket.emit('messages_history', decryptedMessages);
      } catch (error) {
        socket.emit('error', { message: 'Failed to fetch messages' });
      }
    });

    // User typing indicator
    socket.on('typing', (data) => {
      const { recipientId } = data;
      if (recipientId) {
        io.to(`user:${recipientId}`).emit('user_typing', {
          userId: socket.userId,
          isTyping: true
        });
      }
    });

    socket.on('stop_typing', (data) => {
      const { recipientId } = data;
      if (recipientId) {
        io.to(`user:${recipientId}`).emit('user_typing', {
          userId: socket.userId,
          isTyping: false
        });
      }
    });

    // Disconnect
    socket.on('disconnect', () => {
      connectedUsers.delete(socket.id);
      console.log('User disconnected:', socket.id);
    });
  });
};
