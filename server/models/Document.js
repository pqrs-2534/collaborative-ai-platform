const mongoose = require('mongoose');

const DocumentSchema = new mongoose.Schema({
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true
  },
  title: {
    type: String,
    required: [true, 'Document title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  currentContent: {
    type: String,
    default: ''
  },
  versions: [{
    content: {
      type: String,
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    editedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Pre-save hook to add new version on content update
DocumentSchema.pre('save', function(next) {
  if (this.isModified('currentContent') && this.currentContent !== undefined) {
    this.versions.push({
      content: this.currentContent,
      editedBy: this.updatedBy || this.createdBy
    });
    this.updatedAt = Date.now();
  }
  next();
});

module.exports = mongoose.model('Document', DocumentSchema);