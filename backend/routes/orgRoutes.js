const express = require('express');
const router = express.Router();
const Organization = require('../models/Organization');
const Department = require('../models/Department');
const User = require('../models/User');
const authenticate = require('../middleware/authenticate');
const { requireRole } = require('../middleware/rbac');
const { audit } = require('../middleware/audit');

// ─── Organization ───────────────────────────────────────────

// GET /api/org/me — current org
router.get('/me', authenticate, async (req, res) => {
  const org = await Organization.findById(req.orgId).populate('owner', 'firstName lastName email');
  if (!org) return res.status(404).json({ success: false, message: 'Organization not found' });
  res.json({ success: true, data: { organization: org } });
});

// PUT /api/org/me — update org
router.put('/me', authenticate, requireRole(['org_admin', 'super_admin']), async (req, res) => {
  const allowed = ['name', 'description', 'logo', 'industry', 'size', 'website', 'address', 'settings'];
  const updates = {};
  allowed.forEach((key) => { if (req.body[key] !== undefined) updates[key] = req.body[key]; });

  const org = await Organization.findByIdAndUpdate(req.orgId, updates, { new: true });
  await audit({ user: req.user, organization: org, action: 'org.update', req, severity: 'medium' });
  res.json({ success: true, data: { organization: org } });
});

// ─── Departments ─────────────────────────────────────────────

// GET /api/org/departments
router.get('/departments', authenticate, async (req, res) => {
  const depts = await Department.find({ organization: req.orgId, isActive: true })
    .populate('manager', 'firstName lastName email');
  res.json({ success: true, data: { departments: depts } });
});

// POST /api/org/departments
router.post('/departments', authenticate, requireRole(['org_admin', 'super_admin']), async (req, res) => {
  const { name, code, description, managerId, parentDeptId, budget } = req.body;
  const dept = await Department.create({
    name, code, description,
    organization: req.orgId,
    manager: managerId,
    parentDept: parentDeptId,
    budget,
  });
  await audit({ user: req.user, organization: req.orgId, action: 'dept.create', req });
  res.status(201).json({ success: true, data: { department: dept } });
});

// PUT /api/org/departments/:id
router.put('/departments/:id', authenticate, requireRole(['org_admin', 'super_admin']), async (req, res) => {
  const dept = await Department.findOneAndUpdate(
    { _id: req.params.id, organization: req.orgId },
    req.body, { new: true }
  );
  if (!dept) return res.status(404).json({ success: false, message: 'Department not found' });
  res.json({ success: true, data: { department: dept } });
});

// DELETE /api/org/departments/:id
router.delete('/departments/:id', authenticate, requireRole(['org_admin', 'super_admin']), async (req, res) => {
  await Department.findOneAndUpdate({ _id: req.params.id, organization: req.orgId }, { isActive: false });
  res.json({ success: true, message: 'Department deactivated' });
});

// ─── Users ───────────────────────────────────────────────────

// GET /api/org/users
router.get('/users', authenticate, requireRole(['org_admin', 'dept_manager', 'super_admin']), async (req, res) => {
  const { role, department, isActive = true, page = 1, limit = 20 } = req.query;
  const query = { organization: req.orgId };
  if (role) query.role = role;
  if (department) query.department = department;
  if (isActive !== undefined) query.isActive = isActive === 'true';

  const total = await User.countDocuments(query);
  const users = await User.find(query)
    .populate('department', 'name code')
    .select('-password -mfaSecret -refreshTokens')
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(parseInt(limit));

  res.json({ success: true, data: { users, total } });
});

// PUT /api/org/users/:id/role
router.put('/users/:id/role', authenticate, requireRole(['org_admin', 'super_admin']), async (req, res) => {
  const { role, department } = req.body;
  const validRoles = ['org_admin', 'dept_manager', 'employee', 'viewer'];
  if (!validRoles.includes(role)) return res.status(400).json({ success: false, message: 'Invalid role' });

  const user = await User.findOneAndUpdate(
    { _id: req.params.id, organization: req.orgId },
    { role, department },
    { new: true }
  ).select('-password -mfaSecret -refreshTokens');

  if (!user) return res.status(404).json({ success: false, message: 'User not found' });
  await audit({ user: req.user, organization: req.orgId, action: 'user.role_change', resource: 'User', resourceId: user._id, details: { newRole: role }, req, severity: 'high' });
  res.json({ success: true, data: { user } });
});

// PUT /api/org/users/:id/deactivate
router.put('/users/:id/deactivate', authenticate, requireRole(['org_admin', 'super_admin']), async (req, res) => {
  const user = await User.findOneAndUpdate(
    { _id: req.params.id, organization: req.orgId },
    { isActive: false, refreshTokens: [] },
    { new: true }
  ).select('-password -mfaSecret -refreshTokens');
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });
  await audit({ user: req.user, organization: req.orgId, action: 'user.deactivate', resource: 'User', resourceId: user._id, req, severity: 'high' });
  res.json({ success: true, message: 'User deactivated' });
});

module.exports = router;
