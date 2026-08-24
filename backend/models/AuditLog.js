const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  user:         { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
  action:       { type: String, required: true },   // e.g. 'user.login', 'document.upload'
  resource:     { type: String },                   // e.g. 'User', 'Document'
  resourceId:   { type: String },
  details:      { type: Object },                   // Any extra metadata
  ipAddress:    { type: String },
  userAgent:    { type: String },
  status:       { type: String, enum: ['success', 'failure', 'warning'], default: 'success' },
  severity:     { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'low' },
}, { timestamps: true });

auditLogSchema.index({ organization: 1, createdAt: -1 });
auditLogSchema.index({ user: 1, createdAt: -1 });
auditLogSchema.index({ action: 1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
