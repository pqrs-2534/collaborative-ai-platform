const Project = require('../models/Project');
const Task = require('../models/Task');
const User = require('../models/User');
const Message = require('../models/Message');

// @desc    Get project progress metrics
// @route   GET /api/analytics/projects/:projectId/progress
// @access  Private
const getProjectProgress = async (req, res) => {
  try {
    const { projectId } = req.params;

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const isMember = project.members.some(
      m => m.user.toString() === req.user._id.toString()
    );

    if (!isMember) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Get task statistics
    const tasks = await Task.find({ projectId });
    
    const tasksByStatus = {
      todo: tasks.filter(t => t.status === 'todo').length,
      in_progress: tasks.filter(t => t.status === 'in_progress').length,
      review: tasks.filter(t => t.status === 'review').length,
      done: tasks.filter(t => t.status === 'done').length
    };

    const tasksByPriority = {
      low: tasks.filter(t => t.priority === 'low').length,
      medium: tasks.filter(t => t.priority === 'medium').length,
      high: tasks.filter(t => t.priority === 'high').length,
      urgent: tasks.filter(t => t.priority === 'urgent').length
    };

    // Calculate completion rate
    const totalTasks = tasks.length;
    const completedTasks = tasksByStatus.done;
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    // Get overdue tasks
    const now = new Date();
    const overdueTasks = tasks.filter(t => 
      t.dueDate && new Date(t.dueDate) < now && t.status !== 'done'
    ).length;

    // Task assignment stats
    const assignedTasks = tasks.filter(t => t.assignedTo).length;
    const unassignedTasks = totalTasks - assignedTasks;

    res.json({
      projectId,
      projectName: project.name,
      tasksByStatus,
      tasksByPriority,
      totalTasks,
      completedTasks,
      completionRate,
      overdueTasks,
      assignedTasks,
      unassignedTasks,
      activeMembers: project.members.length
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get team activity metrics
// @route   GET /api/analytics/team/:teamId/activity
// @access  Private (Admin/PM)
const getTeamActivity = async (req, res) => {
  try {
    const { teamId } = req.params;

    // For now, teamId is projectId (can be extended for actual teams)
    const project = await Project.findById(teamId)
      .populate('members.user', 'name email');

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Check if user is admin or project manager
    const userMember = project.members.find(
      m => m.user._id.toString() === req.user._id.toString()
    );

    if (!userMember || (userMember.role !== 'owner' && userMember.role !== 'admin')) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Get activity data for each member
    const memberStats = await Promise.all(
      project.members.map(async (member) => {
        const userId = member.user._id;

        // Count tasks created by user
        const tasksCreated = await Task.countDocuments({
          projectId: teamId,
          createdBy: userId
        });

        // Count tasks assigned to user
        const tasksAssigned = await Task.countDocuments({
          projectId: teamId,
          assignedTo: userId
        });

        // Count completed tasks
        const tasksCompleted = await Task.countDocuments({
          projectId: teamId,
          assignedTo: userId,
          status: 'done'
        });

        // Count messages sent
        const messagesSent = await Message.countDocuments({
          projectId: teamId,
          user: userId
        });

        return {
          user: {
            _id: member.user._id,
            name: member.user.name,
            email: member.user.email
          },
          role: member.role,
          joinedAt: member.joinedAt,
          stats: {
            tasksCreated,
            tasksAssigned,
            tasksCompleted,
            messagesSent,
            completionRate: tasksAssigned > 0 
              ? Math.round((tasksCompleted / tasksAssigned) * 100) 
              : 0
          }
        };
      })
    );

    res.json({
      projectId: teamId,
      projectName: project.name,
      totalMembers: project.members.length,
      memberStats
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get AI-generated insights for project
// @route   GET /api/analytics/ai-insights/:projectId
// @access  Private
const getAIInsights = async (req, res) => {
  try {
    const { projectId } = req.params;

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const isMember = project.members.some(
      m => m.user.toString() === req.user._id.toString()
    );

    if (!isMember) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Get project data
    const tasks = await Task.find({ projectId });
    const messages = await Message.find({ projectId });

    // Generate insights
    const insights = [];

    // Insight 1: Task completion trend
    const completedTasks = tasks.filter(t => t.status === 'done').length;
    const totalTasks = tasks.length;
    const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

    if (completionRate > 75) {
      insights.push({
        type: 'success',
        title: 'Excellent Progress',
        description: `Your team has completed ${completionRate.toFixed(0)}% of tasks. Keep up the great work!`
      });
    } else if (completionRate < 25) {
      insights.push({
        type: 'warning',
        title: 'Low Completion Rate',
        description: `Only ${completionRate.toFixed(0)}% of tasks are completed. Consider reviewing priorities and blockers.`
      });
    }

    // Insight 2: Overdue tasks
    const now = new Date();
    const overdueTasks = tasks.filter(t => 
      t.dueDate && new Date(t.dueDate) < now && t.status !== 'done'
    );

    if (overdueTasks.length > 0) {
      insights.push({
        type: 'alert',
        title: 'Overdue Tasks',
        description: `${overdueTasks.length} task(s) are overdue. Review and update deadlines or reassign if needed.`
      });
    }

    // Insight 3: Unassigned tasks
    const unassignedTasks = tasks.filter(t => !t.assignedTo);
    
    if (unassignedTasks.length > 5) {
      insights.push({
        type: 'info',
        title: 'Unassigned Tasks',
        description: `${unassignedTasks.length} tasks are unassigned. Assign them to team members to improve accountability.`
      });
    }

    // Insight 4: Team collaboration
    const recentMessages = messages.filter(m => {
      const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      return new Date(m.timestamp) > dayAgo;
    });

    if (recentMessages.length > 50) {
      insights.push({
        type: 'success',
        title: 'High Collaboration',
        description: `${recentMessages.length} messages in the last 24 hours. Your team is actively collaborating!`
      });
    } else if (recentMessages.length < 5 && messages.length > 10) {
      insights.push({
        type: 'info',
        title: 'Low Recent Activity',
        description: 'Team communication has slowed down. Consider scheduling a sync meeting.'
      });
    }

    // Insight 5: Task priority distribution
    const highPriorityTasks = tasks.filter(t => 
      (t.priority === 'high' || t.priority === 'urgent') && t.status !== 'done'
    );

    if (highPriorityTasks.length > totalTasks * 0.5) {
      insights.push({
        type: 'warning',
        title: 'Too Many High Priority Tasks',
        description: 'Over 50% of tasks are high priority. Consider reprioritizing to maintain focus.'
      });
    }

    res.json({
      projectId,
      generatedAt: new Date(),
      insights,
      summary: {
        totalTasks,
        completedTasks,
        completionRate: completionRate.toFixed(1),
        overdueCount: overdueTasks.length,
        recentActivity: recentMessages.length
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getProjectProgress,
  getTeamActivity,
  getAIInsights
};