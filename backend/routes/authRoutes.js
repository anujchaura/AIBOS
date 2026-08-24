const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { authenticator } = require('otplib');
const qrcode = require('qrcode');
const { v4: uuidv4 } = require('uuid');
const User = require('../models/User');
const Organization = require('../models/Organization');
const authenticate = require('../middleware/authenticate');
const { audit } = require('../middleware/audit');

const generateTokens = (userId) => {
  const accessToken = jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
  });
  const refreshToken = jwt.sign({ userId }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  });
  return { accessToken, refreshToken };
};

// POST /api/auth/register
router.post('/register', [
  body('firstName').trim().notEmpty().withMessage('First name required'),
  body('lastName').trim().notEmpty().withMessage('Last name required'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('orgName').optional().trim(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

  const { firstName, lastName, email, password, orgName } = req.body;

  const existingUser = await User.findOne({ email });
  if (existingUser) return res.status(409).json({ success: false, message: 'Email already registered' });

  let org = null;
  if (orgName) {
    const slug = orgName.toLowerCase().replace(/\s+/g, '-') + '-' + uuidv4().slice(0, 6);
    org = await Organization.create({ name: orgName, slug });
  }

  const user = await User.create({
    firstName, lastName, email, password,
    role: orgName ? 'org_admin' : 'employee',
    organization: org?._id,
    isVerified: true,
  });

  if (org) {
    org.owner = user._id;
    await org.save();
  }

  const { accessToken, refreshToken } = generateTokens(user._id);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  user.refreshTokens.push({ token: refreshToken, createdAt: new Date(), expiresAt, userAgent: req.headers['user-agent'] });
  await user.save();

  await audit({ user, organization: org, action: 'user.register', req });

  res.status(201).json({
    success: true,
    message: 'Account created successfully',
    data: { user: user.toSafeObject(), accessToken, refreshToken },
  });
});

// POST /api/auth/login
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

  const { email, password, mfaCode } = req.body;

  const user = await User.findOne({ email })
    .populate('organization', 'name slug isActive plan')
    .populate('department', 'name code');

  if (!user || !user.isActive) {
    return res.status(401).json({ success: false, message: 'Invalid credentials' });
  }

  const passwordMatch = await user.comparePassword(password);
  if (!passwordMatch) {
    await audit({ user, action: 'user.login_failed', req, status: 'failure', severity: 'medium' });
    return res.status(401).json({ success: false, message: 'Invalid credentials' });
  }

  // MFA check
  if (user.mfaEnabled) {
    if (!mfaCode) return res.status(200).json({ success: false, mfaRequired: true, message: 'MFA code required' });
    const valid = authenticator.verify({ token: mfaCode, secret: user.mfaSecret });
    if (!valid) {
      await audit({ user, action: 'user.mfa_failed', req, status: 'failure', severity: 'high' });
      return res.status(401).json({ success: false, message: 'Invalid MFA code' });
    }
  }

  const { accessToken, refreshToken } = generateTokens(user._id);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  user.refreshTokens = user.refreshTokens.filter((t) => t.expiresAt > new Date());
  user.refreshTokens.push({ token: refreshToken, createdAt: new Date(), expiresAt, userAgent: req.headers['user-agent'] });
  user.lastLogin = new Date();
  await user.save();

  await audit({ user, organization: user.organization, action: 'user.login', req });

  res.json({
    success: true,
    message: 'Login successful',
    data: { user: user.toSafeObject(), accessToken, refreshToken },
  });
});

// POST /api/auth/refresh
router.post('/refresh', async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(401).json({ success: false, message: 'Refresh token required' });

  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.userId);
    if (!user || !user.isActive) return res.status(401).json({ success: false, message: 'Invalid user' });

    const tokenRecord = user.refreshTokens.find((t) => t.token === refreshToken && t.expiresAt > new Date());
    if (!tokenRecord) return res.status(401).json({ success: false, message: 'Invalid or expired refresh token' });

    const { accessToken, refreshToken: newRefreshToken } = generateTokens(user._id);
    // Rotate refresh token
    user.refreshTokens = user.refreshTokens.filter((t) => t.token !== refreshToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    user.refreshTokens.push({ token: newRefreshToken, createdAt: new Date(), expiresAt });
    await user.save();

    res.json({ success: true, data: { accessToken, refreshToken: newRefreshToken } });
  } catch (err) {
    res.status(401).json({ success: false, message: 'Invalid refresh token' });
  }
});

// POST /api/auth/logout
router.post('/logout', authenticate, async (req, res) => {
  const { refreshToken } = req.body;
  req.user.refreshTokens = req.user.refreshTokens.filter((t) => t.token !== refreshToken);
  await req.user.save();
  await audit({ user: req.user, organization: req.user.organization, action: 'user.logout', req });
  res.json({ success: true, message: 'Logged out successfully' });
});

// GET /api/auth/me
router.get('/me', authenticate, async (req, res) => {
  res.json({ success: true, data: { user: req.user.toSafeObject() } });
});

// POST /api/auth/mfa/setup
router.post('/mfa/setup', authenticate, async (req, res) => {
  const secret = authenticator.generateSecret();
  const otpauthUrl = authenticator.keyuri(req.user.email, process.env.MFA_APP_NAME || 'AIBOS', secret);
  const qrCodeUrl = await qrcode.toDataURL(otpauthUrl);
  req.user.mfaSecret = secret;
  await req.user.save();
  res.json({ success: true, data: { secret, qrCodeUrl } });
});

// POST /api/auth/mfa/verify
router.post('/mfa/verify', authenticate, [body('code').notEmpty()], async (req, res) => {
  const { code } = req.body;
  const valid = authenticator.verify({ token: code, secret: req.user.mfaSecret });
  if (!valid) return res.status(400).json({ success: false, message: 'Invalid MFA code' });
  req.user.mfaEnabled = true;
  await req.user.save();
  await audit({ user: req.user, action: 'user.mfa_enabled', req, severity: 'medium' });
  res.json({ success: true, message: 'MFA enabled successfully' });
});

// POST /api/auth/mfa/disable
router.post('/mfa/disable', authenticate, [body('code').notEmpty()], async (req, res) => {
  const { code } = req.body;
  const valid = authenticator.verify({ token: code, secret: req.user.mfaSecret });
  if (!valid) return res.status(400).json({ success: false, message: 'Invalid MFA code' });
  req.user.mfaEnabled = false;
  req.user.mfaSecret = undefined;
  await req.user.save();
  await audit({ user: req.user, action: 'user.mfa_disabled', req, severity: 'high' });
  res.json({ success: true, message: 'MFA disabled' });
});

module.exports = router;
