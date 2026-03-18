// controllers/portalController.js
const jwt        = require('jsonwebtoken');
const ClientUser = require('../models/ClientUser');
const Client     = require('../models/Client');
const Barbershop = require('../models/Barbershop');
const Service    = require('../models/Service');
const User       = require('../models/User');
const Appointment = require('../models/Appointment');

const makeToken = (id) =>
  jwt.sign({ id, type: 'client' }, process.env.JWT_SECRET, { expiresIn: '30d' });

function formatClient(c) {
  return {
    id:           c._id,
    name:         c.name,
    phone:        c.phone,
    profileImage: c.profileImage || null,
    preferences:  c.preferences,
  };
}

function haversine(lat1, lon1, lat2, lon2) {
  const R    = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Auth ──────────────────────────────────────────────────────────────────────

const registerClient = async (req, res) => {
  try {
    const { name, phone, password } = req.body;
    if (!name || !phone || !password)
      return res.status(400).json({ success: false, message: 'Nome, telefone e senha são obrigatórios.' });
    if (password.length < 6)
      return res.status(400).json({ success: false, message: 'A senha deve ter no mínimo 6 caracteres.' });

    const clean = phone.replace(/\D/g, '');
    const exists = await ClientUser.findOne({ phone: clean });
    if (exists)
      return res.status(409).json({ success: false, message: 'Este telefone já está cadastrado.' });

    const client = await ClientUser.create({ name, phone: clean, password });

    // Link this portal account to any existing Client records with the same phone
    await Client.updateMany({ phone: clean }, { $set: { clientUser: client._id } });

    res.status(201).json({ success: true, token: makeToken(client._id), user: formatClient(client) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const loginClient = async (req, res) => {
  try {
    const { phone, password } = req.body;
    if (!phone || !password)
      return res.status(400).json({ success: false, message: 'Telefone e senha são obrigatórios.' });

    const client = await ClientUser.findOne({ phone: phone.replace(/\D/g, '') });
    if (!client)
      return res.status(401).json({ success: false, message: 'Telefone não cadastrado.' });
    if (!(await client.comparePassword(password)))
      return res.status(401).json({ success: false, message: 'Senha incorreta.' });

    res.json({ success: true, token: makeToken(client._id), user: formatClient(client) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const meClient = async (req, res) => {
  res.json({ success: true, user: formatClient(req.client) });
};

const updateClientProfile = async (req, res) => {
  try {
    const { name, password, preferences } = req.body;
    const client = req.client;

    if (name) client.name = name;
    if (preferences) client.preferences = { ...client.preferences.toObject(), ...preferences };
    if (password) {
      if (password.length < 6)
        return res.status(400).json({ success: false, message: 'A senha deve ter no mínimo 6 caracteres.' });
      client.password = password;
    }
    await client.save();
    res.json({ success: true, user: formatClient(client) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Public: Barbershops ───────────────────────────────────────────────────────

const searchBarbershops = async (req, res) => {
  try {
    const { q, type, lat, lng, radius = '5' } = req.query;
    const filter = { status: 'active', planStatus: 'active' };

    if (type && type !== 'todos') filter.establishmentType = type;
    if (q)    filter.name = { $regex: q, $options: 'i' };

    let shops;

    if (lat && lng) {
      const radiusM = parseFloat(radius) * 1000;
      try {
        shops = await Barbershop.find({
          ...filter,
          location: {
            $nearSphere: {
              $geometry: { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] },
              $maxDistance: radiusM,
            },
          },
        }).select('-invoices').limit(60);
      } catch {
        shops = await Barbershop.find(filter).select('-invoices').limit(60);
      }
    } else {
      shops = await Barbershop.find(filter).select('-invoices').limit(60);
    }

    const result = shops.map(s => {
      const obj = s.toObject();
      if (lat && lng && s.location?.coordinates?.length === 2) {
        obj.distance = haversine(
          parseFloat(lat), parseFloat(lng),
          s.location.coordinates[1], s.location.coordinates[0]
        );
      }
      return obj;
    });

    if (lat && lng) result.sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity));

    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getBarbershop = async (req, res) => {
  try {
    const shop = await Barbershop.findById(req.params.id).select('-invoices');
    if (!shop)
      return res.status(404).json({ success: false, message: 'Estabelecimento não encontrado.' });

    const services  = await Service.find({ barbershop: shop._id, active: true })
      .populate('category', 'name').sort({ name: 1 });
    const employees = await User.find({ barbershop: shop._id })
      .select('name profileImage role');

    res.json({ success: true, data: { shop, services, employees } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getSlots = async (req, res) => {
  try {
    const { id }                         = req.params;
    const { serviceId, barberId, date }  = req.query;

    if (!serviceId || !date)
      return res.status(400).json({ success: false, message: 'serviceId e date são obrigatórios.' });

    const shop = await Barbershop.findById(id);
    if (!shop)
      return res.status(404).json({ success: false, message: 'Estabelecimento não encontrado.' });

    const service = await Service.findOne({ _id: serviceId, barbershop: id, active: true });
    if (!service)
      return res.status(404).json({ success: false, message: 'Serviço não encontrado.' });

    // Brazil is UTC-3 (no DST since 2019) — all slot/time calculations use BRT explicitly
    const BRT_OFFSET_H = -3;
    const reqDate    = new Date(date + 'T12:00:00.000-03:00');
    const dayOfWeek  = reqDate.getUTCDay();
    const hoursToday = shop.openingHours?.find(h => h.day === dayOfWeek);
    if (!hoursToday || !hoursToday.open)
      return res.json({ success: true, slots: [] });

    const [openH, openM]   = hoursToday.from.split(':').map(Number);
    const [closeH, closeM] = hoursToday.to.split(':').map(Number);
    const openMinutes  = openH * 60 + openM;
    const closeMinutes = closeH * 60 + closeM;

    // Which barbers to check
    let barbers;
    if (barberId && barberId !== 'any') {
      const b = await User.findOne({ _id: barberId, barbershop: id });
      barbers = b ? [b] : [];
    } else {
      barbers = await User.find({ barbershop: id });
    }

    // BRT day boundaries stored in UTC
    const dayStart = new Date(date + 'T00:00:00.000-03:00');
    const dayEnd   = new Date(date + 'T23:59:59.999-03:00');

    // Now threshold in BRT minutes-from-midnight (with 30-min buffer)
    const now      = new Date();
    const nowBRT   = new Date(now.getTime() + BRT_OFFSET_H * 3600000);
    const isToday  = date === nowBRT.toISOString().slice(0, 10);
    const nowMinBRT = isToday ? ((now.getUTCHours() + BRT_OFFSET_H + 24) % 24) * 60 + now.getUTCMinutes() + 30 : 0;

    const allSlots = [];

    for (const barber of barbers) {
      const appts = await Appointment.find({
        barber:     barber._id,
        barbershop: id,
        date:       { $gte: dayStart, $lte: dayEnd },
        status:     { $nin: ['cancelado'] },
      }).populate('service', 'duration');

      // Build occupied intervals in BRT minutes-from-midnight (UTC-3)
      const occupied = appts.map(a => {
        const startMin = ((a.date.getUTCHours() + BRT_OFFSET_H + 24) % 24) * 60 + a.date.getUTCMinutes();
        let endMin;
        if (a.endDate) {
          endMin = ((a.endDate.getUTCHours() + BRT_OFFSET_H + 24) % 24) * 60 + a.endDate.getUTCMinutes();
        } else {
          endMin = startMin + (a.service?.duration || 30);
        }
        return { start: startMin, end: endMin };
      });

      // Generate slots every 15 minutes
      for (let t = openMinutes; t + service.duration <= closeMinutes; t += 15) {
        if (t < nowMinBRT) continue;
        const hasConflict = occupied.some(o => t < o.end && t + service.duration > o.start);
        if (!hasConflict) {
          const h = String(Math.floor(t / 60)).padStart(2, '0');
          const m = String(t % 60).padStart(2, '0');
          allSlots.push({
            time:        `${h}:${m}`,
            barberId:    barber._id,
            barberName:  barber.name,
            barberImage: barber.profileImage || null,
          });
        }
      }
    }

    allSlots.sort((a, b) => a.time.localeCompare(b.time));

    // If "any barber" — deduplicate by time, keep first available
    let finalSlots = allSlots;
    if (!barberId || barberId === 'any') {
      const seen = new Set();
      finalSlots = allSlots.filter(s => {
        if (seen.has(s.time)) return false;
        seen.add(s.time);
        return true;
      });
    }

    res.json({ success: true, slots: finalSlots });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Client Appointments ───────────────────────────────────────────────────────

const getClientAppointments = async (req, res) => {
  try {
    // Find all Client records linked to this portal account (by phone or clientUser field)
    const clientRecords = await Client.find({
      $or: [{ clientUser: req.client._id }, { phone: req.client.phone }],
    }).select('_id');
    const clientIds = clientRecords.map(c => c._id);

    const appts = await Appointment.find({
      type: 'appointment',
      $or: [
        { portalClientId: req.client._id },
        ...(clientIds.length ? [{ client: { $in: clientIds } }] : []),
      ],
    })
      .populate('barbershop', 'name logo address city')
      .populate('service',    'name duration price')
      .populate('barber',     'name profileImage')
      .sort({ date: -1 });

    res.json({ success: true, data: appts });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const createClientAppointment = async (req, res) => {
  try {
    const { barbershopId, serviceId, barberId, date, time } = req.body;
    if (!barbershopId || !serviceId || !barberId || !date || !time)
      return res.status(400).json({ success: false, message: 'Todos os campos são obrigatórios.' });

    const service = await Service.findOne({ _id: serviceId, barbershop: barbershopId, active: true });
    if (!service)
      return res.status(404).json({ success: false, message: 'Serviço não encontrado.' });

    const barber = await User.findOne({ _id: barberId, barbershop: barbershopId });
    if (!barber)
      return res.status(404).json({ success: false, message: 'Profissional não encontrado.' });

    // Parse as BRT (UTC-3) so dates are stored correctly regardless of server timezone
    const appointmentDate = new Date(`${date}T${time}:00.000-03:00`);
    const endDate         = new Date(appointmentDate.getTime() + service.duration * 60 * 1000);

    // Double-check availability — BRT day boundaries
    const dayStart  = new Date(`${date}T00:00:00.000-03:00`);
    const dayEnd    = new Date(`${date}T23:59:59.999-03:00`);
    const dayAppts  = await Appointment.find({
      barber:     barberId,
      barbershop: barbershopId,
      status:     { $nin: ['cancelado'] },
      date:       { $gte: dayStart, $lte: dayEnd },
    }).populate('service', 'duration');

    const hasConflict = dayAppts.some(a => {
      const aDur   = (a.service?.duration || 30) * 60000;
      const aStart = new Date(a.date);
      const aEnd   = a.endDate ? new Date(a.endDate) : new Date(aStart.getTime() + aDur);
      return appointmentDate < aEnd && endDate > aStart;
    });
    if (hasConflict)
      return res.status(409).json({ success: false, message: 'Este horário não está mais disponível. Escolha outro.' });

    // Find or create the Client record for this barbershop (unifies portal + admin identities)
    let clientDoc = await Client.findOne({ barbershop: barbershopId, phone: req.client.phone });
    if (!clientDoc) {
      clientDoc = await Client.create({
        barbershop: barbershopId,
        name:       req.client.name,
        phone:      req.client.phone,
        clientUser: req.client._id,
      });
    } else if (!clientDoc.clientUser) {
      clientDoc.clientUser = req.client._id;
      await clientDoc.save();
    }

    const appt = await Appointment.create({
      clientName:     req.client.name,
      client:         clientDoc._id,
      portalClientId: req.client._id,
      service:        serviceId,
      barber:         barberId,
      barbershop:     barbershopId,
      date:           appointmentDate,
      endDate,
      source:         'portal',
      status:         'agendado',
    });

    const populated = await Appointment.findById(appt._id)
      .populate('barbershop', 'name logo')
      .populate('service',    'name duration price')
      .populate('barber',     'name profileImage');

    res.status(201).json({ success: true, data: populated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const cancelClientAppointment = async (req, res) => {
  try {
    // Allow cancellation of appointments created via portal OR linked via Client record
    const clientRecords = await Client.find({
      $or: [{ clientUser: req.client._id }, { phone: req.client.phone }],
    }).select('_id');
    const clientIds = clientRecords.map(c => c._id);

    const appt = await Appointment.findOne({
      _id: req.params.id,
      $or: [
        { portalClientId: req.client._id },
        ...(clientIds.length ? [{ client: { $in: clientIds } }] : []),
      ],
    });
    if (!appt)
      return res.status(404).json({ success: false, message: 'Agendamento não encontrado.' });
    if (appt.status === 'cancelado')
      return res.status(400).json({ success: false, message: 'Agendamento já cancelado.' });

    appt.status = 'cancelado';
    await appt.save();
    res.json({ success: true, message: 'Agendamento cancelado com sucesso.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /portal/auth/forgot-password
const forgotClientPassword = async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ ok: false, message: 'Informe o telefone.' });

    const user = await ClientUser.findOne({ phone: phone.replace(/\D/g, '') });
    if (user) {
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      user.resetCode        = code;
      user.resetCodeExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 min
      await user.save();
      // Em produção: enviar via SMS. No dev: log no console.
      console.log(`[RESET CODE] Telefone: ${phone} | Código: ${code}`);
    }
    // Sempre responde igual para não revelar se o número existe
    res.json({ ok: true, message: 'Se a conta existir, o código foi gerado.' });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
};

// POST /portal/auth/reset-password
const resetClientPassword = async (req, res) => {
  try {
    const { phone, code, newPassword } = req.body;
    if (!phone || !code || !newPassword)
      return res.status(400).json({ ok: false, message: 'Dados incompletos.' });
    if (newPassword.length < 6)
      return res.status(400).json({ ok: false, message: 'A senha deve ter no mínimo 6 caracteres.' });

    const user = await ClientUser.findOne({
      phone:            phone.replace(/\D/g, ''),
      resetCode:        code,
      resetCodeExpires: { $gt: new Date() },
    });
    if (!user) return res.status(400).json({ ok: false, message: 'Código inválido ou expirado.' });

    user.password         = newPassword;
    user.resetCode        = undefined;
    user.resetCodeExpires = undefined;
    await user.save();

    res.json({ ok: true, message: 'Senha redefinida com sucesso.' });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
};

module.exports = {
  registerClient, loginClient, meClient, updateClientProfile,
  forgotClientPassword, resetClientPassword,
  searchBarbershops, getBarbershop, getSlots,
  getClientAppointments, createClientAppointment, cancelClientAppointment,
};
