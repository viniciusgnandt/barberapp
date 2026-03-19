// models/Barbershop.js — Modelo de Barbearia (Tenant)

const mongoose = require('mongoose');

const invoiceSchema = new mongoose.Schema({
  description:     { type: String },
  amount:          { type: Number, default: 0 },
  status:          { type: String, enum: ['paid', 'pending', 'failed'], default: 'paid' },
  paidAt:          { type: Date },
  card:            { type: String }, // last 4 digits
  stripeSessionId: { type: String }, // Stripe Checkout session ID (for deduplication)
}, { timestamps: true });

const openingHourSchema = new mongoose.Schema({
  day:   { type: Number, min: 0, max: 6, required: true }, // 0=Dom, 1=Seg, ..., 6=Sáb
  open:  { type: Boolean, default: true },
  from:  { type: String, default: '09:00' }, // "HH:MM"
  to:    { type: String, default: '18:00' },
}, { _id: false });

const barbershopSchema = new mongoose.Schema({
  name:                { type: String, required: true, trim: true },
  email:               { type: String, required: true, lowercase: true, trim: true },
  establishmentType:   { type: String, enum: ['barbearia', 'salao', 'manicure', 'sobrancelha', 'cilios', 'outros'], default: 'barbearia' },
  document:     { type: String, trim: true }, // CPF ou CNPJ
  phone:        { type: String, trim: true },
  address:      { type: String, trim: true }, // Rua + número + complemento
  neighborhood: { type: String, trim: true },
  city:         { type: String, trim: true },
  state:        { type: String, trim: true },
  zipCode:      { type: String, trim: true },
  logo:         { type: String },
  description:  { type: String, trim: true },
  owner:        { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  status:       { type: String, enum: ['active', 'inactive'], default: 'active' },
  openingHours: {
    type: [openingHourSchema],
    default: () => [
      { day: 0, open: false, from: '09:00', to: '18:00' }, // Dom
      { day: 1, open: true,  from: '09:00', to: '18:00' }, // Seg
      { day: 2, open: true,  from: '09:00', to: '18:00' }, // Ter
      { day: 3, open: true,  from: '09:00', to: '18:00' }, // Qua
      { day: 4, open: true,  from: '09:00', to: '18:00' }, // Qui
      { day: 5, open: true,  from: '09:00', to: '18:00' }, // Sex
      { day: 6, open: true,  from: '09:00', to: '13:00' }, // Sáb
    ],
  },
  // Billing
  plan:             { type: String, enum: ['trial', 'free', 'basic', 'pro', 'premium'], default: 'trial' },
  planStatus:       { type: String, enum: ['active', 'expired', 'cancelled'], default: 'active' },
  planExpiresAt:    { type: Date },
  invoices:         { type: [invoiceSchema], default: [] },
  stripeCustomerId: { type: String, select: false }, // Stripe customer ID

  // Pacotes de mensagens adicionais
  messagePackages: [{
    messages:    { type: Number, default: 1000 },
    remaining:   { type: Number, default: 1000 },
    recurring:   { type: Boolean, default: false },
    purchasedAt: { type: Date, default: Date.now },
    expiresAt:   { type: Date },
  }],

  location: {
    type:        { type: String, enum: ['Point'] },
    coordinates: { type: [Number] }, // [longitude, latitude]
  },

  notifications: {
    enabled: { type: Boolean, default: false },
    items:   [{
      leadTime: { type: Number, default: 1 },
      leadUnit: { type: String, enum: ['minutos', 'horas', 'dias'], default: 'horas' },
    }],
  },

  createdAt:    { type: Date, default: Date.now },
  updatedAt:    { type: Date, default: Date.now },
});

barbershopSchema.index({ location: '2dsphere' }, { sparse: true });

module.exports = mongoose.model('Barbershop', barbershopSchema);
