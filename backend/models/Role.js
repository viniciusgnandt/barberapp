// models/Role.js — Funções personalizadas por tenant

const mongoose = require('mongoose');

const permBase = { view: { type: Boolean, default: false }, edit: { type: Boolean, default: false } };

const roleSchema = new mongoose.Schema({
  barbershop: { type: mongoose.Schema.Types.ObjectId, ref: 'Barbershop', required: true },
  name:       { type: String, required: true, trim: true },
  color:      { type: String, default: '#6b7280' },
  permissions: {
    dashboard: { view: { type: Boolean, default: true  }, edit: { type: Boolean, default: false } },
    agenda:    {
      view:                { type: Boolean, default: true  },
      edit:                { type: Boolean, default: true  },
      receiveAppointments: { type: Boolean, default: true  },
    },
    services:  { view: { type: Boolean, default: true  }, edit: { type: Boolean, default: false } },
    clients:   { view: { type: Boolean, default: true  }, edit: { type: Boolean, default: false } },
    sales:     { view: { type: Boolean, default: false }, edit: { type: Boolean, default: false } },
    stock:     { view: { type: Boolean, default: false }, edit: { type: Boolean, default: false } },
    reports:   { view: { type: Boolean, default: false }, edit: { type: Boolean, default: false } },
    business:  { view: { type: Boolean, default: false }, edit: { type: Boolean, default: false } },
    reception: { view: { type: Boolean, default: false }, edit: { type: Boolean, default: false } },
  },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Role', roleSchema);
