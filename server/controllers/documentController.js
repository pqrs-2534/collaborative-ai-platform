const Document = require('../models/Document');
const Project = require('../models/Project');

// @desc    Create new document
// @route   POST /api/projects/:projectId/documents
// @access  Private
const createDocument = async (req, res) => {
  try {
    const { title, currentContent } = req.body;
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

    const document = await Document.create({
      projectId,
      title,
      currentContent: currentContent || '',
      createdBy: req.user._id,
      updatedBy: req.user._id
    });

    project.documents.push(document._id);
    await project.save();

    const populatedDocument = await Document.findById(document._id)
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email');

    res.status(201).json(populatedDocument);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all documents for a project
// @route   GET /api/projects/:projectId/documents
// @access  Private
const getProjectDocuments = async (req, res) => {
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

    const documents = await Document.find({ projectId })
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email')
      .select('-versions') // Exclude versions for list view
      .sort({ updatedAt: -1 });

    res.json(documents);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get single document
// @route   GET /api/documents/:id
// @access  Private
const getDocumentById = async (req, res) => {
  try {
    const document = await Document.findById(req.params.id)
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email')
      .populate('versions.editedBy', 'name email');

    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    const project = await Project.findById(document.projectId);
    const isMember = project.members.some(
      m => m.user.toString() === req.user._id.toString()
    );

    if (!isMember) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    res.json(document);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update document content (creates new version)
// @route   PUT /api/documents/:id
// @access  Private
const updateDocument = async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);

    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    const project = await Project.findById(document.projectId);
    const isMember = project.members.some(
      m => m.user.toString() === req.user._id.toString()
    );

    if (!isMember) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const { title, currentContent } = req.body;

    document.title = title || document.title;
    
    if (currentContent !== undefined) {
      document.currentContent = currentContent;
      document.updatedBy = req.user._id;
    }

    const updatedDocument = await document.save();

    const populatedDocument = await Document.findById(updatedDocument._id)
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email')
      .populate('versions.editedBy', 'name email');

    res.json(populatedDocument);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get document version history
// @route   GET /api/documents/:id/versions
// @access  Private
const getVersionHistory = async (req, res) => {
  try {
    const document = await Document.findById(req.params.id)
      .populate('versions.editedBy', 'name email')
      .select('title versions');

    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    const project = await Project.findById(document.projectId);
    const isMember = project.members.some(
      m => m.user.toString() === req.user._id.toString()
    );

    if (!isMember) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    res.json(document.versions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Restore a previous version
// @route   POST /api/documents/:id/versions/:versionId/restore
// @access  Private
const restoreVersion = async (req, res) => {
  try {
    const { id, versionId } = req.params;

    const document = await Document.findById(id);

    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    const project = await Project.findById(document.projectId);
    const isMember = project.members.some(
      m => m.user.toString() === req.user._id.toString()
    );

    if (!isMember) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const version = document.versions.id(versionId);

    if (!version) {
      return res.status(404).json({ message: 'Version not found' });
    }

    document.currentContent = version.content;
    document.updatedBy = req.user._id;

    const updatedDocument = await document.save();

    const populatedDocument = await Document.findById(updatedDocument._id)
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email');

    res.json(populatedDocument);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete document
// @route   DELETE /api/documents/:id
// @access  Private
const deleteDocument = async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);

    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    // Only creator or project owner can delete
    const project = await Project.findById(document.projectId);
    const isCreator = document.createdBy.toString() === req.user._id.toString();
    const isOwner = project.createdBy.toString() === req.user._id.toString();

    if (!isCreator && !isOwner) {
      return res.status(403).json({ message: 'Not authorized to delete this document' });
    }

    await document.deleteOne();

    project.documents = project.documents.filter(d => d.toString() !== document._id.toString());
    await project.save();

    res.json({ message: 'Document deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createDocument,
  getProjectDocuments,
  getDocumentById,
  updateDocument,
  getVersionHistory,
  restoreVersion,
  deleteDocument
};