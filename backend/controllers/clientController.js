// controllers/clientController.js

const Client = require('../models/Client');

// GET /api/clients?search=
const getClients = async (req, res) => {
  try {
    const { search } = req.query;
    const filter = { barbershop: req.user.barbershop._id };

    if (search) {
      const re = new RegExp(search, 'i');
      filter.$or = [{ name: re }, { phone: re }, { email: re }];
    }

    const data = await Client.find(filter).sort({ name: 1 }).limit(100);
    res.json({ success: true, count: data.length, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/clients/:id
const getClient = async (req, res) => {
  try {
    const data = await Client.findOne({
      _id: req.params.id,
      barbershop: req.user.barbershop._id,
    });
    if (!data) return res.status(404).json({ success: false, message: 'Cliente não encontrado.' });
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/clients
const createClient = async (req, res) => {
  try {
    const { name, phone, email, birthdate, address, notes } = req.body;
    if (!name || !phone)
      return res.status(400).json({ success: false, message: 'Nome e telefone são obrigatórios.' });

    const data = await Client.create({
      name, phone, email, birthdate, address, notes,
      barbershop: req.user.barbershop._id,
    });
    res.status(201).json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/clients/:id
const updateClient = async (req, res) => {
  try {
    const client = await Client.findOne({
      _id: req.params.id,
      barbershop: req.user.barbershop._id,
    });
    if (!client) return res.status(404).json({ success: false, message: 'Cliente não encontrado.' });

    const allowed = ['name', 'phone', 'email', 'birthdate', 'address', 'notes'];
    allowed.forEach(f => { if (req.body[f] !== undefined) client[f] = req.body[f]; });
    await client.save();
    res.json({ success: true, data: client });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE /api/clients/:id
const deleteClient = async (req, res) => {
  try {
    const data = await Client.findOneAndDelete({
      _id: req.params.id,
      barbershop: req.user.barbershop._id,
    });
    if (!data) return res.status(404).json({ success: false, message: 'Cliente não encontrado.' });
    res.json({ success: true, message: 'Cliente removido.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { getClients, getClient, createClient, updateClient, deleteClient };
