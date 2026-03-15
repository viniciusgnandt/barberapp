// models/StockMovement.js

const mongoose = require('mongoose');

const stockMovementSchema = new mongoose.Schema({
  product:    { type: mongoose.Schema.Types.ObjectId, ref: 'Product',    required: true },
  barbershop: { type: mongoose.Schema.Types.ObjectId, ref: 'Barbershop', required: true },
  type:       { type: String, enum: ['entrada', 'saida', 'venda', 'ajuste'], required: true },
  quantity:   { type: Number, required: true },   // magnitude; direção pelo type
  unitCost:   { type: Number, default: 0 },        // custo unitário no momento
  unitPrice:  { type: Number, default: 0 },        // preço de venda (type='venda')
  notes:      { type: String, trim: true },
  createdBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt:  { type: Date, default: Date.now },
});

stockMovementSchema.index({ barbershop: 1, createdAt: -1 });
stockMovementSchema.index({ product: 1 });

module.exports = mongoose.model('StockMovement', stockMovementSchema);
