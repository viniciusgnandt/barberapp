// controllers/clientController.js

const Client      = require('../models/Client');
const Appointment = require('../models/Appointment');

// Helper: vincula todos os agendamentos sem client que tenham o mesmo clientName
async function linkAppointments(client) {
  const nameRe = new RegExp(`^${client.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
  await Appointment.updateMany(
    { barbershop: client.barbershop, $or: [{ client: null }, { client: { $exists: false } }], clientName: nameRe },
    { $set: { client: client._id } }
  );
}

// Helper: sincroniza clientName em todos os agendamentos vinculados
async function syncName(clientId, newName) {
  await Appointment.updateMany(
    { client: clientId },
    { $set: { clientName: newName } }
  );
}

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

    const barbershop = req.user.barbershop._id;

    // Se já existe cliente com mesmo telefone, apenas atualiza o nome
    const existing = await Client.findOne({ barbershop, phone: phone.replace(/\D/g, '') });
    if (existing) {
      existing.name = name;
      if (email     !== undefined) existing.email     = email;
      if (birthdate !== undefined) existing.birthdate = birthdate;
      if (address   !== undefined) existing.address   = address;
      if (notes     !== undefined) existing.notes     = notes;
      await existing.save();
      await syncName(existing._id, name);
      await linkAppointments(existing);
      return res.status(200).json({ success: true, data: existing, merged: true });
    }

    const data = await Client.create({ name, phone, email, birthdate, address, notes, barbershop });

    // Vincula agendamentos existentes com o mesmo nome
    await linkAppointments(data);

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

    // Sincroniza nome nos agendamentos vinculados e vincula novos pelo nome
    await syncName(client._id, client.name);
    await linkAppointments(client);

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

// GET /api/clients/:id/appointments
const getClientAppointments = async (req, res) => {
  try {
    const client = await Client.findOne({
      _id: req.params.id,
      barbershop: req.user.barbershop._id,
    });
    if (!client) return res.status(404).json({ success: false, message: 'Cliente não encontrado.' });

    // Vincula agendamentos órfãos antes de retornar
    await linkAppointments(client);

    const data = await Appointment.find({
      barbershop: req.user.barbershop._id,
      type: { $ne: 'block' },
      client: client._id,
    })
      .populate('service', 'name duration price')
      .populate('barber', 'name')
      .sort({ date: -1 });

    res.json({ success: true, count: data.length, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/clients/rectify — vincula todos os agendamentos órfãos da barbearia
const rectifyAppointments = async (req, res) => {
  try {
    const barbershop = req.user.barbershop._id;
    const clients    = await Client.find({ barbershop });
    let   linked     = 0;

    for (const client of clients) {
      const nameRe = new RegExp(`^${client.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
      const result = await Appointment.updateMany(
        { barbershop, $or: [{ client: null }, { client: { $exists: false } }], clientName: nameRe },
        { $set: { client: client._id } }
      );
      linked += result.modifiedCount || 0;
    }

    res.json({ success: true, linked });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { getClients, getClient, createClient, updateClient, deleteClient, getClientAppointments, rectifyAppointments };
