const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  getChatMessages,
  sendMessage
} = require('../controllers/chatController');

// Chat routes
router.get('/projects/:projectId/chat/messages', protect, getChatMessages);
router.post('/projects/:projectId/chat/messages', protect, sendMessage);

module.exports = router;