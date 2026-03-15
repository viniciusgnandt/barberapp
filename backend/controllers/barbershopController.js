// controllers/barbershopController.js — Gerenciamento de Barbearias (Tenants)

const Barbershop = require('../models/Barbershop');
const User       = require('../models/User');
const bcrypt     = require('bcryptjs');

// GET /api/barbershops — Listar barbearias do usuário (owner)
const getBarbershops = async (req, res) => {
  try {
    const barbershops = await Barbershop.find({ owner: req.user._id });
    res.json({ success: true, count: barbershops.length, data: barbershops });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/barbershops/mine — Retorna a barbearia do usuário logado (qualquer role)
const getMyBarbershop = async (req, res) => {
  try {
    const barbershopId = req.user.barbershop?._id ?? req.user.barbershop;
    const barbershop   = await Barbershop.findById(barbershopId);
    if (!barbershop)
      return res.status(404).json({ success: false, message: 'Barbearia não encontrada.' });

    res.json({ success: true, data: barbershop });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/barbershops/:id — Obter uma barbearia
const getBarbershop = async (req, res) => {
  try {
    const barbershop = await Barbershop.findById(req.params.id);
    if (!barbershop)
      return res.status(404).json({ success: false, message: 'Barbearia não encontrada.' });

    res.json({ success: true, data: barbershop });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/barbershops — Criar nova barbearia
const createBarbershop = async (req, res) => {
  try {
    const { name, email, phone, address, city, state, zipCode, description } = req.body;
    if (!name || !email)
      return res.status(400).json({ success: false, message: 'Nome e email são obrigatórios.' });

    const barbershop = await Barbershop.create({
      name, email, phone, address, city, state, zipCode, description,
      owner: req.user._id,
    });

    res.status(201).json({ success: true, data: barbershop });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/barbershops/:id — Atualizar barbearia
const updateBarbershop = async (req, res) => {
  try {
    const barbershop = await Barbershop.findById(req.params.id);
    if (!barbershop)
      return res.status(404).json({ success: false, message: 'Barbearia não encontrada.' });

    const allowed = ['name', 'email', 'document', 'phone', 'address', 'city', 'state', 'zipCode', 'description', 'openingHours'];
    allowed.forEach(k => { if (req.body[k] !== undefined) barbershop[k] = req.body[k]; });
    barbershop.updatedAt = new Date();
    await barbershop.save();

    res.json({ success: true, data: barbershop });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE /api/barbershops/:id — Deletar barbearia
const deleteBarbershop = async (req, res) => {
  try {
    const barbershop = await Barbershop.findById(req.params.id);
    if (!barbershop)
      return res.status(404).json({ success: false, message: 'Barbearia não encontrada.' });

    await Barbershop.deleteOne({ _id: req.params.id });
    res.json({ success: true, message: 'Barbearia deletada.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/barbershops/:id/employees — Listar funcionários
const getBarbershopEmployees = async (req, res) => {
  try {
    const employees = await User.find({ barbershop: req.params.id })
      .select('-password')
      .populate('customRole', 'name color');
    res.json({ success: true, count: employees.length, data: employees });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/barbershops/:id/employees — Criar funcionário
const createEmployee = async (req, res) => {
  try {
    const { id: barbershopId } = req.params;
    const { name, email, password, customRole } = req.body;

    if (!name || !email || !password)
      return res.status(400).json({ success: false, message: 'Nome, email e senha são obrigatórios.' });
    if (password.length < 6)
      return res.status(400).json({ success: false, message: 'Senha mínima: 6 caracteres.' });
    if (await User.findOne({ email, barbershop: barbershopId }))
      return res.status(400).json({ success: false, message: 'Email já cadastrado nesta barbearia.' });

    const user = await User.create({
      name, email, password,
      role: 'barbeiro',
      barbershop: barbershopId,
      customRole: customRole || undefined,
    });

    const populated = await User.findById(user._id).select('-password').populate('customRole', 'name color');
    res.status(201).json({ success: true, data: populated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/barbershops/:id/employees/:userId/reset-password — Resetar senha
const resetEmployeePassword = async (req, res) => {
  try {
    const { id: barbershopId, userId } = req.params;
    const { password } = req.body;

    if (!password || password.length < 6)
      return res.status(400).json({ success: false, message: 'Senha mínima: 6 caracteres.' });

    const employee = await User.findOne({ _id: userId, barbershop: barbershopId });
    if (!employee)
      return res.status(404).json({ success: false, message: 'Funcionário não encontrado.' });

    employee.password = password; // hashed by pre-save hook
    await employee.save();
    res.json({ success: true, message: 'Senha resetada com sucesso.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/barbershops/:id/employees/:userId/role — Alterar role/customRole
const updateEmployeeRole = async (req, res) => {
  try {
    const { id: barbershopId, userId } = req.params;
    const { role, customRole } = req.body;

    if (String(userId) === String(req.user._id))
      return res.status(400).json({ success: false, message: 'Você não pode alterar sua própria função.' });

    const employee = await User.findOne({ _id: userId, barbershop: barbershopId });
    if (!employee)
      return res.status(404).json({ success: false, message: 'Funcionário não encontrado.' });

    if (role && ['admin', 'barbeiro'].includes(role)) employee.role = role;
    employee.customRole = customRole || undefined;
    await employee.save();

    const updated = await User.findById(userId).select('-password').populate('customRole', 'name color');
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE /api/barbershops/:id/employees/:userId — Remover funcionário
const removeEmployee = async (req, res) => {
  try {
    const { id: barbershopId, userId } = req.params;

    if (String(userId) === String(req.user._id))
      return res.status(400).json({ success: false, message: 'Você não pode remover a si mesmo.' });

    const employee = await User.findOne({ _id: userId, barbershop: barbershopId });
    if (!employee)
      return res.status(404).json({ success: false, message: 'Funcionário não encontrado.' });

    await User.deleteOne({ _id: userId });
    res.json({ success: true, message: 'Funcionário removido.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  getBarbershops, getMyBarbershop, getBarbershop,
  createBarbershop, updateBarbershop, deleteBarbershop,
  getBarbershopEmployees, createEmployee, resetEmployeePassword, updateEmployeeRole, removeEmployee,
};
