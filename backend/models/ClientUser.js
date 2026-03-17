// models/ClientUser.js
const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const clientUserSchema = new mongoose.Schema({
  name:         { type: String, required: true, trim: true },
  phone:        { type: String, required: true, unique: true, trim: true },
  password:     { type: String, required: true },
  profileImage: { type: String },
  preferences: {
    themeMode: { type: String, enum: ['light', 'dark', 'auto'], default: 'auto' },
  },
  resetCode:        { type: String },
  resetCodeExpires: { type: Date },
  createdAt: { type: Date, default: Date.now },
});

clientUserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

clientUserSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

module.exports = mongoose.model('ClientUser', clientUserSchema);
