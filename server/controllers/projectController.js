const Project = require('../models/Project');
const User = require('../models/User');

// @desc    Create new project
// @route   POST /api/projects
// @access  Private
const createProject = async (req, res) => {
  try {
    const { name, description } = req.body;

    const project = await Project.create({
      name,
      description,
      createdBy: req.user._id,
      members: [{
        user: req.user._id,
        role: 'owner'
      }]
    });

    // Add project to user's projects array
    await User.findByIdAndUpdate(req.user._id, {
      $push: { projects: project._id }
    });

    const populatedProject = await Project.findById(project._id)
      .populate('createdBy', 'name email')
      .populate('members.user', 'name email');

    res.status(201).json(populatedProject);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all projects for user
// @route   GET /api/projects
// @access  Private
const getAllProjects = async (req, res) => {
  try {
    const projects = await Project.find({
      'members.user': req.user._id
    })
      .populate('createdBy', 'name email')
      .populate('members.user', 'name email')
      .sort({ createdAt: -1 });

    res.json(projects);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get single project
// @route   GET /api/projects/:id
// @access  Private
const getProjectById = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('createdBy', 'name email')
      .populate('members.user', 'name email')
      .populate({
        path: 'tasks',
        populate: { path: 'assignedTo', select: 'name email' }
      });

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Check if user is a member
    const isMember = project.members.some(
      member => member.user._id.toString() === req.user._id.toString()
    );

    if (!isMember) {
      return res.status(403).json({ message: 'Not authorized to access this project' });
    }

    res.json(project);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update project
// @route   PUT /api/projects/:id
// @access  Private
const updateProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Check if user is owner or admin
    const member = project.members.find(
      m => m.user.toString() === req.user._id.toString()
    );

    if (!member || (member.role !== 'owner' && member.role !== 'admin')) {
      return res.status(403).json({ message: 'Not authorized to update this project' });
    }

    const { name, description, status } = req.body;

    project.name = name || project.name;
    project.description = description || project.description;
    project.status = status || project.status;

    const updatedProject = await project.save();

    const populatedProject = await Project.findById(updatedProject._id)
      .populate('createdBy', 'name email')
      .populate('members.user', 'name email');

    res.json(populatedProject);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete project
// @route   DELETE /api/projects/:id
// @access  Private
const deleteProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Only owner can delete
    if (project.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only project owner can delete' });
    }

    await project.deleteOne();

    // Remove project from all members' projects array
    await User.updateMany(
      { projects: project._id },
      { $pull: { projects: project._id } }
    );

    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Add member to project
// @route   POST /api/projects/:id/members
// @access  Private
const addMember = async (req, res) => {
  try {
    const { userId, role } = req.body;
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Check if requester is owner or admin
    const requesterMember = project.members.find(
      m => m.user.toString() === req.user._id.toString()
    );

    if (!requesterMember || (requesterMember.role !== 'owner' && requesterMember.role !== 'admin')) {
      return res.status(403).json({ message: 'Not authorized to add members' });
    }

    // Check if user already a member
    const alreadyMember = project.members.some(
      m => m.user.toString() === userId
    );

    if (alreadyMember) {
      return res.status(400).json({ message: 'User is already a member' });
    }

    // Add member
    project.members.push({
      user: userId,
      role: role || 'member'
    });

    await project.save();

    // Add project to user's projects
    await User.findByIdAndUpdate(userId, {
      $push: { projects: project._id }
    });

    const updatedProject = await Project.findById(project._id)
      .populate('members.user', 'name email');

    res.json(updatedProject);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Remove member from project
// @route   DELETE /api/projects/:id/members/:memberId
// @access  Private
const removeMember = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Check if requester is owner or admin
    const requesterMember = project.members.find(
      m => m.user.toString() === req.user._id.toString()
    );

    if (!requesterMember || (requesterMember.role !== 'owner' && requesterMember.role !== 'admin')) {
      return res.status(403).json({ message: 'Not authorized to remove members' });
    }

    // Cannot remove owner
    const memberToRemove = project.members.find(
      m => m.user.toString() === req.params.memberId
    );

    if (memberToRemove && memberToRemove.role === 'owner') {
      return res.status(400).json({ message: 'Cannot remove project owner' });
    }

    // Remove member
    project.members = project.members.filter(
      m => m.user.toString() !== req.params.memberId
    );

    await project.save();

    // Remove project from user's projects
    await User.findByIdAndUpdate(req.params.memberId, {
      $pull: { projects: project._id }
    });

    res.json({ message: 'Member removed successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createProject,
  getAllProjects,
  getProjectById,
  updateProject,
  deleteProject,
  addMember,
  removeMember
};