const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    minlength: 2,
    maxlength: 80,
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: 6,
    select: false,        // never return password in queries
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user',
  },
  isVerified: { type: Boolean, default: true },
  isSuspended: { type: Boolean, default: false },
  mfaPending: { type: Boolean, default: false },
  mfaCode: { type: String, select: false },
  mfaExpires: { type: Date },
  avatar: { type: String, default: '' },
  lastLogin: { type: Date },
  loginCount: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
});
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});
UserSchema.methods.matchPassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};
UserSchema.methods.generateMfaCode = function () {
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  this.mfaCode = code;
  this.mfaExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
  this.mfaPending = true;
  return code;
};
module.exports = mongoose.model('User', UserSchema);
