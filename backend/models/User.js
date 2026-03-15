// models/User.js

const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name:         { type: String, required: true, trim: true },
  email:        { type: String, required: true, lowercase: true, trim: true },
  password:     { type: String, required: true, minlength: 6 },
  role:         { type: String, enum: ['admin', 'barbeiro'], default: 'barbeiro' },
  barbershop:   { type: mongoose.Schema.Types.ObjectId, ref: 'Barbershop', required: true },
  profileImage: { type: String },
  preferences: {
    themeMode:  { type: String, enum: ['light', 'dark', 'auto'], default: 'light' },
    themeColor: { type: String, default: 'amber' },
    themeFont:  { type: String, default: 'inter' },
  },
  createdAt:    { type: Date, default: Date.now },
});

// Email é único dentro de cada barbershop
userSchema.index({ email: 1, barbershop: 1 }, { unique: true });

// Hash automático antes de salvar
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Comparar senha no login
userSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

module.exports = mongoose.model('User', userSchema);
