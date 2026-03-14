// controllers/appointmentController.js

const Appointment = require('../models/Appointment');
const User        = require('../models/User');
const crypto      = require('crypto');

const populate = (q) =>
  q.populate('service', 'name duration price')
   .populate('barber', 'name email')
   .populate('barbershop', 'name')
   .populate('client', 'name phone email');

// GET /api/appointments
const getAppointments = async (req, res) => {
  try {
    const { status, date, startDate, endDate, barber, type } = req.query;
    const filter = { barbershop: req.user.barbershop._id };

    if (status) filter.status = status;
    if (type)   filter.type   = type;

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
    const {
      type, clientName, client, service, barber, date, endDate, notes,
      allBarbers, recurrence, occurrences,
    } = req.body;
    const isBlock = type === 'block';

    // Validation
    const isAllBarbers = isBlock && allBarbers === true;
    if (!clientName || !date)
      return res.status(400).json({ success: false, message: 'Campos obrigatórios ausentes.' });
    if (!isAllBarbers && !barber)
      return res.status(400).json({ success: false, message: 'Selecione um profissional.' });
    if (!isBlock && !service)
      return res.status(400).json({ success: false, message: 'Serviço é obrigatório para agendamentos.' });

    // Barbeiro só cria para si mesmo
    if (!isBlock && req.user.role === 'barbeiro' && barber !== req.user._id.toString())
      return res.status(403).json({ success: false, message: 'Barbeiros podem criar agendamentos apenas para si mesmos.' });

    // Admin creating block for ALL barbers (e.g. holiday)
    if (isAllBarbers) {
      if (req.user.role !== 'admin')
        return res.status(403).json({ success: false, message: 'Apenas admins podem bloquear para todos.' });

      const employees = await User.find({ barbershop: req.user.barbershop._id });
      const blocks = await Promise.all(employees.map(emp =>
        Appointment.create({
          type: 'block',
          clientName,
          barber:     emp._id,
          barbershop: req.user.barbershop._id,
          date:       new Date(date),
          endDate:    endDate ? new Date(endDate) : undefined,
          status:     'bloqueado',
          notes,
        })
      ));
      return res.status(201).json({ success: true, count: blocks.length, data: blocks });
    }

    // Single-barber block
    if (isBlock) {
      let block = await Appointment.create({
        type: 'block',
        clientName,
        barber,
        barbershop: req.user.barbershop._id,
        date:       new Date(date),
        endDate:    endDate ? new Date(endDate) : undefined,
        status:     'bloqueado',
        notes,
      });
      block = await populate(Appointment.findById(block._id));
      return res.status(201).json({ success: true, data: block });
    }

    // Regular appointment(s)
    const dt  = new Date(date);
    const gap = 30 * 60 * 1000;

    // Conflict detection helper
    const checkConflict = async (targetDate) => {
      const td = new Date(targetDate);

      const apptConflict = await Appointment.findOne({
        barbershop: req.user.barbershop._id,
        barber,
        type: { $ne: 'block' },
        status: 'agendado',
        date: { $gte: new Date(td - gap), $lte: new Date(+td + gap) },
      });

      const activeBlocks = await Appointment.find({
        barbershop: req.user.barbershop._id,
        barber,
        type: 'block',
        date: { $lte: new Date(+td + gap) },
      });
      const blockConflict = activeBlocks.find(b => {
        const blockEnd = b.endDate ? b.endDate.getTime() : b.date.getTime() + gap;
        return td.getTime() >= b.date.getTime() && td.getTime() <= blockEnd;
      });

      return apptConflict || blockConflict;
    };

    // Build list of dates for recurrence
    const rec   = recurrence || 'none';
    const count = Math.min(Math.max(parseInt(occurrences) || 1, 1), 52);

    const dates = [new Date(dt)];
    if (rec !== 'none') {
      for (let i = 1; i < count; i++) {
        const next = new Date(dates[dates.length - 1]);
        if (rec === 'weekly')    next.setDate(next.getDate() + 7);
        if (rec === 'biweekly')  next.setDate(next.getDate() + 14);
        if (rec === 'monthly')   next.setMonth(next.getMonth() + 1);
        dates.push(next);
      }
    }

    // Check first date conflict
    if (await checkConflict(dates[0]))
      return res.status(400).json({ success: false, message: 'Horário indisponível para este barbeiro.' });

    // Create all occurrences
    const groupId = rec !== 'none' ? crypto.randomUUID() : undefined;
    const baseDoc = {
      clientName,
      client: client || undefined,
      service,
      barber,
      barbershop: req.user.barbershop._id,
      notes,
      recurrence: rec,
      recurrenceGroupId: groupId,
    };

    const created = await Promise.all(
      dates.map(d => Appointment.create({ ...baseDoc, date: d }))
    );

    // Populate and return the first (or all)
    const populated = await populate(Appointment.findById(created[0]._id));
    res.status(201).json({
      success: true,
      count: created.length,
      data: populated,
      recurrenceCount: created.length,
    });
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
