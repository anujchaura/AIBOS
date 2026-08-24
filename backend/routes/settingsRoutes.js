const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Organization = require('../models/Organization');
const authenticate = require('../middleware/authenticate');
const { audit } = require('../middleware/audit');

// GET /api/settings/profile
router.get('/profile', authenticate, async (req, res) => {
  const user = await User.findById(req.userId).select('-password -mfaSecret -refreshTokens').populate('organization', 'name industry size');
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });
  res.json({ success: true, data: { user } });
});

// PUT /api/settings/profile — update name, phone, title, bio
router.put('/profile', authenticate, async (req, res) => {
  const { firstName, lastName, phone, title, bio } = req.body;
  const updates = {};
  if (firstName) updates.firstName = firstName.trim();
  if (lastName)  updates.lastName  = lastName.trim();
  if (phone !== undefined) updates.phone = phone;
  if (title !== undefined) updates.title = title;
  if (bio   !== undefined) updates.bio   = bio;

  const user = await User.findByIdAndUpdate(req.userId, updates, { new: true }).select('-password -mfaSecret -refreshTokens');
  await audit({ user: req.user, organization: req.orgId, action: 'settings.profile_update', req }).catch(() => {});
  res.json({ success: true, message: 'Profile updated', data: { user } });
});

// PUT /api/settings/password
router.put('/password', authenticate, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) return res.status(400).json({ success: false, message: 'Both passwords required' });
  if (newPassword.length < 8) return res.status(400).json({ success: false, message: 'New password must be at least 8 characters' });

  const user = await User.findById(req.userId);
  const valid = await user.comparePassword(currentPassword);
  if (!valid) return res.status(401).json({ success: false, message: 'Current password is incorrect' });

  user.password = newPassword;
  await user.save();
  await audit({ user: req.user, organization: req.orgId, action: 'settings.password_change', req }).catch(() => {});
  res.json({ success: true, message: 'Password changed successfully' });
});

// GET /api/settings/organization
router.get('/organization', authenticate, async (req, res) => {
  const org = await Organization.findById(req.orgId);
  if (!org) return res.status(404).json({ success: false, message: 'Organization not found' });
  res.json({ success: true, data: { organization: org } });
});

// PUT /api/settings/organization
router.put('/organization', authenticate, async (req, res) => {
  // Only admins can update org settings
  if (!['super_admin', 'org_admin'].includes(req.user?.role)) {
    return res.status(403).json({ success: false, message: 'Only admins can update organization settings' });
  }
  const { name, industry, website, description, size } = req.body;
  const updates = {};
  if (name)        updates.name        = name.trim();
  if (industry)    updates.industry    = industry;
  if (website !== undefined) updates.website = website;
  if (description !== undefined) updates.description = description;
  if (size)        updates.size        = size;

  const org = await Organization.findByIdAndUpdate(req.orgId, updates, { new: true });
  await audit({ user: req.user, organization: req.orgId, action: 'settings.org_update', req }).catch(() => {});
  res.json({ success: true, message: 'Organization updated', data: { organization: org } });
});

// GET /api/settings/api-keys — list keys (masked)
router.get('/api-keys', authenticate, async (req, res) => {
  // Return which keys are configured (mask actual values)
  const keys = {
    openai:    process.env.OPENAI_API_KEY && !process.env.OPENAI_API_KEY.includes('placeholder') ? '••••••••' + process.env.OPENAI_API_KEY.slice(-4) : null,
    aiService: process.env.AI_SERVICE_API_KEY ? '••••••••' : null,
  };
  res.json({ success: true, data: { keys } });
});

module.exports = router;
