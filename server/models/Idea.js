const mongoose = require('mongoose');

const IdeaSchema = new mongoose.Schema({
  text: {
    type: String,
    required: [true, 'Idea text is required'],
    trim: true
  },
  prompt: {
    type: String,
    required: true,
    trim: true
  },
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  category: {
    type: String,
    trim: true,
    default: null
  },
  saved: {
    type: Boolean,
    default: false
  },
  tags: [{
    type: String,
    trim: true
  }],
  votes: {
    up: { type: Number, default: 0 },
    down: { type: Number, default: 0 }
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index for better query performance
IdeaSchema.index({ projectId: 1, createdAt: -1 });

module.exports = mongoose.model('Idea', IdeaSchema);