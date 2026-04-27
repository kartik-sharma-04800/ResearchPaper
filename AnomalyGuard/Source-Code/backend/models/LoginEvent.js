const mongoose = require('mongoose');
const LoginEventSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  email: { type: String, required: true },
  ipAddress:  { type: String, default: 'unknown' },
  realExternalIP: { type: String, default: null },  // Real external IP (for localhost detection)
  userAgent:  { type: String, default: '' },
  deviceType: { type: String, enum: ['desktop', 'mobile', 'tablet', 'unknown'], default: 'unknown' },
  browser:    { type: String, default: 'unknown' },
  os:         { type: String, default: 'unknown' },
  deviceFingerprint: { type: String, default: null },  // Device fingerprint for tracking
  geoLocation: {
    country:   { type: String, default: 'unknown' },
    region:    { type: String, default: 'unknown' },
    city:      { type: String, default: 'unknown' },
    latitude:  { type: Number, default: 0 },
    longitude: { type: Number, default: 0 },
    timezone:  { type: String, default: 'unknown' },
  },
  timestamp:    { type: Date, default: Date.now, index: true },
  hourOfDay:    { type: Number, min: 0, max: 23 },
  dayOfWeek:    { type: Number, min: 0, max: 6 },
  dayOfMonth:   { type: Number, min: 1, max: 31 },
  success:     { type: Boolean, default: true },
  failReason:  { type: String, default: '' },
  anomalyScore:    { type: Number, default: null },
  isAnomaly:       { type: Boolean, default: false },
  anomalySeverity: { type: String, enum: ['none', 'low', 'high'], default: 'none' },
  anomalyReasons:  [{ type: String }],
  mlProcessed:     { type: Boolean, default: false },
});
LoginEventSchema.pre('save', function (next) {
  const d = this.timestamp || new Date();
  this.hourOfDay  = d.getHours();
  this.dayOfWeek  = d.getDay();
  this.dayOfMonth = d.getDate();
  next();
});
module.exports = mongoose.model('LoginEvent', LoginEventSchema);
