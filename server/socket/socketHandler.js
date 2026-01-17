const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Message = require('../models/Message');

// Store active users per room
const activeUsers = {};

const socketHandler = (io) => {
  // Socket.IO authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;

      if (!token) {
        return next(new Error('Authentication error'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('-password');

      if (!user) {
        return next(new Error('User not found'));
      }

      socket.user = user;
      next();
    } catch (error) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`✅ User connected: ${socket.user.name} (${socket.id})`);

    // Join Room
    socket.on('joinRoom', (roomId, callback) => {
      socket.join(roomId);
      console.log(`📍 ${socket.user.name} joined room: ${roomId}`);

      // Track active users
      if (!activeUsers[roomId]) {
        activeUsers[roomId] = [];
      }

      const userExists = activeUsers[roomId].find(u => u.userId === socket.user._id.toString());
      if (!userExists) {
        activeUsers[roomId].push({
          userId: socket.user._id.toString(),
          userName: socket.user.name,
          socketId: socket.id
        });
      }

      // Notify room about active users
      io.to(roomId).emit('activeUsers', activeUsers[roomId]);

      // Notify others that user joined
      socket.to(roomId).emit('userJoined', {
        userId: socket.user._id,
        userName: socket.user.name
      });

      if (callback) {
        callback({ status: 'joined', roomId });
      }
    });

    // Leave Room
    socket.on('leaveRoom', (roomId) => {
      socket.leave(roomId);
      console.log(`📤 ${socket.user.name} left room: ${roomId}`);

      // Remove from active users
      if (activeUsers[roomId]) {
        activeUsers[roomId] = activeUsers[roomId].filter(
          u => u.socketId !== socket.id
        );

        // Notify room about updated active users
        io.to(roomId).emit('activeUsers', activeUsers[roomId]);

        // Notify others that user left
        socket.to(roomId).emit('userLeft', {
          userId: socket.user._id,
          userName: socket.user.name
        });
      }
    });

    // WHITEBOARD EVENTS
    socket.on('drawing', (data) => {
      socket.to(data.roomId).broadcast.emit('drawing', data);
    });

    socket.on('addShape', (data) => {
      socket.to(data.roomId).broadcast.emit('addShape', data);
    });

    socket.on('addText', (data) => {
      socket.to(data.roomId).broadcast.emit('addText', data);
    });

    socket.on('addStickyNote', (data) => {
      socket.to(data.roomId).broadcast.emit('addStickyNote', data);
    });

    socket.on('updateObject', (data) => {
      socket.to(data.roomId).broadcast.emit('updateObject', data);
    });

    socket.on('deleteObject', (data) => {
      socket.to(data.roomId).broadcast.emit('deleteObject', data);
    });

    socket.on('clearCanvas', (roomId) => {
      socket.to(roomId).broadcast.emit('clearCanvas');
    });

    // CHAT EVENTS
    socket.on('sendMessage', async (data) => {
      try {
        // Save message to database
        const message = await Message.create({
          content: data.content,
          projectId: data.projectId,
          user: socket.user._id,
          type: data.type || 'text'
        });

        const populatedMessage = await Message.findById(message._id)
          .populate('user', 'name email avatar');

        // Broadcast to room
        io.to(data.roomId).emit('receiveMessage', populatedMessage);
      } catch (error) {
        console.error('Error sending message:', error);
        socket.emit('messageError', { message: 'Failed to send message' });
      }
    });

    socket.on('typing', (roomId) => {
      socket.to(roomId).broadcast.emit('typing', {
        userId: socket.user._id,
        userName: socket.user.name
      });
    });

    socket.on('stopTyping', (roomId) => {
      socket.to(roomId).broadcast.emit('stopTyping', {
        userId: socket.user._id,
        userName: socket.user.name
      });
    });

    // TASK EVENTS
    socket.on('taskCreated', (data) => {
      io.to(`project-${data.projectId}`).emit('taskCreated', data.task);
    });

    socket.on('taskUpdated', (data) => {
      io.to(`project-${data.projectId}`).emit('taskUpdated', data.task);
    });

    socket.on('taskDeleted', (data) => {
      io.to(`project-${data.projectId}`).emit('taskDeleted', data.taskId);
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log(`❌ User disconnected: ${socket.user.name} (${socket.id})`);

      // Remove from all active user lists
      Object.keys(activeUsers).forEach(roomId => {
        if (activeUsers[roomId]) {
          const userIndex = activeUsers[roomId].findIndex(u => u.socketId === socket.id);
          
          if (userIndex !== -1) {
            activeUsers[roomId].splice(userIndex, 1);
            
            // Notify room about updated active users
            io.to(roomId).emit('activeUsers', activeUsers[roomId]);
            
            // Notify others that user left
            socket.to(roomId).emit('userLeft', {
              userId: socket.user._id,
              userName: socket.user.name
            });
          }
        }
      });
    });
  });
};

module.exports = socketHandler;