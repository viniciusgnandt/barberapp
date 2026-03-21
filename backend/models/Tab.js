// models/Tab.js — Comandas (service tabs)

const mongoose = require('mongoose');

const tabItemSchema = new mongoose.Schema({
  type:      { type: String, enum: ['servico', 'produto'], required: true },
  service:   { type: mongoose.Schema.Types.ObjectId, ref: 'Service' },
  product:   { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  name:      { type: String, required: true },
  quantity:  { type: Number, default: 1, min: 1 },
  unitPrice: { type: Number, required: true },
  total:     { type: Number, required: true },
}, { _id: true });

const tabSchema = new mongoose.Schema({
  barbershop:    { type: mongoose.Schema.Types.ObjectId, ref: 'Barbershop', required: true },
  client:        { type: mongoose.Schema.Types.ObjectId, ref: 'Client' },
  clientName:    { type: String, trim: true },
  barber:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  items:         [tabItemSchema],
  subtotal:      { type: Number, default: 0 },
  discount:      { type: Number, default: 0 },
  total:         { type: Number, default: 0 },
  status:        { type: String, enum: ['aberta', 'finalizada', 'cancelada'], default: 'aberta' },
  paymentMethod: { type: String, enum: ['dinheiro', 'pix', 'debito', 'credito', 'outro'] },
  closedAt:      { type: Date },
  closedBy:      { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  appointment:   { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment' },
}, { timestamps: true });

tabSchema.index({ barbershop: 1, status: 1 });
tabSchema.index({ barbershop: 1, createdAt: -1 });

module.exports = mongoose.model('Tab', tabSchema);
