// models/Client.js

const mongoose = require('mongoose');

const clientSchema = new mongoose.Schema({
  name:      { type: String, required: true, trim: true },
  phone:     { type: String, required: true, trim: true },
  email:     { type: String, trim: true, lowercase: true },
  birthdate: { type: Date },
  address:   { type: String, trim: true },
  notes:     { type: String, trim: true },
  barbershop: { type: mongoose.Schema.Types.ObjectId, ref: 'Barbershop', required: true },
  createdAt:  { type: Date, default: Date.now },
});

clientSchema.index({ barbershop: 1, name: 1 });
clientSchema.index({ barbershop: 1, phone: 1 });

module.exports = mongoose.model('Client', clientSchema);
