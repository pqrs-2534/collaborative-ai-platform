const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const { errorHandler, notFound } = require('./middleware/errorMiddleware');
const socketHandler = require('./socket/socketHandler');

// Load environment variables
dotenv.config();

// Connect to database
connectDB();

// Initialize express app
const app = express();
const server = http.createServer(app);

// Initialize Socket.IO
const io = socketIO(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
  }
});

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware (development)
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
  });
}

// Health check route
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// Import routes with error handling
let authRoutes, projectRoutes, taskRoutes, aiRoutes, documentRoutes, chatRoutes, analyticsRoutes;

try {
  authRoutes = require('./routes/authRoutes');
  console.log('✅ Auth routes loaded');
} catch (error) {
  console.error('❌ Error loading authRoutes:', error.message);
}

try {
  projectRoutes = require('./routes/projectRoutes');
  console.log('✅ Project routes loaded');
} catch (error) {
  console.error('❌ Error loading projectRoutes:', error.message);
}

try {
  taskRoutes = require('./routes/taskRoutes');
  console.log('✅ Task routes loaded');
} catch (error) {
  console.error('❌ Error loading taskRoutes:', error.message);
}

try {
  aiRoutes = require('./routes/aiRoutes');
  console.log('✅ AI routes loaded');
} catch (error) {
  console.error('❌ Error loading aiRoutes:', error.message);
}

try {
  documentRoutes = require('./routes/documentRoutes');
  console.log('✅ Document routes loaded');
} catch (error) {
  console.error('❌ Error loading documentRoutes:', error.message);
}

try {
  chatRoutes = require('./routes/chatRoutes');
  console.log('✅ Chat routes loaded');
} catch (error) {
  console.error('❌ Error loading chatRoutes:', error.message);
}

try {
  analyticsRoutes = require('./routes/analyticsRoutes');
  console.log('✅ Analytics routes loaded');
} catch (error) {
  console.error('❌ Error loading analyticsRoutes:', error.message);
}

// Mount routes
if (authRoutes) {
  app.use('/api/auth', authRoutes);
  app.use('/api', authRoutes); // For /api/users/:id routes
}

if (projectRoutes) {
  app.use('/api/projects', projectRoutes);
}

if (taskRoutes) {
  app.use('/api', taskRoutes); // For /api/projects/:projectId/tasks and /api/tasks/:id
}

if (aiRoutes) {
  app.use('/api', aiRoutes); // For /api/ai/generate-ideas and /api/ideas
}

if (documentRoutes) {
  app.use('/api', documentRoutes); // For document routes
}

if (chatRoutes) {
  app.use('/api', chatRoutes); // For chat routes
}

if (analyticsRoutes) {
  app.use('/api', analyticsRoutes); // For analytics routes
}

// Initialize Socket.IO handlers
socketHandler(io);

// Error handling middleware (must be after routes)
app.use(notFound);
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log('');
  console.log('🚀 ================================');
  console.log(`🚀 Server running in ${process.env.NODE_ENV || 'development'} mode`);
  console.log(`🚀 Server URL: http://localhost:${PORT}`);
  console.log(`🚀 API URL: http://localhost:${PORT}/api`);
  console.log(`🚀 Socket.IO: Connected`);
  console.log('🚀 ================================');
  console.log('');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error(`❌ Unhandled Rejection: ${err.message}`);
  server.close(() => process.exit(1));
});