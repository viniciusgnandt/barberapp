// controllers/serviceController.js

const Service = require('../models/Service');

const getServices = async (req, res) => {
  try {
    const data = await Service.find({
      barbershop: req.user.barbershop._id,
      active: true,
    }).sort({ name: 1 });
    res.json({ success: true, count: data.length, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const createService = async (req, res) => {
  try {
    const { name, duration, price } = req.body;
    if (!name || !duration || price === undefined)
      return res.status(400).json({ success: false, message: 'Nome, duração e preço são obrigatórios.' });

    const data = await Service.create({
      name,
      duration,
      price,
      barbershop: req.user.barbershop._id,
    });
    res.status(201).json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const updateService = async (req, res) => {
  try {
    const data = await Service.findOneAndUpdate(
      { _id: req.params.id, barbershop: req.user.barbershop._id },
      req.body,
      { new: true, runValidators: true }
    );
    if (!data) return res.status(404).json({ success: false, message: 'Serviço não encontrado.' });
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const deleteService = async (req, res) => {
  try {
    const data = await Service.findOneAndUpdate(
      { _id: req.params.id, barbershop: req.user.barbershop._id },
      { active: false },
      { new: true }
    );
    if (!data) return res.status(404).json({ success: false, message: 'Serviço não encontrado.' });
    res.json({ success: true, message: 'Serviço removido.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { getServices, createService, updateService, deleteService };
