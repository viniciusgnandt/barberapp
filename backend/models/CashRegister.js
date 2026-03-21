// models/CashRegister.js — Cash register open/close per barbershop

const mongoose = require('mongoose');

const cashRegisterSchema = new mongoose.Schema({
  barbershop:     { type: mongoose.Schema.Types.ObjectId, ref: 'Barbershop', required: true },
  openedBy:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  closedBy:       { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  openedAt:       { type: Date, default: Date.now },
  closedAt:       { type: Date },
  openingBalance: { type: Number, default: 0 },
  closingBalance: { type: Number },
  status:         { type: String, enum: ['open', 'closed'], default: 'open' },
  notes:          { type: String, trim: true },
}, { timestamps: true });

cashRegisterSchema.index({ barbershop: 1, status: 1 });
cashRegisterSchema.index({ barbershop: 1, openedAt: -1 });

module.exports = mongoose.model('CashRegister', cashRegisterSchema);
