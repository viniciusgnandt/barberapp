// models/ReceptionSession.js

const mongoose = require('mongoose');

const receptionSessionSchema = new mongoose.Schema({
  barbershop:  { type: mongoose.Schema.Types.ObjectId, ref: 'Barbershop', required: true, unique: true },
  status:      { type: String, enum: ['disconnected', 'connecting', 'connected'], default: 'disconnected' },
  phone:       { type: String },
  connectedAt: { type: Date },
}, { timestamps: true });

module.exports = mongoose.model('ReceptionSession', receptionSessionSchema);
