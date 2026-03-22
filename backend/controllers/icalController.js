// controllers/icalController.js — iCal feed para sincronização com Google Agenda

const crypto      = require('crypto');
const User        = require('../models/User');
const Appointment = require('../models/Appointment');

// Escapa caracteres especiais do iCal
function esc(str) {
  return (str || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

// Formata Date para iCal UTC (YYYYMMDDTHHmmssZ)
function fmtDt(d) {
  return new Date(d).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

// GET /api/appointments/ical-token — retorna (e gera se necessário) o token do usuário
const getIcalToken = async (req, res) => {
  try {
    let user = await User.findById(req.user._id);
    if (!user.calendarToken) {
      user.calendarToken = crypto.randomBytes(24).toString('hex');
      await user.save();
    }
    const baseUrl = process.env.APP_URL?.replace(/\/+$/, '') || 'http://localhost:3000';
    const feedUrl = `${baseUrl}/api/appointments/ical/${user.calendarToken}`;
    res.json({ success: true, data: { token: user.calendarToken, feedUrl } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/appointments/ical/:token — feed iCal público (sem auth, via token)
const getIcalFeed = async (req, res) => {
  try {
    const user = await User.findOne({ calendarToken: req.params.token }).populate('barbershop', 'name');
    if (!user) return res.status(404).send('Calendário não encontrado.');

    const appointments = await Appointment.find({
      barbershop: user.barbershop._id,
      barber:     user._id,
      status:     { $in: ['agendado', 'concluído'] },
    })
      .populate('service', 'name duration price')
      .populate('client', 'name phone')
      .sort({ date: 1 });

    const shopName = user.barbershop?.name || 'Barbearia';
    const calName  = `${shopName} — ${user.name}`;
    const now      = fmtDt(new Date());

    let ical = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      `PRODID:-//JubaOS//BarberApp//PT`,
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      `X-WR-CALNAME:${esc(calName)}`,
      'X-WR-TIMEZONE:America/Sao_Paulo',
      `X-WR-CALDESC:Agendamentos de ${esc(user.name)} - ${esc(shopName)}`,
    ];

    for (const appt of appointments) {
      const start   = new Date(appt.date);
      const durMin  = appt.service?.duration || 30;
      const end     = new Date(start.getTime() + durMin * 60_000);
      const client  = appt.client?.name || appt.clientName || 'Cliente';
      const service = appt.service?.name || 'Serviço';
      const price   = appt.service?.price ? ` — R$ ${appt.service.price.toFixed(2)}` : '';

      ical.push(
        'BEGIN:VEVENT',
        `UID:${appt._id}@jubaos`,
        `DTSTAMP:${now}`,
        `DTSTART:${fmtDt(start)}`,
        `DTEND:${fmtDt(end)}`,
        `SUMMARY:${esc(service)} — ${esc(client)}${price}`,
        `DESCRIPTION:Cliente: ${esc(client)}\\nServiço: ${esc(service)}${esc(price)}\\nStatus: ${esc(appt.status)}${appt.notes ? `\\nObs: ${esc(appt.notes)}` : ''}`,
        `LOCATION:${esc(shopName)}`,
        `STATUS:${appt.status === 'concluído' ? 'COMPLETED' : 'CONFIRMED'}`,
        'END:VEVENT',
      );
    }

    ical.push('END:VCALENDAR');

    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${user.name.replace(/\s+/g, '_')}_agenda.ics"`);
    res.send(ical.join('\r\n'));
  } catch (err) {
    res.status(500).send('Erro ao gerar calendário.');
  }
};

module.exports = { getIcalToken, getIcalFeed };
