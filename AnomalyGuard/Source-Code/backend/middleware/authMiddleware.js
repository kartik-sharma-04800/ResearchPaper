const { verifyToken } = require('../config/jwt');
const User = require('../models/User');
const protect = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }
    if (!token) {
      return res.status(401).json({ success: false, message: 'Not authorised — no token' });
    }
    const decoded = verifyToken(token);
    req.user = await User.findById(decoded.id).select('-password');
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }
    if (req.user.isSuspended) {
      return res.status(403).json({ success: false, message: 'Account suspended' });
    }
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Not authorised — invalid token' });
  }
};
const adminOnly = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Admin access required' });
  }
  next();
};
module.exports = { protect, adminOnly };
