// models/Commission.js — Barber commission tracking

const mongoose = require('mongoose');

const commissionSchema = new mongoose.Schema({
  barbershop:       { type: mongoose.Schema.Types.ObjectId, ref: 'Barbershop', required: true },
  barber:           { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  appointment:      { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment' },
  tab:              { type: mongoose.Schema.Types.ObjectId, ref: 'Tab' },
  service:          { type: mongoose.Schema.Types.ObjectId, ref: 'Service' },
  serviceName:      { type: String },
  serviceAmount:    { type: Number, required: true },
  commissionRate:   { type: Number, required: true, min: 0, max: 100 },
  commissionAmount: { type: Number, required: true },
  status:           { type: String, enum: ['pendente', 'pago'], default: 'pendente' },
  paidAt:           { type: Date },
  paidBy:           { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  discount:         { type: Number, default: 0 },
  discountReason:   { type: String, trim: true },
}, { timestamps: true });

commissionSchema.index({ barbershop: 1, barber: 1, status: 1 });
commissionSchema.index({ barbershop: 1, createdAt: -1 });

module.exports = mongoose.model('Commission', commissionSchema);
