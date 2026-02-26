import { useEffect, useState, useCallback } from 'react';
import io from 'socket.io-client';

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';

let socket = null;

export const useChat = (userId) => {
  const [messages, setMessages] = useState([]);
  const [connected, setConnected] = useState(false);
  const [typing, setTyping] = useState({});

  useEffect(() => {
    if (!userId) return;

    // Initialize socket
    socket = io(SOCKET_URL, {
      transports: ['websocket'],
      reconnection: true,
    });

    socket.on('connect', () => {
      setConnected(true);
      const token = { userId }; // In production, use actual JWT
      socket.emit('authenticate', token);
    });

    socket.on('authenticated', () => {
      console.log('Socket authenticated');
    });

    socket.on('disconnect', () => {
      setConnected(false);
    });

    socket.on('new_message', (message) => {
      setMessages((prev) => [message, ...prev]);
      
      // Show notification
      if (Notification.permission === 'granted' && document.hidden) {
        new Notification('Nouveau message', {
          body: message.message.substring(0, 50),
        });
      }
    });

    socket.on('user_typing', ({ userId, isTyping }) => {
      setTyping((prev) => ({
        ...prev,
        [userId]: isTyping,
      }));
    });

    socket.on('messages_history', (history) => {
      setMessages(history);
    });

    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [userId]);

  const sendMessage = useCallback((recipientId, message, siteId = null) => {
    if (socket && connected) {
      socket.emit('send_message', {
        recipientId,
        message,
        siteId,
      });
    }
  }, [connected]);

  const markAsRead = useCallback((messageId) => {
    if (socket && connected) {
      socket.emit('mark_read', messageId);
    }
  }, [connected]);

  const getMessages = useCallback((recipientId = null, siteId = null, limit = 50) => {
    if (socket && connected) {
      socket.emit('get_messages', { recipientId, siteId, limit });
    }
  }, [connected]);

  const notifyTyping = useCallback((recipientId) => {
    if (socket && connected) {
      socket.emit('typing', { recipientId });
    }
  }, [connected]);

  const notifyStopTyping = useCallback((recipientId) => {
    if (socket && connected) {
      socket.emit('stop_typing', { recipientId });
    }
  }, [connected]);

  return {
    messages,
    connected,
    typing,
    sendMessage,
    markAsRead,
    getMessages,
    notifyTyping,
    notifyStopTyping,
  };
};
