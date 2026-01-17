const express = require('express');
const router = express.Router();
const { protect, authorizeRoles } = require('../middleware/authMiddleware');
const {
  register,
  login,
  getMe,
  updateProfile,
  updateUserRole,
  getAllUsers
} = require('../controllers/authController');

// Public routes
router.post('/register', register);
router.post('/login', login);

// Protected routes
router.get('/me', protect, getMe);
router.put('/users/:id', protect, updateProfile);

// Admin only routes
router.put('/users/:id/role', protect, authorizeRoles('admin'), updateUserRole);
router.get('/admin/users', protect, authorizeRoles('admin', 'project_manager'), getAllUsers);

module.exports = router;