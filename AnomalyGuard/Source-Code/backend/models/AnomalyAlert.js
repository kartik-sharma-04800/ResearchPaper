const mongoose = require('mongoose');
const AnomalyAlertSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  loginEventId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LoginEvent',
  },
  severity:    { type: String, enum: ['low', 'high'], required: true },
  score:       { type: Number, required: true },
  reasons:     [{ type: String }],
  action: {
    type: String,
    enum: ['mfa_triggered', 'session_invalidated', 'flagged', 'none'],
    default: 'none',
  },
  emailSent:   { type: Boolean, default: false },
  resolved:    { type: Boolean, default: false },
  resolvedAt:  { type: Date },
  resolvedBy:  { type: String },  
  snapshot: {
    ipAddress: String,
    country:   String,
    city:      String,
    device:    String,
    browser:   String,
  },
  createdAt: { type: Date, default: Date.now, index: true },
});
module.exports = mongoose.model('AnomalyAlert', AnomalyAlertSchema);
