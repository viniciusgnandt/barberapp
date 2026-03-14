// models/Coupon.js

const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
  code:       { type: String, required: true, unique: true, uppercase: true, trim: true },
  daysToAdd:  { type: Number, required: true, min: 1 }, // days to extend expiration
  maxUses:    { type: Number, default: null },           // null = unlimited
  active:     { type: Boolean, default: true },
  usedBy: [{
    barbershop: { type: mongoose.Schema.Types.ObjectId, ref: 'Barbershop' },
    usedAt:     { type: Date, default: Date.now },
  }],
}, { timestamps: true });

module.exports = mongoose.model('Coupon', couponSchema);
