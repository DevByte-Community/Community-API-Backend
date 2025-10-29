const requireAdmin = (req, res, next) => {
  // Check if the user object (attached by the authentication middleware) exists
  if (!req.user)
    return res
      .status(401)
      .json({ success: false, message: 'Access Denied. User not authenticated.' });

  // Check the user's role.
  if (req.user.role !== 'admin')
    return res
      .status(403)
      .json({ success: false, message: 'Access Denied. You must be an administrator.' });

  next();
};

module.exports = requireAdmin;
