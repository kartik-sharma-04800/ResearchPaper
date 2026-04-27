const express = require('express');
const router = express.Router();
const {
  getLoginHistory, getStats, getAlerts,
  resolveAlert, getUserBehaviorProfile, getMlHealth, getAllEvents,
  getMlMetrics, getModelInfoEndpoint,
} = require('../controllers/anomalyController');
const { protect, adminOnly } = require('../middleware/authMiddleware');
router.use(protect); // all routes require login
router.get('/login-history',  getLoginHistory);
router.get('/stats',          getStats);
router.get('/alerts',         getAlerts);
router.get('/profile',        getUserBehaviorProfile);
router.get('/ml-health',      getMlHealth);
router.get('/ml-metrics',     getMlMetrics);
router.get('/model-info',     getModelInfoEndpoint);
router.patch('/alerts/:id/resolve', resolveAlert);
router.get('/admin/all-events', adminOnly, getAllEvents);
module.exports = router;
