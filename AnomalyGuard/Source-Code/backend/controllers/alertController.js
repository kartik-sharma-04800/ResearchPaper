const AnomalyAlert = require('../models/AnomalyAlert');
const getUnresolvedAlerts = async (req, res, next) => {
  try {
    const query = req.user.role === 'admin' ? { resolved: false } : { userId: req.user._id, resolved: false };
    const alerts = await AnomalyAlert.find(query)
      .populate('loginEventId', 'ipAddress browser os geoLocation timestamp')
      .sort({ createdAt: -1 }).limit(50).lean();
    res.json({ success: true, data: alerts, count: alerts.length });
  } catch (err) { next(err); }
};
const resolveOne = async (req, res, next) => {
  try {
    const alert = await AnomalyAlert.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.role === 'admin' ? undefined : req.user._id },
      { resolved: true, resolvedAt: new Date(), resolvedBy: req.user.role },
      { new: true }
    );
    if (!alert) return res.status(404).json({ success: false, message: 'Alert not found' });
    res.json({ success: true, data: alert });
  } catch (err) { next(err); }
};
const resolveAll = async (req, res, next) => {
  try {
    const query = req.user.role === 'admin' ? { resolved: false } : { userId: req.user._id, resolved: false };
    await AnomalyAlert.updateMany(query, { resolved: true, resolvedAt: new Date(), resolvedBy: req.user.role });
    res.json({ success: true, message: 'All alerts resolved' });
  } catch (err) { next(err); }
};
module.exports = { getUnresolvedAlerts, resolveOne, resolveAll };
