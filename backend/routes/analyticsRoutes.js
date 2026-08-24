const express = require('express');
const router = express.Router();
const AgentConversation = require('../models/AgentConversation');
const Document = require('../models/Document');
const { Workflow, WorkflowRun } = require('../models/Workflow');
const AuditLog = require('../models/AuditLog');
const authenticate = require('../middleware/authenticate');
const { requireRole } = require('../middleware/rbac');

// GET /api/analytics/overview — main dashboard stats
router.get('/overview', authenticate, async (req, res) => {
  const targetOrgId = req.orgId || req.user?.organization;
  const docMatch = targetOrgId ? { organization: targetOrgId, isActive: true } : { uploadedBy: req.userId, isActive: true };
  const convMatch = targetOrgId ? { organization: targetOrgId, isActive: true } : { user: req.userId, isActive: true };

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [
    totalDocs, recentDocs, processedDocs,
    totalConvs, recentConvs,
    totalWorkflows, recentRuns, successRuns,
    agentBreakdown, docTypeBreakdown,
  ] = await Promise.all([
    Document.countDocuments(docMatch),
    Document.countDocuments({ ...docMatch, createdAt: { $gte: thirtyDaysAgo } }),
    Document.countDocuments({ ...docMatch, status: 'completed' }),
    AgentConversation.countDocuments(convMatch),
    AgentConversation.countDocuments({ ...convMatch, createdAt: { $gte: thirtyDaysAgo } }),
    Workflow.countDocuments(targetOrgId ? { organization: targetOrgId } : { userId: req.userId }),
    WorkflowRun.countDocuments({ createdAt: { $gte: thirtyDaysAgo } }),
    WorkflowRun.countDocuments({ status: 'success', createdAt: { $gte: thirtyDaysAgo } }),
    // Agent usage breakdown
    AgentConversation.aggregate([
      { $match: convMatch },
      { $unwind: '$messages' },
      { $match: { 'messages.role': 'assistant' } },
      { $group: { _id: '$messages.xai.agentUsed', count: { $sum: 1 }, avgConfidence: { $avg: '$messages.xai.confidence' } } },
      { $sort: { count: -1 } },
    ]),
    Document.aggregate([
      { $match: docMatch },
      { $group: { _id: '$type', count: { $sum: 1 }, totalSize: { $sum: '$size' } } },
    ]),
  ]);


  // Daily conversation activity (last 30 days)
  const dailyActivity = await AgentConversation.aggregate([
    { $match: { ...convMatch, createdAt: { $gte: thirtyDaysAgo } } },
    { $group: {
      _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
      conversations: { $sum: 1 },
    }},
    { $sort: { _id: 1 } },
  ]);


  res.json({
    success: true,
    data: {
      documents: { total: totalDocs, recent: recentDocs, processed: processedDocs, processingRate: totalDocs ? Math.round((processedDocs / totalDocs) * 100) : 0 },
      conversations: { total: totalConvs, recent: recentConvs },
      workflows: { total: totalWorkflows, recentRuns, successRate: recentRuns ? Math.round((successRuns / recentRuns) * 100) : 0 },
      agentBreakdown,
      docTypeBreakdown,
      dailyActivity,
    },
  });
});

// GET /api/analytics/agents — detailed agent analytics
router.get('/agents', authenticate, async (req, res) => {
  const targetOrgId = req.orgId || req.user?.organization;
  const convMatch = targetOrgId ? { organization: targetOrgId, isActive: true } : { user: req.userId, isActive: true };

  const stats = await AgentConversation.aggregate([
    { $match: convMatch },
    { $unwind: '$messages' },
    { $match: { 'messages.role': 'assistant' } },
    { $group: {
      _id: '$messages.xai.agentUsed',
      totalResponses: { $sum: 1 },
      avgConfidence: { $avg: '$messages.xai.confidence' },
      avgProcessingTime: { $avg: '$messages.xai.processingTimeMs' },
    }},
  ]);
  res.json({ success: true, data: { agentStats: stats } });
});


module.exports = router;
