const { Server } = require('socket.io');
const admin = require('../config/firebase');
const User = require('../models/User');

let io;

function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
      credentials: true,
    },
  });

  // Authenticate every socket connection using the Firebase ID token.
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('Missing auth token'));
      const decoded = await admin.auth().verifyIdToken(token);
      const dbUser = await User.findOne({ firebaseUid: decoded.uid });
      if (!dbUser) return next(new Error('User not found'));
      socket.dbUser = dbUser;
      next();
    } catch (err) {
      next(new Error('Authentication failed'));
    }
  });

  io.on('connection', (socket) => {
    const { role, _id } = socket.dbUser;

    // Agents & admins join a shared room to be notified of new/unassigned tickets.
    if (role === 'agent' || role === 'admin') {
      socket.join('agents');
    }
    // Every user gets a personal room for direct notifications.
    socket.join(`user:${_id}`);

    // Client explicitly joins a ticket room to receive live updates for it.
    socket.on('ticket:join', (ticketId) => {
      socket.join(`ticket:${ticketId}`);
    });
    socket.on('ticket:leave', (ticketId) => {
      socket.leave(`ticket:${ticketId}`);
    });

    // Typing indicator (bonus real-time feature)
    socket.on('ticket:typing', ({ ticketId, isTyping }) => {
      socket.to(`ticket:${ticketId}`).emit('ticket:typing', {
        userId: _id,
        role,
        isTyping,
      });
    });

    socket.on('disconnect', () => {});
  });

  return io;
}

function getIO() {
  if (!io) throw new Error('Socket.IO not initialized yet');
  return io;
}

module.exports = { initSocket, getIO };
