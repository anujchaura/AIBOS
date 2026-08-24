const mongoose = require('mongoose');

const workflowSchema = new mongoose.Schema({
  name:        { type: String, required: true },
  description: { type: String },
  organization:{ type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: false },
  createdBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },


  // Trigger
  trigger: {
    type: { type: String, enum: ['document_upload', 'schedule', 'manual', 'api', 'event'], required: true },
    config: { type: Object, default: {} },  // e.g. { fileType: 'pdf', keyword: 'invoice' }
  },

  // Steps (DSL)
  steps: [{
    id:       { type: String, required: true },
    name:     { type: String, required: true },
    type:     { type: String, required: true }, // extract_data, verify, store, notify, summarize, ai_action
    config:   { type: Object, default: {} },
    nextStep: { type: String },  // step id
    onError:  { type: String },  // step id or 'stop'
    order:    { type: Number },
  }],

  // Status
  isActive:  { type: Boolean, default: true },
  runCount:  { type: Number, default: 0 },
  lastRunAt: { type: Date },
  lastRunStatus: { type: String, enum: ['success', 'failed', 'running'] },
}, { timestamps: true });

// Execution log
const workflowRunSchema = new mongoose.Schema({
  workflow:     { type: mongoose.Schema.Types.ObjectId, ref: 'Workflow', required: true },
  organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
  triggeredBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  triggerType:  { type: String },
  triggerData:  { type: Object },

  status:   { type: String, enum: ['running', 'success', 'failed', 'cancelled'], default: 'running' },
  startedAt: { type: Date, default: Date.now },
  completedAt: { type: Date },
  durationMs:  { type: Number },

  stepResults: [{
    stepId:     String,
    stepName:   String,
    status:     { type: String, enum: ['pending', 'running', 'success', 'failed', 'skipped'] },
    startedAt:  Date,
    completedAt: Date,
    output:     Object,
    error:      String,
  }],

  output: { type: Object },
  error:  { type: String },
}, { timestamps: true });

const Workflow = mongoose.model('Workflow', workflowSchema);
const WorkflowRun = mongoose.model('WorkflowRun', workflowRunSchema);

module.exports = { Workflow, WorkflowRun };
