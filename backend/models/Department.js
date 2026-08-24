const mongoose = require('mongoose');

const departmentSchema = new mongoose.Schema({
  name:         { type: String, required: true, trim: true },
  code:         { type: String, required: true, uppercase: true },
  description:  { type: String },
  organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
  manager:      { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  parentDept:   { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
  budget:       { type: Number },
  headcount:    { type: Number, default: 0 },
  isActive:     { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('Department', departmentSchema);
