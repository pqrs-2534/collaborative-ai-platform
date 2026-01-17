const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');

// Verify controller exists
const documentController = require('../controllers/documentController');

// Log to verify functions exist
console.log('Document controller functions:', Object.keys(documentController));

// Extract functions with fallback
const createDocument = documentController.createDocument;
const getProjectDocuments = documentController.getProjectDocuments;
const getDocumentById = documentController.getDocumentById;
const updateDocument = documentController.updateDocument;
const getVersionHistory = documentController.getVersionHistory;
const restoreVersion = documentController.restoreVersion;
const deleteDocument = documentController.deleteDocument;

// Document CRUD - each on separate line for clarity
router.post(
  '/projects/:projectId/documents', 
  protect, 
  createDocument
);

router.get(
  '/projects/:projectId/documents', 
  protect, 
  getProjectDocuments
);

router.get(
  '/documents/:id', 
  protect, 
  getDocumentById
);

router.put(
  '/documents/:id', 
  protect, 
  updateDocument
);

router.delete(
  '/documents/:id', 
  protect, 
  deleteDocument
);

// Version control
router.get(
  '/documents/:id/versions', 
  protect, 
  getVersionHistory
);

router.post(
  '/documents/:id/versions/:versionId/restore', 
  protect, 
  restoreVersion
);

module.exports = router;