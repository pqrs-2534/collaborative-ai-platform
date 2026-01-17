const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  generateIdeas,
  saveIdea,
  getProjectIdeas,
  updateIdea,
  deleteIdea
} = require('../controllers/aiController');

// AI idea generation
router.post('/ai/generate-ideas', protect, generateIdeas);

// Ideas CRUD
router.post('/ideas', protect, saveIdea);
router.get('/projects/:projectId/ideas', protect, getProjectIdeas);
router.put('/ideas/:id', protect, updateIdea);
router.delete('/ideas/:id', protect, deleteIdea);

module.exports = router;