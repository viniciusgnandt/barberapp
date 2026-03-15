// controllers/roleController.js — Funções personalizadas

const Role = require('../models/Role');
const User = require('../models/User');

const getBarbershopId = (req) => req.user.barbershop?._id ?? req.user.barbershop;

// GET /api/roles
const getRoles = async (req, res) => {
  try {
    const roles = await Role.find({ barbershop: getBarbershopId(req) });
    res.json({ success: true, data: roles });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/roles
const createRole = async (req, res) => {
  try {
    const { name, color, permissions } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Nome é obrigatório.' });

    const role = await Role.create({ barbershop: getBarbershopId(req), name, color, permissions });
    res.status(201).json({ success: true, data: role });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/roles/:id
const updateRole = async (req, res) => {
  try {
    const role = await Role.findOne({ _id: req.params.id, barbershop: getBarbershopId(req) });
    if (!role) return res.status(404).json({ success: false, message: 'Função não encontrada.' });

    const { name, color, permissions } = req.body;
    if (name)        role.name        = name;
    if (color)       role.color       = color;
    if (permissions) role.permissions = permissions;
    await role.save();

    res.json({ success: true, data: role });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE /api/roles/:id
const deleteRole = async (req, res) => {
  try {
    const role = await Role.findOne({ _id: req.params.id, barbershop: getBarbershopId(req) });
    if (!role) return res.status(404).json({ success: false, message: 'Função não encontrada.' });

    // Remove role from any employees that have it
    await User.updateMany({ customRole: role._id }, { $unset: { customRole: 1 } });
    await Role.deleteOne({ _id: req.params.id });
    res.json({ success: true, message: 'Função removida.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { getRoles, createRole, updateRole, deleteRole };
