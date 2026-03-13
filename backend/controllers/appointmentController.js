// controllers/appointmentController.js

const Appointment = require('../models/Appointment');

const populate = (q) =>
  q.populate('service', 'name duration price')
   .populate('barber', 'name email')
   .populate('barbershop', 'name');

// GET /api/appointments
const getAppointments = async (req, res) => {
  try {
    const { status, date, startDate, endDate, barber } = req.query;
    const filter = { barbershop: req.user.barbershop._id };

    if (status) filter.status = status;

    // Barbeiro só vê seus próprios; admin pode filtrar por barbeiro
    if (req.user.role !== 'admin') {
      filter.barber = req.user._id;
    } else if (barber) {
      filter.barber = barber;
    }

    if (startDate && endDate) {
      filter.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
    } else if (date) {
      const s = new Date(date); s.setHours(0,  0,  0,   0);
      const e = new Date(date); e.setHours(23, 59, 59, 999);
      filter.date = { $gte: s, $lte: e };
    }

    const data = await populate(Appointment.find(filter).sort({ date: 1 }));
    res.json({ success: true, count: data.length, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/appointments
const createAppointment = async (req, res) => {
  try {
    const { clientName, service, barber, date, notes } = req.body;
    if (!clientName || !service || !barber || !date)
      return res.status(400).json({ success: false, message: 'Campos obrigatórios ausentes.' });

    // Barbeiro pode criar agendamento apenas para si mesmo
    if (req.user.role === 'barbeiro' && barber !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Barbeiros podem criar agendamentos apenas para si mesmos.',
      });
    }

    // Verificar conflito de horário (±30 min)
    const dt  = new Date(date);
    const gap = 30 * 60 * 1000;
    const conflict = await Appointment.findOne({
      barbershop: req.user.barbershop._id,
      barber,
      status: 'agendado',
      date: { $gte: new Date(dt - gap), $lte: new Date(+dt + gap) },
    });
    if (conflict)
      return res.status(400).json({ success: false, message: 'Horário indisponível para este barbeiro.' });

    let apt = await Appointment.create({
      clientName,
      service,
      barber,
      barbershop: req.user.barbershop._id,
      date: dt,
      notes,
    });
    apt = await populate(Appointment.findById(apt._id));

    res.status(201).json({ success: true, data: apt });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/appointments/:id
const updateAppointment = async (req, res) => {
  try {
    const apt = await Appointment.findOne({
      _id: req.params.id,
      barbershop: req.user.barbershop._id,
    });
    if (!apt)
      return res.status(404).json({ success: false, message: 'Agendamento não encontrado.' });

    Object.assign(apt, req.body);
    await apt.save();
    const data = await populate(Appointment.findById(apt._id));
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE /api/appointments/:id
const deleteAppointment = async (req, res) => {
  try {
    const data = await Appointment.findOneAndDelete({
      _id: req.params.id,
      barbershop: req.user.barbershop._id,
    });
    if (!data) return res.status(404).json({ success: false, message: 'Agendamento não encontrado.' });
    res.json({ success: true, message: 'Agendamento excluído.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { getAppointments, createAppointment, updateAppointment, deleteAppointment };
