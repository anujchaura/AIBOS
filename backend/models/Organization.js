const mongoose = require('mongoose');

const organizationSchema = new mongoose.Schema({
  name:        { type: String, required: true, trim: true },
  slug:        { type: String, required: true, unique: true, lowercase: true },
  description: { type: String },
  logo:        { type: String },
  industry:    { type: String },
  size:        { type: String, enum: ['startup', 'small', 'medium', 'enterprise'] },
  website:     { type: String },
  address: {
    street: String, city: String, state: String, country: String, zip: String,
  },
  settings: {
    allowedDomains:   [String],
    maxUsers:         { type: Number, default: 100 },
    features:         { type: Object, default: {} },
    llmProvider:      { type: String, default: 'openai' },
    dataRetentionDays:{ type: Number, default: 365 },
  },
  owner:       { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  isActive:    { type: Boolean, default: true },
  plan:        { type: String, enum: ['free', 'pro', 'enterprise'], default: 'free' },
}, { timestamps: true });

module.exports = mongoose.model('Organization', organizationSchema);
