  const LoginEvent   = require('../models/LoginEvent');
  const AnomalyAlert = require('../models/AnomalyAlert');
  const UserProfile  = require('../models/UserProfile');
  const { checkMLHealth, getUserClusters, getUserMetrics, getModelInfo } = require('../services/mlService');
  const getLoginHistory = async (req, res, next) => {
    try {
      const page   = parseInt(req.query.page)  || 1;
      const limit  = parseInt(req.query.limit) || 20;
      const skip   = (page - 1) * limit;
      const base = req.user.role === 'admin' && req.query.userId
        ? { userId: req.query.userId }
        : { userId: req.user._id };
      const query = { ...base };
      if (req.query.anomaly !== undefined && req.query.anomaly !== '')
        query.isAnomaly = req.query.anomaly === 'true';
      if (req.query.success !== undefined && req.query.success !== '')
        query.success = req.query.success === 'true';
      const [events, total] = await Promise.all([
        LoginEvent.find(query).sort({ timestamp: -1 }).skip(skip).limit(limit).lean(),
        LoginEvent.countDocuments(query),
      ]);
      res.json({
        success: true,
        data: events,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      });
    } catch (err) { next(err); }
  };
  const getStats = async (req, res, next) => {
    try {
      const userId = req.user._id;
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const [
        totalLogins, anomalyCount,
        lowSeverity, highSeverity,
        unresolvedAlerts,
        profile, countries, last7Days,
      ] = await Promise.all([
        LoginEvent.countDocuments({ userId }),
        LoginEvent.countDocuments({ userId, isAnomaly: true }),
        AnomalyAlert.countDocuments({ userId, severity: 'low',  resolved: false }),
        AnomalyAlert.countDocuments({ userId, severity: 'high', resolved: false }),
        AnomalyAlert.countDocuments({ userId, resolved: false }),
        UserProfile.findOne({ userId }).lean(),
        LoginEvent.distinct('geoLocation.country', { userId }),
        LoginEvent.aggregate([
          { $match: { userId, timestamp: { $gte: sevenDaysAgo } } },
          { $group: {
            _id:       { $dateToString: { format: '%b %d', date: '$timestamp' } },
            logins:    { $sum: 1 },
            anomalies: { $sum: { $cond: ['$isAnomaly', 1, 0] } },
            failed:    { $sum: { $cond: [{ $eq: ['$success', false] }, 1, 0] } },
          }},
          { $sort: { _id: 1 } },
          { $project: { _id: 0, date: '$_id', logins: 1, anomalies: 1, failed: 1 } },
        ]),
      ]);
      let modelInfo = null;
      try {
        const { getUserClusters: gc } = require('../services/mlService');
        modelInfo = profile?.modelTrained ? await gc(userId.toString()) : null;
      } catch {}
      const hourHistogram = profile?.hourHistogram || Array(24).fill(0);
      res.json({
        success: true,
        data: {
          totalLogins,
          anomalyCount,
          unresolvedAlerts,
          lowSeverity,
          highSeverity,
          uniqueCountries: countries.filter(c => c && c !== 'unknown' && c !== 'Unknown').length,
          modelTrained:    profile?.modelTrained || false,
          detectionRate:   totalLogins > 0 ? ((anomalyCount / totalLogins) * 100).toFixed(1) : '0.0',
          fpRate:          '3.1',   // from paper — in production compute from labelled data
          last7Days,
          hourHistogram,
          modelInfo,       // { trained, n_clusters, sample_count, trained_at } | null
        },
      });
    } catch (err) { next(err); }
  };
  const getAlerts = async (req, res, next) => {
    try {
      const page  = parseInt(req.query.page)  || 1;
      const limit = parseInt(req.query.limit) || 20;
      const skip  = (page - 1) * limit;
      const query = req.user.role === 'admin' ? {} : { userId: req.user._id };
      const [alerts, total] = await Promise.all([
        AnomalyAlert.find(query)
          .populate('userId', 'name email')
          .populate('loginEventId', 'ipAddress browser os geoLocation timestamp')
          .sort({ createdAt: -1 })
          .skip(skip).limit(limit).lean(),
        AnomalyAlert.countDocuments(query),
      ]);
      res.json({
        success: true,
        data: alerts,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      });
    } catch (err) { next(err); }
  };
  const resolveAlert = async (req, res, next) => {
    try {
      const filter = { _id: req.params.id };
      if (req.user.role !== 'admin') filter.userId = req.user._id;
      const alert = await AnomalyAlert.findOne(filter);
      if (!alert) return res.status(404).json({ success: false, message: 'Alert not found' });
      alert.resolved   = true;
      alert.resolvedAt = new Date();
      alert.resolvedBy = req.user.role === 'admin' ? 'admin' : 'user';
      await alert.save();
      res.json({ success: true, message: 'Alert resolved', data: alert });
    } catch (err) { next(err); }
  };
  const getUserBehaviorProfile = async (req, res, next) => {
    try {
      const profile = await UserProfile.findOne({ userId: req.user._id }).lean();
      if (!profile) return res.json({ success: true, data: null, message: 'No profile yet.' });
      res.json({ success: true, data: profile });
    } catch (err) { next(err); }
  };
  const getMlHealth = async (req, res, next) => {
    try {
      const health = await checkMLHealth();
      res.json({ success: true, data: health });   // <-- data key, not ml key
    } catch (err) { next(err); }
  };
  const getAllEvents = async (req, res, next) => {
    try {
      const page  = parseInt(req.query.page)  || 1;
      const limit = parseInt(req.query.limit) || 50;
      const skip  = (page - 1) * limit;
      const [events, total] = await Promise.all([
        LoginEvent.find({}).populate('userId', 'name email')
          .sort({ timestamp: -1 }).skip(skip).limit(limit).lean(),
        LoginEvent.countDocuments({}),
      ]);
      res.json({ success: true, data: events, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
    } catch (err) { next(err); }
  };
  const getMlMetrics = async (req, res, next) => {
    try {
      const userId = req.user.email; // Use email as user_id for ML service
      const metrics = await getUserMetrics(userId);
      res.json({ success: true, data: metrics });
    } catch (err) { next(err); }
  };
  const getModelInfoEndpoint = async (req, res, next) => {
    try {
      const userId = req.user.email;
      const modelInfo = await getModelInfo(userId);
      res.json({ success: true, data: modelInfo });
    } catch (err) { next(err); }
  };
  module.exports = {
    getLoginHistory, getStats, getAlerts, resolveAlert,
    getUserBehaviorProfile, getMlHealth, getAllEvents,
    getMlMetrics, getModelInfoEndpoint,
  };
