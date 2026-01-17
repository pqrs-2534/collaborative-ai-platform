const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  content: {
    type: String,
    required: [true, 'Message content is required'],
    trim: true,
    maxlength: [5000, 'Message cannot exceed 5000 characters']
  },
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['text', 'file', 'image', 'system'],
    default: 'text'
  },
  attachments: [{
    filename: String,
    url: String,
    type: String
  }],
  timestamp: {
    type: Date,
    default: Date.now
  }
});

// Index for better query performance
MessageSchema.index({ projectId: 1, timestamp: -1 });

module.exports = mongoose.model('Message', MessageSchema);