// models/Appointment.js

const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
  clientName: { type: String, required: true, trim: true },
  service:    { type: mongoose.Schema.Types.ObjectId, ref: 'Service', required: true },
  barber:     { type: mongoose.Schema.Types.ObjectId, ref: 'User',    required: true },
  barbershop: { type: mongoose.Schema.Types.ObjectId, ref: 'Barbershop', required: true },
  date:       { type: Date, required: true },
  status:     { type: String, enum: ['agendado', 'concluído', 'cancelado'], default: 'agendado' },
  notes:      { type: String, trim: true },
  createdAt:  { type: Date, default: Date.now },
});

appointmentSchema.index({ barbershop: 1, date: 1 });

module.exports = mongoose.model('Appointment', appointmentSchema);
