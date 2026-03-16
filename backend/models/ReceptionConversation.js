// models/ReceptionConversation.js

const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  role:      { type: String, enum: ['user', 'assistant'], required: true },
  content:   { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
}, { _id: false });

const receptionConversationSchema = new mongoose.Schema({
  barbershop:    { type: mongoose.Schema.Types.ObjectId, ref: 'Barbershop', required: true },
  contactPhone:  { type: String, required: true },
  contactName:   { type: String },
  messages:      { type: [messageSchema], default: [] },
  lastMessageAt: { type: Date },
}, { timestamps: true });

receptionConversationSchema.index({ barbershop: 1, contactPhone: 1 }, { unique: true });

module.exports = mongoose.model('ReceptionConversation', receptionConversationSchema);
