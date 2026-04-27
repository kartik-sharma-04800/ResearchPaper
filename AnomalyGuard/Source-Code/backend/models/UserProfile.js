const mongoose = require('mongoose');
const UserProfileSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
  },
  totalLogins: { type: Number, default: 0 },
  modelTrained: { type: Boolean, default: false },   // true once ≥ 30 logins
  lastModelUpdate: { type: Date },
  knownIPs: [{ ip: String, count: Number, lastSeen: Date }],
  knownCountries: [{ country: String, count: Number }],
  knownCities:    [{ city: String, count: Number }],
  hourHistogram: {
    type: [Number],
    default: Array(24).fill(0),
  },
  dayHistogram: {
    type: [Number],
    default: Array(7).fill(0),
  },
  knownDevices: [{ fingerprint: String, userAgent: String, browser: String, os: String, deviceType: String, count: Number, lastSeen: Date }],
  avgLoginsPerDay: { type: Number, default: 0 },
  lastLogin: { type: Date },
  updatedAt: { type: Date, default: Date.now },
});
module.exports = mongoose.model('UserProfile', UserProfileSchema);
