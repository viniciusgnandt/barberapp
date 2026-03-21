// models/PlatformAdmin.js — Platform-level administrator (separate from tenant users)

const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const platformAdminSchema = new mongoose.Schema({
  name:     { type: String, required: true, trim: true },
  email:    { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true, select: false },
  role:     { type: String, enum: ['superadmin', 'admin'], default: 'admin' },
  active:   { type: Boolean, default: true },

  // Email-based 2FA
  twoFactorCode:    { type: String, select: false },
  twoFactorExpires: { type: Date,   select: false },

  // Invite system
  inviteToken:   { type: String },
  inviteExpires: { type: Date },
  inviteAccepted: { type: Boolean, default: false },

  lastLoginAt: { type: Date },
  createdBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'PlatformAdmin' },
}, { timestamps: true });

platformAdminSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

platformAdminSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

module.exports = mongoose.model('PlatformAdmin', platformAdminSchema);
