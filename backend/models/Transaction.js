// models/Transaction.js — Financial entries (income/expense)

const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  barbershop:   { type: mongoose.Schema.Types.ObjectId, ref: 'Barbershop', required: true },
  cashRegister: { type: mongoose.Schema.Types.ObjectId, ref: 'CashRegister' },
  type:         { type: String, enum: ['entrada', 'saida'], required: true },
  category:     { type: String, enum: ['servico', 'produto', 'comissao', 'despesa', 'ajuste', 'outros'], default: 'outros' },
  amount:       { type: Number, required: true },
  description:  { type: String, trim: true },
  appointment:  { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment' },
  client:       { type: mongoose.Schema.Types.ObjectId, ref: 'Client' },
  barber:       { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  tab:          { type: mongoose.Schema.Types.ObjectId, ref: 'Tab' },
  paymentMethod: { type: String, enum: ['dinheiro', 'pix', 'debito', 'credito', 'outro'], default: 'dinheiro' },
  createdBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

transactionSchema.index({ barbershop: 1, createdAt: -1 });
transactionSchema.index({ barbershop: 1, cashRegister: 1 });
transactionSchema.index({ barbershop: 1, type: 1 });

module.exports = mongoose.model('Transaction', transactionSchema);
