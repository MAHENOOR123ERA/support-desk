/**
 * Restricts a route to one or more roles. Must run after requireAuth.
 * Usage: requireRole('agent', 'admin')
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.dbUser) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    if (!roles.includes(req.dbUser.role)) {
      return res.status(403).json({ message: 'Insufficient permissions for this action' });
    }
    next();
  };
}

module.exports = requireRole;
