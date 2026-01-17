const Task = require('../models/Task');
const Project = require('../models/Project');
const Comment = require('../models/Comment');

// @desc    Create new task
// @route   POST /api/projects/:projectId/tasks
// @access  Private
const createTask = async (req, res) => {
  try {
    const { title, description, status, priority, assignedTo, dueDate, tags } = req.body;
    const { projectId } = req.params;

    // Check if project exists and user is a member
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const isMember = project.members.some(
      m => m.user.toString() === req.user._id.toString()
    );

    if (!isMember) {
      return res.status(403).json({ message: 'Not authorized to create tasks in this project' });
    }

    const task = await Task.create({
      title,
      description,
      projectId,
      status: status || 'todo',
      priority: priority || 'medium',
      assignedTo,
      dueDate,
      tags,
      createdBy: req.user._id
    });

    // Add task to project
    project.tasks.push(task._id);
    
    // Update task stats
    project.taskStats.total += 1;
    if (status === 'done') {
      project.taskStats.completed += 1;
    } else if (status === 'in_progress') {
      project.taskStats.inProgress += 1;
    } else {
      project.taskStats.todo += 1;
    }

    await project.save();

    const populatedTask = await Task.findById(task._id)
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name email');

    res.status(201).json(populatedTask);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all tasks for a project
// @route   GET /api/projects/:projectId/tasks
// @access  Private
const getProjectTasks = async (req, res) => {
  try {
    const { projectId } = req.params;

    // Check if user is a member
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const isMember = project.members.some(
      m => m.user.toString() === req.user._id.toString()
    );

    if (!isMember) {
      return res.status(403).json({ message: 'Not authorized to view tasks' });
    }

    const tasks = await Task.find({ projectId })
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name email')
      .sort({ position: 1, createdAt: -1 });

    res.json(tasks);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get single task
// @route   GET /api/tasks/:id
// @access  Private
const getTaskById = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name email')
      .populate({
        path: 'comments',
        populate: { path: 'user', select: 'name email' }
      });

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Check if user is a member of the project
    const project = await Project.findById(task.projectId);
    const isMember = project.members.some(
      m => m.user.toString() === req.user._id.toString()
    );

    if (!isMember) {
      return res.status(403).json({ message: 'Not authorized to view this task' });
    }

    res.json(task);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update task
// @route   PUT /api/tasks/:id
// @access  Private
const updateTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Check if user is a member of the project
    const project = await Project.findById(task.projectId);
    const isMember = project.members.some(
      m => m.user.toString() === req.user._id.toString()
    );

    if (!isMember) {
      return res.status(403).json({ message: 'Not authorized to update this task' });
    }

    const oldStatus = task.status;
    const { title, description, status, priority, assignedTo, dueDate, tags, position } = req.body;

    // Update task fields
    task.title = title || task.title;
    task.description = description !== undefined ? description : task.description;
    task.status = status || task.status;
    task.priority = priority || task.priority;
    task.assignedTo = assignedTo !== undefined ? assignedTo : task.assignedTo;
    task.dueDate = dueDate !== undefined ? dueDate : task.dueDate;
    task.tags = tags || task.tags;
    task.position = position !== undefined ? position : task.position;

    const updatedTask = await task.save();

    // Update project task stats if status changed
    if (status && status !== oldStatus) {
      // Decrease old status count
      if (oldStatus === 'done') project.taskStats.completed -= 1;
      else if (oldStatus === 'in_progress') project.taskStats.inProgress -= 1;
      else project.taskStats.todo -= 1;

      // Increase new status count
      if (status === 'done') project.taskStats.completed += 1;
      else if (status === 'in_progress') project.taskStats.inProgress += 1;
      else project.taskStats.todo += 1;

      await project.save();
    }

    const populatedTask = await Task.findById(updatedTask._id)
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name email');

    res.json(populatedTask);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete task
// @route   DELETE /api/tasks/:id
// @access  Private
const deleteTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Check if user is creator or project owner
    const project = await Project.findById(task.projectId);
    const isCreator = task.createdBy.toString() === req.user._id.toString();
    const isOwner = project.createdBy.toString() === req.user._id.toString();

    if (!isCreator && !isOwner) {
      return res.status(403).json({ message: 'Not authorized to delete this task' });
    }

    await task.deleteOne();

    // Remove task from project and update stats
    project.tasks = project.tasks.filter(t => t.toString() !== task._id.toString());
    project.taskStats.total -= 1;
    
    if (task.status === 'done') project.taskStats.completed -= 1;
    else if (task.status === 'in_progress') project.taskStats.inProgress -= 1;
    else project.taskStats.todo -= 1;

    await project.save();

    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Add comment to task
// @route   POST /api/tasks/:taskId/comments
// @access  Private
const addComment = async (req, res) => {
  try {
    const { content } = req.body;
    const { taskId } = req.params;

    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Check if user is a member
    const project = await Project.findById(task.projectId);
    const isMember = project.members.some(
      m => m.user.toString() === req.user._id.toString()
    );

    if (!isMember) {
      return res.status(403).json({ message: 'Not authorized to comment' });
    }

    const comment = await Comment.create({
      content,
      taskId,
      user: req.user._id
    });

    task.comments.push(comment._id);
    await task.save();

    const populatedComment = await Comment.findById(comment._id)
      .populate('user', 'name email');

    res.status(201).json(populatedComment);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get task comments
// @route   GET /api/tasks/:taskId/comments
// @access  Private
const getTaskComments = async (req, res) => {
  try {
    const { taskId } = req.params;

    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    const comments = await Comment.find({ taskId })
      .populate('user', 'name email')
      .sort({ createdAt: 1 });

    res.json(comments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createTask,
  getProjectTasks,
  getTaskById,
  updateTask,
  deleteTask,
  addComment,
  getTaskComments
};