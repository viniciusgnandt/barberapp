// models/ServiceCategory.js

const mongoose = require('mongoose');

const serviceCategorySchema = new mongoose.Schema({
  name:       { type: String, required: true, trim: true },
  color:      { type: String, default: '#6366f1' },
  order:      { type: Number, default: 0 },
  barbershop: { type: mongoose.Schema.Types.ObjectId, ref: 'Barbershop', required: true },
  createdAt:  { type: Date, default: Date.now },
});

serviceCategorySchema.index({ barbershop: 1, order: 1 });

module.exports = mongoose.model('ServiceCategory', serviceCategorySchema);
