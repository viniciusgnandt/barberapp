// controllers/barbershopController.js — Gerenciamento de Barbearias (Tenants)

const Barbershop = require('../models/Barbershop');

// GET /api/barbershops - Listar barbearias do usuário
const getBarbershops = async (req, res) => {
  try {
    const barbershops = await Barbershop.find({ owner: req.user._id });
    res.json({ success: true, count: barbershops.length, data: barbershops });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/barbershops/:id - Obter uma barbearia
const getBarbershop = async (req, res) => {
  try {
    const barbershop = await Barbershop.findOne({ _id: req.params.id, owner: req.user._id });
    if (!barbershop)
      return res.status(404).json({ success: false, message: 'Barbearia não encontrada.' });

    res.json({ success: true, data: barbershop });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/barbershops - Criar nova barbearia
const createBarbershop = async (req, res) => {
  try {
    const { name, email, phone, address, city, state, zipCode, description } = req.body;
    if (!name || !email)
      return res.status(400).json({ success: false, message: 'Nome e email são obrigatórios.' });

    const barbershop = await Barbershop.create({
      name,
      email,
      phone,
      address,
      city,
      state,
      zipCode,
      description,
      owner: req.user._id,
    });

    res.status(201).json({ success: true, data: barbershop });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/barbershops/:id - Atualizar barbearia
const updateBarbershop = async (req, res) => {
  try {
    const barbershop = await Barbershop.findOne({ _id: req.params.id, owner: req.user._id });
    if (!barbershop)
      return res.status(404).json({ success: false, message: 'Barbearia não encontrada.' });

    Object.assign(barbershop, req.body);
    barbershop.updatedAt = new Date();
    await barbershop.save();

    res.json({ success: true, data: barbershop });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE /api/barbershops/:id - Deletar barbearia
const deleteBarbershop = async (req, res) => {
  try {
    const barbershop = await Barbershop.findOne({ _id: req.params.id, owner: req.user._id });
    if (!barbershop)
      return res.status(404).json({ success: false, message: 'Barbearia não encontrada.' });

    await Barbershop.deleteOne({ _id: req.params.id });
    res.json({ success: true, message: 'Barbearia deletada.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/barbershops/:id/employees - Listar funcionários de uma barbearia
const getBarbershopEmployees = async (req, res) => {
  try {
    const barbershop = await Barbershop.findOne({ _id: req.params.id, owner: req.user._id });
    if (!barbershop)
      return res.status(404).json({ success: false, message: 'Barbearia não encontrada.' });

    const User = require('../models/User');
    const employees = await User.find({ barbershop: req.params.id }).select('-password');

    res.json({ success: true, count: employees.length, data: employees });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  getBarbershops,
  getBarbershop,
  createBarbershop,
  updateBarbershop,
  deleteBarbershop,
  getBarbershopEmployees,
};
