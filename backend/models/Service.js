// models/Service.js

const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema({
  name:        { type: String, required: true, trim: true },
  duration:    { type: Number, required: true, min: 5 },
  price:       { type: Number, required: true, min: 0 },
  description: { type: String, trim: true },
  icon:        { type: String, trim: true }, // 'preset:<key>' or OCI URL
  active:      { type: Boolean, default: true },
  barbershop:  { type: mongoose.Schema.Types.ObjectId, ref: 'Barbershop', required: true },
  createdAt:   { type: Date, default: Date.now },
});

serviceSchema.index({ barbershop: 1 });

module.exports = mongoose.model('Service', serviceSchema);
