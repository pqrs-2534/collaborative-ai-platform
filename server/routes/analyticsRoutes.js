const express = require('express');
const router = express.Router();
const { protect, authorizeRoles } = require('../middleware/authMiddleware');
const {
  getProjectProgress,
  getTeamActivity,
  getAIInsights
} = require('../controllers/analyticsController');

// Analytics routes
router.get('/analytics/projects/:projectId/progress', protect, getProjectProgress);
router.get('/analytics/team/:teamId/activity', protect, authorizeRoles('admin', 'project_manager'), getTeamActivity);
router.get('/analytics/ai-insights/:projectId', protect, getAIInsights);

module.exports = router;