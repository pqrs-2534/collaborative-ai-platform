const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  createProject,
  getAllProjects,
  getProjectById,
  updateProject,
  deleteProject,
  addMember,
  removeMember
} = require('../controllers/projectController');

// Project CRUD
router.post('/', protect, createProject);
router.get('/', protect, getAllProjects);
router.get('/:id', protect, getProjectById);
router.put('/:id', protect, updateProject);
router.delete('/:id', protect, deleteProject);

// Project members
router.post('/:id/members', protect, addMember);
router.delete('/:id/members/:memberId', protect, removeMember);

module.exports = router;