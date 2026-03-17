// models/Appointment.js

const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
  type:       { type: String, enum: ['appointment', 'block'], default: 'appointment' },
  clientName: { type: String, required: true, trim: true },
  client:     { type: mongoose.Schema.Types.ObjectId, ref: 'Client' },
  service:    { type: mongoose.Schema.Types.ObjectId, ref: 'Service' },
  barber:     { type: mongoose.Schema.Types.ObjectId, ref: 'User',    required: true },
  barbershop: { type: mongoose.Schema.Types.ObjectId, ref: 'Barbershop', required: true },
  date:       { type: Date, required: true },
  endDate:    { type: Date },
  status:     { type: String, enum: ['agendado', 'concluído', 'cancelado', 'bloqueado'], default: 'agendado' },
  notes:      { type: String, trim: true },
  recurrence: { type: String, enum: ['none', 'weekly', 'biweekly', 'monthly'], default: 'none' },
  recurrenceGroupId: { type: String },
  portalClientId: { type: mongoose.Schema.Types.ObjectId, ref: 'ClientUser' },
  source:         { type: String, enum: ['manual', 'portal'], default: 'manual' },
  createdAt:  { type: Date, default: Date.now },
});

appointmentSchema.index({ barbershop: 1, date: 1 });

module.exports = mongoose.model('Appointment', appointmentSchema);
