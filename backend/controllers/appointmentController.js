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
      // Brazil is UTC-3: midnight BRT = 03:00 UTC, end-of-day BRT = next day 02:59:59 UTC
      const BRT_OFFSET_MS = 3 * 60 * 60 * 1000;
      filter.date = {
        $gte: new Date(new Date(date + 'T00:00:00.000Z').getTime() + BRT_OFFSET_MS),
        $lte: new Date(new Date(date + 'T23:59:59.999Z').getTime() + BRT_OFFSET_MS),
      };
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
    const dt = new Date(date);

    // Load service to get duration
    const Service = require('../models/Service');
    const svc = await Service.findById(service);
    const durationMs = (svc?.duration || 30) * 60 * 1000;

    // Conflict detection: checks if [newStart, newEnd) overlaps any existing appointment or block
    const checkConflict = async (newStart, excludeId = null) => {
      const newEnd = new Date(+newStart + durationMs);

      // Regular appointment overlap: existing.start < newEnd AND existing.end > newStart
      const apptFilter = {
        barbershop: req.user.barbershop._id,
        barber,
        type: { $ne: 'block' },
        status: 'agendado',
        date: { $lt: newEnd },
      };
      if (excludeId) apptFilter._id = { $ne: excludeId };

      const existingAppts = await Appointment.find(apptFilter).populate('service', 'duration');
      const apptConflict = existingAppts.find(a => {
        const aDur = (a.service?.duration || 30) * 60 * 1000;
        const aEnd = new Date(+a.date + aDur);
        return aEnd > newStart;
      });

      // Block overlap
      const blocks = await Appointment.find({
        barbershop: req.user.barbershop._id,
        barber,
        type: 'block',
        date: { $lt: newEnd },
        ...(excludeId ? { _id: { $ne: excludeId } } : {}),
      });
      const blockConflict = blocks.find(b => {
        const bEnd = b.endDate ? b.endDate.getTime() : b.date.getTime() + durationMs;
        return bEnd > newStart.getTime();
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

    // Check conflicts for all occurrences
    for (const d of dates) {
      if (await checkConflict(d))
        return res.status(400).json({ success: false, message: 'Horário indisponível para este barbeiro.' });
    }

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

    // Conflict check when date or barber changes (skip for blocks and non-pending)
    const isBlock = (req.body.type || apt.type) === 'block';
    if (!isBlock && (req.body.date || req.body.barber)) {
      const Service = require('../models/Service');
      const newDate    = req.body.date   ? new Date(req.body.date)   : apt.date;
      const newBarber  = req.body.barber || apt.barber?.toString();
      const newService = req.body.service || apt.service?.toString();
      const svc        = await Service.findById(newService);
      const durationMs = (svc?.duration || 30) * 60 * 1000;
      const newEnd     = new Date(+newDate + durationMs);

      // Check overlapping appointments (exclude self)
      const existingAppts = await Appointment.find({
        barbershop: req.user.barbershop._id,
        barber:     newBarber,
        type:       { $ne: 'block' },
        status:     'agendado',
        date:       { $lt: newEnd },
        _id:        { $ne: apt._id },
      }).populate('service', 'duration');
      const apptConflict = existingAppts.find(a => {
        const aDur = (a.service?.duration || 30) * 60 * 1000;
        return new Date(+a.date + aDur) > newDate;
      });

      if (!apptConflict) {
        const blocks = await Appointment.find({
          barbershop: req.user.barbershop._id,
          barber:     newBarber,
          type:       'block',
          date:       { $lt: newEnd },
          _id:        { $ne: apt._id },
        });
        const blockConflict = blocks.find(b => {
          const bEnd = b.endDate ? b.endDate.getTime() : b.date.getTime() + durationMs;
          return bEnd > newDate.getTime();
        });
        if (blockConflict)
          return res.status(400).json({ success: false, message: 'Horário indisponível para este barbeiro.' });
      } else {
        return res.status(400).json({ success: false, message: 'Horário indisponível para este barbeiro.' });
      }
    }

    const allowed = ['date', 'endDate', 'barber', 'service', 'status', 'notes', 'clientName', 'client', 'type'];
    allowed.forEach(f => { if (req.body[f] !== undefined) apt[f] = req.body[f]; });
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
