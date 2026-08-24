/**
 * RBAC Middleware – Role-Based Access Control
 * Usage: requireRole(['org_admin', 'super_admin'])
 */
const requireRole = (roles = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const userRole = req.user.role;
    const allowed = Array.isArray(roles) ? roles : [roles];

    // super_admin can always access everything
    if (userRole === 'super_admin') return next();

    if (!allowed.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required role(s): ${allowed.join(', ')}. Your role: ${userRole}`,
      });
    }

    next();
  };
};

/**
 * Permission check middleware
 * Usage: requirePermission('knowledge:write')
 */
const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    if (req.user.role === 'super_admin') return next();

    if (req.user.permissions && req.user.permissions.includes(permission)) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: `Access denied. Required permission: ${permission}`,
    });
  };
};

/**
 * Ensure user belongs to the same organization as the requested resource
 */
const requireSameOrg = (req, res, next) => {
  if (!req.user) return res.status(401).json({ success: false, message: 'Authentication required' });
  if (req.user.role === 'super_admin') return next();

  const requestedOrgId = req.params.orgId || req.body.organization;
  if (requestedOrgId && requestedOrgId.toString() !== req.user.organization?._id?.toString()) {
    return res.status(403).json({ success: false, message: 'Access to this organization is denied' });
  }

  next();
};

module.exports = { requireRole, requirePermission, requireSameOrg };
