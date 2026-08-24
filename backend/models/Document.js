const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
  name:         { type: String, required: true },
  originalName: { type: String },
  type:         { type: String, enum: ['pdf', 'docx', 'pptx', 'xlsx', 'csv', 'image', 'email', 'url', 'text'] },
  size:         { type: Number },
  mimeType:     { type: String },
  filePath:     { type: String },
  url:          { type: String },  // for URL documents

  organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: false },
  uploadedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  department:   { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },

  // Processing status
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending',
  },
  processingError: { type: String },
  processingStarted: { type: Date },
  processingCompleted: { type: Date },

  // Extracted content
  extractedText: { type: String },
  pageCount:     { type: Number },
  wordCount:     { type: Number },
  language:      { type: String },

  // RAG
  chunkCount:      { type: Number, default: 0 },
  embeddingModel:  { type: String },
  vectorIds:       [{ type: String }],
  collectionName:  { type: String },

  // Metadata
  tags:        [{ type: String }],
  category:    { type: String },
  description: { type: String },

  // Knowledge graph
  entities:    [{ text: String, type: String, confidence: Number }],
  keywords:    [{ text: String, score: Number }],

  isActive: { type: Boolean, default: true },
}, { timestamps: true });

documentSchema.index({ organization: 1, status: 1 });
documentSchema.index({ organization: 1, type: 1 });
documentSchema.index({ tags: 1 });

module.exports = mongoose.model('Document', documentSchema);
