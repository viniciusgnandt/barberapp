// models/Client.js

const mongoose = require('mongoose');

const clientSchema = new mongoose.Schema({
  name:      { type: String, required: true, trim: true },
  phone:     { type: String, required: true, trim: true },
  email:     { type: String, trim: true, lowercase: true },
  birthdate: { type: Date },
  address:   { type: String, trim: true },
  notes:     { type: String, trim: true },
  clientUser: { type: mongoose.Schema.Types.ObjectId, ref: 'ClientUser' }, // linked portal account
  barbershop: { type: mongoose.Schema.Types.ObjectId, ref: 'Barbershop', required: true },
  createdAt:  { type: Date, default: Date.now },
});

// Always store phone as digits only — prevents duplicates across formats (e.g. "(11) 99999" vs "11999999")
clientSchema.pre('save', function (next) {
  if (this.phone) this.phone = this.phone.replace(/\D/g, '');
  next();
});

clientSchema.index({ barbershop: 1, name: 1 });
clientSchema.index({ barbershop: 1, phone: 1 }, { unique: true });

module.exports = mongoose.model('Client', clientSchema);
