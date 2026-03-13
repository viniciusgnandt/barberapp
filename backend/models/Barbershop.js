// models/Barbershop.js — Modelo de Barbearia (Tenant)

const mongoose = require('mongoose');

const barbershopSchema = new mongoose.Schema({
  name:         { type: String, required: true, trim: true },
  email:        { type: String, required: true, lowercase: true, trim: true },
  phone:        { type: String, trim: true },
  address:      { type: String, trim: true },
  city:         { type: String, trim: true },
  state:        { type: String, trim: true },
  zipCode:      { type: String, trim: true },
  logo:         { type: String },                          // URL da logo
  description:  { type: String, trim: true },
  owner:        { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  status:       { type: String, enum: ['active', 'inactive'], default: 'active' },
  createdAt:    { type: Date, default: Date.now },
  updatedAt:    { type: Date, default: Date.now },
});

module.exports = mongoose.model('Barbershop', barbershopSchema);
