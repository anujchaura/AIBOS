const AuditLog = require('../models/AuditLog');

/**
 * Create an audit log entry
 */
const audit = async ({ user, organization, action, resource, resourceId, details, req, status = 'success', severity = 'low' }) => {
  try {
    await AuditLog.create({
      user: user?._id || user,
      organization: organization?._id || organization,
      action,
      resource,
      resourceId: resourceId?.toString(),
      details,
      ipAddress: req?.ip || req?.connection?.remoteAddress,
      userAgent: req?.headers?.['user-agent'],
      status,
      severity,
    });
  } catch (err) {
    // Non-blocking — don't throw
    console.error('Audit log error:', err.message);
  }
};

/**
 * Express middleware to automatically audit route access
 * Usage: router.post('/login', auditMiddleware('user.login'), controller)
 */
const auditMiddleware = (action, severity = 'low') => {
  return async (req, res, next) => {
    const originalJson = res.json.bind(res);
    res.json = async function (body) {
      await audit({
        user: req.user,
        organization: req.user?.organization,
        action,
        details: { method: req.method, path: req.path, body: req.body },
        req,
        status: res.statusCode < 400 ? 'success' : 'failure',
        severity,
      });
      return originalJson(body);
    };
    next();
  };
};

module.exports = { audit, auditMiddleware };
