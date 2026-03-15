// controllers/reportController.js

const Appointment = require('../models/Appointment');
const mongoose    = require('mongoose');

// GET /api/reports
const getReport = async (req, res) => {
  try {
    const { startDate, endDate, barber } = req.query;

    if (!startDate || !endDate)
      return res.status(400).json({ success: false, message: 'startDate e endDate são obrigatórios.' });

    const start = new Date(startDate); start.setHours(0, 0, 0, 0);
    const end   = new Date(endDate);   end.setHours(23, 59, 59, 999);

    // Base filter
    const match = {
      barbershop: req.user.barbershop._id,
      date: { $gte: start, $lte: end },
    };

    // Barbeiro só vê seus próprios; admin pode filtrar
    if (req.user.role !== 'admin') {
      match.barber = req.user._id;
    } else if (barber) {
      match.barber = new mongoose.Types.ObjectId(barber);
    }

    // ── Busca todos os agendamentos do período ────────────────────────────
    const appointments = await Appointment.find(match)
      .populate('service', 'name price duration commission')
      .populate('barber', 'name email')
      .sort({ date: 1 });

    // ── Summary ───────────────────────────────────────────────────────────
    const total     = appointments.length;
    const completed = appointments.filter(a => a.status === 'concluído').length;
    const cancelled = appointments.filter(a => a.status === 'cancelado').length;
    const pending   = appointments.filter(a => a.status === 'agendado').length;
    const revenue   = appointments
      .filter(a => a.status === 'concluído')
      .reduce((sum, a) => sum + (a.service?.price || 0), 0);
    const barberCommission = appointments
      .filter(a => a.status === 'concluído')
      .reduce((sum, a) => {
        const pct = a.service?.commission ?? 50;
        return sum + (a.service?.price || 0) * pct / 100;
      }, 0);
    const shopRevenue = revenue - barberCommission;

    // ── By service ────────────────────────────────────────────────────────
    const serviceMap = {};
    appointments.forEach(a => {
      if (!a.service) return;
      const id = String(a.service._id);
      if (!serviceMap[id]) serviceMap[id] = { name: a.service.name, price: a.service.price, commission: a.service.commission ?? 50, count: 0, completed: 0, revenue: 0, barberCommission: 0, shopRevenue: 0 };
      serviceMap[id].count++;
      if (a.status === 'concluído') {
        const price = a.service.price || 0;
        const pct   = a.service.commission ?? 50;
        serviceMap[id].completed++;
        serviceMap[id].revenue           += price;
        serviceMap[id].barberCommission  += price * pct / 100;
        serviceMap[id].shopRevenue       += price * (100 - pct) / 100;
      }
    });
    const byService = Object.values(serviceMap).sort((a, b) => b.count - a.count);

    // ── By barber (admin only) ────────────────────────────────────────────
    let byBarber = [];
    if (req.user.role === 'admin') {
      const barberMap = {};
      appointments.forEach(a => {
        if (!a.barber) return;
        const id = String(a.barber._id);
        if (!barberMap[id]) barberMap[id] = { name: a.barber.name, count: 0, completed: 0, revenue: 0, barberCommission: 0 };
        barberMap[id].count++;
        if (a.status === 'concluído') {
          const price = a.service?.price || 0;
          const pct   = a.service?.commission ?? 50;
          barberMap[id].completed++;
          barberMap[id].revenue          += price;
          barberMap[id].barberCommission += price * pct / 100;
        }
      });
      byBarber = Object.values(barberMap).sort((a, b) => b.revenue - a.revenue);
    }

    // ── Timeline (agrupado por dia) ───────────────────────────────────────
    const timelineMap = {};
    appointments.forEach(a => {
      const day = a.date.toISOString().slice(0, 10);
      if (!timelineMap[day]) timelineMap[day] = { date: day, count: 0, completed: 0, revenue: 0 };
      timelineMap[day].count++;
      if (a.status === 'concluído') { timelineMap[day].completed++; timelineMap[day].revenue += a.service?.price || 0; }
    });
    const timeline = Object.values(timelineMap).sort((a, b) => a.date.localeCompare(b.date));

    // ── Lista completa para tabela ────────────────────────────────────────
    const list = appointments.map(a => ({
      id:          a._id,
      clientName:  a.clientName,
      service:     a.service?.name || '—',
      price:       a.service?.price || 0,
      barber:      a.barber?.name  || '—',
      date:        a.date,
      status:      a.status,
      notes:       a.notes || '',
    }));

    res.json({
      success: true,
      data: { summary: { total, completed, cancelled, pending, revenue, barberCommission, shopRevenue }, byService, byBarber, timeline, list },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { getReport };
