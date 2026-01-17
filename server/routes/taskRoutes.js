const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  createTask,
  getProjectTasks,
  getTaskById,
  updateTask,
  deleteTask,
  addComment,
  getTaskComments
} = require('../controllers/taskController');

// Task CRUD
router.post('/projects/:projectId/tasks', protect, createTask);
router.get('/projects/:projectId/tasks', protect, getProjectTasks);
router.get('/tasks/:id', protect, getTaskById);
router.put('/tasks/:id', protect, updateTask);
router.delete('/tasks/:id', protect, deleteTask);

// Task comments
router.post('/tasks/:taskId/comments', protect, addComment);
router.get('/tasks/:taskId/comments', protect, getTaskComments);

module.exports = router;