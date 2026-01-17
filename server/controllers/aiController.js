const Idea = require('../models/Idea');
const Project = require('../models/Project');
const aiService = require('../services/aiService');

// @desc    Generate ideas using AI
// @route   POST /api/ai/generate-ideas
// @access  Private
const generateIdeas = async (req, res) => {
  try {
    const { prompt, projectId } = req.body;

    if (!prompt) {
      return res.status(400).json({ message: 'Prompt is required' });
    }

    // Check if project exists and user is a member
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

    // Call AI service
    const aiResult = await aiService.generateText(prompt);

    // Save the generated idea
    const idea = await Idea.create({
      text: aiResult.generated_text,
      prompt: prompt,
      projectId: projectId,
      createdBy: req.user._id
    });

    // Add idea to project
    project.ideas.push(idea._id);
    await project.save();

    const populatedIdea = await Idea.findById(idea._id)
      .populate('createdBy', 'name email');

    res.status(201).json(populatedIdea);
  } catch (error) {
    console.error('AI generation error:', error);
    res.status(500).json({ message: error.message || 'Failed to generate ideas' });
  }
};

// @desc    Save/bookmark an idea
// @route   POST /api/ideas
// @access  Private
const saveIdea = async (req, res) => {
  try {
    const { text, projectId, category, tags } = req.body;

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

    const idea = await Idea.create({
      text,
      prompt: '', // Manual idea, no prompt
      projectId,
      createdBy: req.user._id,
      category,
      tags,
      saved: true
    });

    project.ideas.push(idea._id);
    await project.save();

    const populatedIdea = await Idea.findById(idea._id)
      .populate('createdBy', 'name email');

    res.status(201).json(populatedIdea);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get ideas for a project
// @route   GET /api/projects/:projectId/ideas
// @access  Private
const getProjectIdeas = async (req, res) => {
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

    const ideas = await Idea.find({ projectId })
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    res.json(ideas);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update an idea
// @route   PUT /api/ideas/:id
// @access  Private
const updateIdea = async (req, res) => {
  try {
    const idea = await Idea.findById(req.params.id);

    if (!idea) {
      return res.status(404).json({ message: 'Idea not found' });
    }

    // Check if user is creator or project member
    const project = await Project.findById(idea.projectId);
    const isMember = project.members.some(
      m => m.user.toString() === req.user._id.toString()
    );

    if (!isMember) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const { text, category, tags, saved } = req.body;

    idea.text = text || idea.text;
    idea.category = category !== undefined ? category : idea.category;
    idea.tags = tags || idea.tags;
    idea.saved = saved !== undefined ? saved : idea.saved;

    const updatedIdea = await idea.save();

    const populatedIdea = await Idea.findById(updatedIdea._id)
      .populate('createdBy', 'name email');

    res.json(populatedIdea);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete an idea
// @route   DELETE /api/ideas/:id
// @access  Private
const deleteIdea = async (req, res) => {
  try {
    const idea = await Idea.findById(req.params.id);

    if (!idea) {
      return res.status(404).json({ message: 'Idea not found' });
    }

    // Only creator can delete
    if (idea.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this idea' });
    }

    await idea.deleteOne();

    // Remove from project
    await Project.findByIdAndUpdate(idea.projectId, {
      $pull: { ideas: idea._id }
    });

    res.json({ message: 'Idea deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  generateIdeas,
  saveIdea,
  getProjectIdeas,
  updateIdea,
  deleteIdea
};