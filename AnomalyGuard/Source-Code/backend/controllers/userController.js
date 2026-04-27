const User = require('../models/User');
const LoginEvent = require('../models/LoginEvent');
const AnomalyAlert = require('../models/AnomalyAlert');
const UserProfile = require('../models/UserProfile');
const getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    res.json({ success: true, data: { id: user._id, name: user.name, email: user.email, role: user.role, loginCount: user.loginCount, lastLogin: user.lastLogin, createdAt: user.createdAt } });
  } catch (err) { next(err); }
};
const updateProfile = async (req, res, next) => {
  try {
    const { name } = req.body;
    const user = await User.findByIdAndUpdate(req.user._id, { name }, { new: true, runValidators: true });
    res.json({ success: true, message: 'Profile updated', data: { name: user.name, email: user.email } });
  } catch (err) { next(err); }
};
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) return res.status(400).json({ success: false, message: 'Both passwords required' });
    const user = await User.findById(req.user._id).select('+password');
    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) return res.status(401).json({ success: false, message: 'Current password incorrect' });
    user.password = newPassword;
    await user.save();
    res.json({ success: true, message: 'Password changed successfully' });
  } catch (err) { next(err); }
};
const getAllUsers = async (req, res, next) => {
  try {
    const users = await User.find({}).select('-password').lean();
    const withStats = await Promise.all(users.map(async (u) => {
      const [logins, anomalies] = await Promise.all([
        LoginEvent.countDocuments({ userId: u._id }),
        AnomalyAlert.countDocuments({ userId: u._id }),
      ]);
      return { ...u, loginCount: logins, alertCount: anomalies };
    }));
    res.json({ success: true, data: withStats, total: withStats.length });
  } catch (err) { next(err); }
};
const toggleSuspend = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    user.isSuspended = !user.isSuspended;
    await user.save();
    res.json({ success: true, message: `User ${user.isSuspended ? 'suspended' : 'unsuspended'}`, isSuspended: user.isSuspended });
  } catch (err) { next(err); }
};
module.exports = { getProfile, updateProfile, changePassword, getAllUsers, toggleSuspend };
