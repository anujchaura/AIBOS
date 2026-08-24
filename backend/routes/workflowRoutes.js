const express = require('express');
const router = express.Router();
const axios = require('axios');
const { Workflow, WorkflowRun } = require('../models/Workflow');
const authenticate = require('../middleware/authenticate');
const { requireRole } = require('../middleware/rbac');
const { audit } = require('../middleware/audit');

const AI_URL = () => process.env.AI_SERVICE_URL || 'http://localhost:8001';
const AI_HEADERS = () => ({ 'X-API-Key': process.env.AI_SERVICE_API_KEY, 'Content-Type': 'application/json' });

// GET /api/workflows
router.get('/', authenticate, async (req, res) => {
  const targetOrgId = req.orgId || req.user?.organization;
  const query = targetOrgId ? { organization: targetOrgId } : { createdBy: req.userId };
  const workflows = await Workflow.find(query)
    .populate('createdBy', 'firstName lastName')
    .sort({ createdAt: -1 });
  res.json({ success: true, data: { workflows } });
});

// POST /api/workflows
router.post('/', authenticate, async (req, res) => {
  const { name, description, trigger, steps } = req.body;
  const targetOrgId = req.orgId || req.user?.organization || null;

  const workflow = await Workflow.create({
    name, description, trigger, steps,
    organization: targetOrgId,
    createdBy: req.userId,
  });
  await audit({ user: req.user, organization: targetOrgId, action: 'workflow.create', req }).catch(() => {});
  res.status(201).json({ success: true, data: { workflow } });
});

// GET /api/workflows/:id
router.get('/:id', authenticate, async (req, res) => {
  const workflow = await Workflow.findById(req.params.id)
    .populate('createdBy', 'firstName lastName');
  if (!workflow) return res.status(404).json({ success: false, message: 'Workflow not found' });
  res.json({ success: true, data: { workflow } });
});

// PUT /api/workflows/:id
router.put('/:id', authenticate, async (req, res) => {
  const targetOrgId = req.orgId || req.user?.organization;
  const filter = targetOrgId ? { _id: req.params.id, organization: targetOrgId } : { _id: req.params.id, createdBy: req.userId };
  const workflow = await Workflow.findOneAndUpdate(
    filter,
    req.body, { new: true }
  );
  if (!workflow) {
    const directWF = await Workflow.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!directWF) return res.status(404).json({ success: false, message: 'Workflow not found' });
    return res.json({ success: true, data: { workflow: directWF } });
  }
  res.json({ success: true, data: { workflow } });
});

// DELETE /api/workflows/:id
router.delete('/:id', authenticate, async (req, res) => {
  const targetOrgId = req.orgId || req.user?.organization;
  const filter = targetOrgId ? { _id: req.params.id, organization: targetOrgId } : { _id: req.params.id, createdBy: req.userId };
  let wf = await Workflow.findOneAndDelete(filter);
  if (!wf) {
    wf = await Workflow.findByIdAndDelete(req.params.id);
  }
  res.json({ success: true, message: 'Workflow deleted' });
});

// POST /api/workflows/:id/run — manually trigger
router.post('/:id/run', authenticate, async (req, res) => {
  const targetOrgId = req.orgId || req.user?.organization;
  let workflow = await Workflow.findById(req.params.id);
  if (!workflow) return res.status(404).json({ success: false, message: 'Workflow not found' });

  try {
    const response = await axios.post(`${AI_URL()}/workflows/run`, {
      workflowId: workflow._id.toString(),
      workflow: workflow.toObject(),
      triggerData: req.body.data || {},
      orgId: (targetOrgId || 'default').toString(),
      userId: req.userId?.toString(),
    }, { headers: AI_HEADERS(), timeout: 30000 });

    const runId = response.data.run_id || `run_${Date.now()}`;

    // Record workflow run in DB
    await WorkflowRun.create({
      workflow: workflow._id,
      organization: targetOrgId,
      triggeredBy: req.userId,
      runId,
      status: 'success',
      startedAt: new Date(),
      completedAt: new Date(),
    }).catch(() => {});

    await audit({ user: req.user, organization: targetOrgId, action: 'workflow.run', req }).catch(() => {});
    res.json({ success: true, data: { runId, status: 'started', message: 'Workflow execution started' } });
  } catch (error) {
    res.status(502).json({ success: false, message: error.response?.data?.detail || error.message || 'Workflow engine error' });
  }
});


// GET /api/workflows/:id/runs — execution history
router.get('/:id/runs', authenticate, async (req, res) => {
  const runs = await WorkflowRun.find({ workflow: req.params.id })
    .populate('triggeredBy', 'firstName lastName')
    .sort({ createdAt: -1 })
    .limit(50);
  res.json({ success: true, data: { runs } });
});

module.exports = router;
