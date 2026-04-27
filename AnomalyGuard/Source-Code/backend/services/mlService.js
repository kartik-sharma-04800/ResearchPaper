const axios = require('axios');
const ML_BASE = process.env.PYTHON_ML_URL || 'http://localhost:8000';
/**
 * Send a login feature vector to the Python ML service.
 * Returns: { score, isAnomaly, severity, reasons, metrics, latency }
 */
const scoreLogin = async (featureVector) => {
  try {
    const { data } = await axios.post(`${ML_BASE}/score`, featureVector, {
      timeout: 5000,
      headers: { 'Content-Type': 'application/json' },
    });
    return {
      score:    data.score,
      isAnomaly: data.is_anomaly,
      severity: data.severity,
      reasons:  data.reasons || [],
      modelType: data.model_type || 'unknown',
      latency: data.latency_ms || 0,
      metrics: data.performance_metrics || null,
    };
  } catch (err) {
    console.error('⚠️  ML service unreachable:', err.message);
    return { score: null, isAnomaly: false, severity: 'none', reasons: ['ML service unavailable'], modelType: 'unavailable', latency: 0, metrics: null };
  }
};
/**
 * Trigger model retraining for a user with their latest login events.
 */
const trainUserModel = async (userId, loginEvents) => {
  try {
    const { data } = await axios.post(`${ML_BASE}/train`, {
      user_id: userId.toString(),
      events: loginEvents,
    }, { timeout: 30000 });
    return data;
  } catch (err) {
    console.error('⚠️  ML training failed:', err.message);
    return { success: false, error: err.message };
  }
};
/**
 * Get user behavioral clusters from ML service
 */
const getUserClusters = async (userId) => {
  try {
    const { data } = await axios.get(`${ML_BASE}/clusters/${userId}`, { timeout: 5000 });
    return data;
  } catch (err) {
    return { clusters: [] };
  }
};
/**
 * Health check for ML service
 */
const checkMLHealth = async () => {
  try {
    const { data } = await axios.get(`${ML_BASE}/health`, { timeout: 3000 });
    return { online: true, ...data };
  } catch {
    return { online: false };
  }
};
/**
 * Get real-time performance metrics for a user
 */
const getUserMetrics = async (userId) => {
  try {
    const { data } = await axios.get(`${ML_BASE}/metrics/${userId}`, { timeout: 5000 });
    return data;
  } catch (err) {
    return { error: err.message };
  }
};
/**
 * Get model information for a user
 */
const getModelInfo = async (userId) => {
  try {
    const { data } = await axios.get(`${ML_BASE}/model-info/${userId}`, { timeout: 5000 });
    return data;
  } catch (err) {
    return { exists: false };
  }
};
module.exports = { scoreLogin, trainUserModel, getUserClusters, checkMLHealth, getUserMetrics, getModelInfo };
