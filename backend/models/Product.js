// models/Product.js

const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name:        { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  brand:       { type: String, trim: true },
  category:    { type: String, enum: ['consumo', 'venda'], required: true },
  unit:        { type: String, enum: ['un', 'ml', 'g', 'l', 'kg', 'cx', 'fr', 'pc'], default: 'un' },
  costPrice:   { type: Number, required: true, min: 0 },
  salePrice:   { type: Number, min: 0 },          // apenas para category='venda'
  stock:       { type: Number, default: 0 },
  minStock:    { type: Number, default: 0 },       // alerta de estoque mínimo
  barbershop:  { type: mongoose.Schema.Types.ObjectId, ref: 'Barbershop', required: true },
  active:      { type: Boolean, default: true },
  createdAt:   { type: Date, default: Date.now },
});

productSchema.index({ barbershop: 1 });

module.exports = mongoose.model('Product', productSchema);
