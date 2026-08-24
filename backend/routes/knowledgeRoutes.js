const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');
const Document = require('../models/Document');
const authenticate = require('../middleware/authenticate');
const { requireRole } = require('../middleware/rbac');
const { audit } = require('../middleware/audit');

const fs = require('fs');

const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Multer config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (!fs.existsSync(UPLOAD_DIR)) {
      fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    }
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  // Accept all common documents, data files, images, code, and text
  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: (parseInt(process.env.MAX_FILE_SIZE_MB) || 50) * 1024 * 1024 },
});


// GET /api/knowledge — list documents
router.get('/', authenticate, async (req, res) => {
  const { page = 1, limit = 20, type, status, search } = req.query;
  const targetOrgId = req.orgId || req.user?.organization;
  const query = targetOrgId ? { organization: targetOrgId, isActive: true } : { uploadedBy: req.userId, isActive: true };

  if (type) query.type = type;
  if (status) query.status = status;
  if (search) query.$or = [
    { name: { $regex: search, $options: 'i' } },
    { tags: { $regex: search, $options: 'i' } },
  ];

  const total = await Document.countDocuments(query);
  const docs = await Document.find(query)
    .populate('uploadedBy', 'firstName lastName email')
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(parseInt(limit));

  res.json({ success: true, data: { documents: docs, total, page: parseInt(page), pages: Math.ceil(total / limit) } });
});

// POST /api/knowledge/upload — upload document
router.post('/upload', authenticate, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });

  const mimeToType = {
    'application/pdf': 'pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
    'text/csv': 'csv',
    'image/jpeg': 'image', 'image/png': 'image', 'image/webp': 'image',
    'message/rfc822': 'email',
    'text/plain': 'text',
  };

  const targetOrgId = req.orgId || req.user?.organization || null;
  const absoluteFilePath = path.resolve(req.file.path);

  const doc = await Document.create({
    name: req.file.originalname,
    originalName: req.file.originalname,
    type: mimeToType[req.file.mimetype] || 'text',
    size: req.file.size,
    mimeType: req.file.mimetype,
    filePath: absoluteFilePath,
    organization: targetOrgId,
    uploadedBy: req.userId,
    department: req.body.departmentId,
    tags: req.body.tags ? req.body.tags.split(',').map((t) => t.trim()) : [],
    category: req.body.category,
    status: 'completed', // Immediately available for query
  });

  await audit({ user: req.user, organization: targetOrgId, action: 'document.upload', resource: 'Document', resourceId: doc._id, req }).catch(() => {});

  // Async processing via AI service
  try {
    const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8001';
    axios.post(`${aiServiceUrl}/rag/process`, {
      documentId: doc._id.toString(),
      filePath: absoluteFilePath,
      fileType: mimeToType[req.file.mimetype] || 'text',
      orgId: (targetOrgId || 'default').toString(),
      metadata: { name: doc.name, tags: doc.tags, category: doc.category },
    }, { headers: { 'X-API-Key': process.env.AI_SERVICE_API_KEY } }).catch((e) => console.error('AI processing error:', e.message));
  } catch (e) { /* non-blocking */ }

  res.status(201).json({ success: true, message: 'Document uploaded successfully', data: { document: doc } });

});

// POST /api/knowledge/url — add URL document
router.post('/url', authenticate, async (req, res) => {
  const { url, name, tags, category } = req.body;
  if (!url) return res.status(400).json({ success: false, message: 'URL required' });

  const targetOrgId = req.orgId || req.user?.organization || null;

  const doc = await Document.create({
    name: name || url,
    type: 'url',
    url,
    organization: targetOrgId,
    uploadedBy: req.userId,
    tags: tags ? tags.split(',').map((t) => t.trim()) : [],
    category,
    status: 'completed',
  });


  // Async processing
  try {
    const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8001';
    axios.post(`${aiServiceUrl}/rag/process-url`, {
      documentId: doc._id.toString(), url, orgId: (targetOrgId || 'default').toString(),
    }, { headers: { 'X-API-Key': process.env.AI_SERVICE_API_KEY } }).catch(() => {});
  } catch (e) { /* non-blocking */ }

  res.status(201).json({ success: true, data: { document: doc } });
});

// GET /api/knowledge/:id
router.get('/:id', authenticate, async (req, res) => {
  const doc = await Document.findById(req.params.id)
    .populate('uploadedBy', 'firstName lastName');
  if (!doc) return res.status(404).json({ success: false, message: 'Document not found' });
  res.json({ success: true, data: { document: doc } });
});

// DELETE /api/knowledge/:id
router.delete('/:id', authenticate, async (req, res) => {
  const targetOrgId = req.orgId || req.user?.organization;
  const deleteFilter = targetOrgId
    ? { _id: req.params.id, $or: [{ organization: targetOrgId }, { uploadedBy: req.userId }] }
    : { _id: req.params.id, uploadedBy: req.userId };

  // Support deletion for the owner or org member
  const doc = await Document.findOneAndUpdate(
    deleteFilter,
    { isActive: false },
    { new: true }
  );

  if (!doc) {
    // Fallback: try finding by ID directly for user
    const directDoc = await Document.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    if (!directDoc) return res.status(404).json({ success: false, message: 'Document not found' });
  }

  // Remove from vector store
  try {
    const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8001';
    axios.delete(`${aiServiceUrl}/rag/document/${req.params.id}`, {
      headers: { 'X-API-Key': process.env.AI_SERVICE_API_KEY },
    }).catch(() => {});
  } catch (e) { /* non-blocking */ }

  await audit({ user: req.user, organization: targetOrgId, action: 'document.delete', resource: 'Document', resourceId: req.params.id, req, severity: 'medium' }).catch(() => {});
  res.json({ success: true, message: 'Document deleted successfully' });
});

// GET /api/knowledge/:id/status — poll processing status
router.get('/:id/status', authenticate, async (req, res) => {
  const doc = await Document.findOne({ _id: req.params.id, organization: req.orgId }, 'status chunkCount processingError processingCompleted');
  if (!doc) return res.status(404).json({ success: false, message: 'Document not found' });
  res.json({ success: true, data: doc });
});

module.exports = router;
