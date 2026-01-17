const Message = require('../models/Message');
const Project = require('../models/Project');

// @desc    Get chat messages for a project
// @route   GET /api/projects/:projectId/chat/messages
// @access  Private
const getChatMessages = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { limit = 100, before } = req.query;

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

    const query = { projectId };
    
    // Pagination support
    if (before) {
      query.timestamp = { $lt: new Date(before) };
    }

    const messages = await Message.find(query)
      .populate('user', 'name email avatar')
      .sort({ timestamp: -1 })
      .limit(parseInt(limit));

    // Reverse to show oldest first
    messages.reverse();

    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create/send a chat message
// @route   POST /api/projects/:projectId/chat/messages
// @access  Private
const sendMessage = async (req, res) => {
  try {
    const { content, type, attachments } = req.body;
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

    const message = await Message.create({
      content,
      projectId,
      user: req.user._id,
      type: type || 'text',
      attachments: attachments || []
    });

    const populatedMessage = await Message.findById(message._id)
      .populate('user', 'name email avatar');

    res.status(201).json(populatedMessage);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getChatMessages,
  sendMessage
};