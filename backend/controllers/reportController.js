// controllers/reportController.js — Comprehensive reporting engine

const Appointment  = require('../models/Appointment');
const Commission   = require('../models/Commission');
const Transaction  = require('../models/Transaction');
const Client       = require('../models/Client');
const Product      = require('../models/Product');
const StockMovement = require('../models/StockMovement');
const Tab          = require('../models/Tab');
const User         = require('../models/User');
const Service      = require('../models/Service');
const ReceptionConversation = require('../models/ReceptionConversation');
const mongoose     = require('mongoose');

const shopId = (req) => req.user.barbershop._id;
const isAdmin = (req) => req.user.role === 'admin';

// ── Helper: parse date range & compute previous period ──────────────────────
function parsePeriod(query) {
  const { startDate, endDate } = query;
  if (!startDate || !endDate) return null;
  const start = new Date(startDate + 'T00:00:00.000Z');
  const end   = new Date(endDate   + 'T23:59:59.999Z');
  const dur   = end.getTime() - start.getTime();
  const prevEnd   = new Date(start.getTime() - 1);
  const prevStart = new Date(prevEnd.getTime() - dur);
  return { start, end, prevStart, prevEnd };
}

function pctChange(cur, prev) {
  if (!prev || prev === 0) return cur > 0 ? 100 : 0;
  return Math.round(((cur - prev) / prev) * 100);
}

// ── Base match builder ──────────────────────────────────────────────────────
function baseMatch(req, dateField = 'date') {
  const p = parsePeriod(req.query);
  if (!p) return null;
  const match = { barbershop: shopId(req) };
  match[dateField] = { $gte: p.start, $lte: p.end };
  // Permission: barbeiro only sees own data
  if (!isAdmin(req)) match.barber = req.user._id;
  // Filters
  if (req.query.barber && isAdmin(req)) match.barber = new mongoose.Types.ObjectId(req.query.barber);
  if (req.query.service) match.service = new mongoose.Types.ObjectId(req.query.service);
  if (req.query.paymentMethod) match.paymentMethod = req.query.paymentMethod;
  return { match, ...p };
}

// ══════════════════════════════════════════════════════════════════════════════
// GET /api/reports — Legacy endpoint (kept for backward compat)
// ══════════════════════════════════════════════════════════════════════════════
const getReport = async (req, res) => {
  try {
    const { startDate, endDate, barber } = req.query;
    if (!startDate || !endDate)
      return res.status(400).json({ success: false, message: 'startDate e endDate são obrigatórios.' });

    const start = new Date(startDate); start.setHours(0, 0, 0, 0);
    const end   = new Date(endDate);   end.setHours(23, 59, 59, 999);

    const match = { barbershop: shopId(req), date: { $gte: start, $lte: end } };
    if (!isAdmin(req)) match.barber = req.user._id;
    else if (barber) match.barber = new mongoose.Types.ObjectId(barber);

    const appointments = await Appointment.find(match)
      .populate('service', 'name price duration commission')
      .populate('barber', 'name email')
      .sort({ date: 1 });

    const total     = appointments.length;
    const completed = appointments.filter(a => a.status === 'concluído').length;
    const cancelled = appointments.filter(a => a.status === 'cancelado').length;
    const absent    = appointments.filter(a => a.status === 'ausente').length;
    const pending   = appointments.filter(a => a.status === 'agendado').length;
    const revenue   = appointments.filter(a => a.status === 'concluído').reduce((s, a) => s + (a.service?.price || 0), 0);
    const barberCommission = appointments.filter(a => a.status === 'concluído').reduce((s, a) => s + (a.service?.price || 0) * (a.service?.commission ?? 50) / 100, 0);
    const shopRevenue = revenue - barberCommission;

    const serviceMap = {};
    appointments.forEach(a => {
      if (!a.service) return;
      const id = String(a.service._id);
      if (!serviceMap[id]) serviceMap[id] = { name: a.service.name, price: a.service.price, commission: a.service.commission ?? 50, count: 0, completed: 0, revenue: 0, barberCommission: 0, shopRevenue: 0 };
      serviceMap[id].count++;
      if (a.status === 'concluído') {
        const price = a.service.price || 0;
        const pct = a.service.commission ?? 50;
        serviceMap[id].completed++;
        serviceMap[id].revenue += price;
        serviceMap[id].barberCommission += price * pct / 100;
        serviceMap[id].shopRevenue += price * (100 - pct) / 100;
      }
    });
    const byService = Object.values(serviceMap).sort((a, b) => b.count - a.count);

    const apptIds = appointments.filter(a => a.status === 'concluído').map(a => a._id);
    const commissions = await Commission.find({ barbershop: shopId(req), appointment: { $in: apptIds } }).lean();
    const commMap = {};
    commissions.forEach(c => { commMap[String(c.appointment)] = c; });
    const commissionPaid    = commissions.filter(c => c.status === 'pago').reduce((s, c) => s + c.commissionAmount, 0);
    const commissionPending = commissions.filter(c => c.status === 'pendente').reduce((s, c) => s + c.commissionAmount, 0);

    let byBarber = [];
    if (isAdmin(req)) {
      const barberMap = {};
      appointments.forEach(a => {
        if (!a.barber) return;
        const id = String(a.barber._id);
        if (!barberMap[id]) barberMap[id] = { name: a.barber.name, count: 0, completed: 0, revenue: 0, barberCommission: 0, commissionPaid: 0, commissionPending: 0 };
        barberMap[id].count++;
        if (a.status === 'concluído') {
          const price = a.service?.price || 0;
          const pct = a.service?.commission ?? 50;
          const comm = commMap[String(a._id)];
          barberMap[id].completed++;
          barberMap[id].revenue += price;
          barberMap[id].barberCommission += price * pct / 100;
          if (comm) {
            if (comm.status === 'pago')     barberMap[id].commissionPaid    += comm.commissionAmount;
            if (comm.status === 'pendente') barberMap[id].commissionPending += comm.commissionAmount;
          }
        }
      });
      byBarber = Object.values(barberMap).sort((a, b) => b.revenue - a.revenue);
    }

    const timelineMap = {};
    appointments.forEach(a => {
      const day = a.date.toISOString().slice(0, 10);
      if (!timelineMap[day]) timelineMap[day] = { date: day, count: 0, completed: 0, revenue: 0 };
      timelineMap[day].count++;
      if (a.status === 'concluído') { timelineMap[day].completed++; timelineMap[day].revenue += a.service?.price || 0; }
    });
    const timeline = Object.values(timelineMap).sort((a, b) => a.date.localeCompare(b.date));

    const list = appointments.map(a => {
      const comm = commMap[String(a._id)];
      return {
        id: a._id, clientName: a.clientName, service: a.service?.name || '—', price: a.service?.price || 0,
        barber: a.barber?.name || '—', date: a.date, status: a.status, notes: a.notes || '',
        commissionRate: comm?.commissionRate ?? (a.service?.commission ?? 50),
        commissionAmount: comm?.commissionAmount ?? 0,
        commissionStatus: comm?.status ?? (a.status === 'concluído' ? 'pendente' : null),
        commissionId: comm?._id ?? null,
      };
    });

    res.json({
      success: true,
      data: { summary: { total, completed, cancelled, absent, pending, revenue, barberCommission, shopRevenue, commissionPaid, commissionPending }, byService, byBarber, timeline, list },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ══════════════════════════════════════════════════════════════════════════════
// GET /api/reports/overview — Visão Geral
// ══════════════════════════════════════════════════════════════════════════════
const getOverview = async (req, res) => {
  try {
    const p = parsePeriod(req.query);
    if (!p) return res.status(400).json({ success: false, message: 'startDate e endDate são obrigatórios.' });

    const shop = shopId(req);
    const barberFilter = !isAdmin(req) ? { barber: req.user._id } : (req.query.barber ? { barber: new mongoose.Types.ObjectId(req.query.barber) } : {});

    const apptMatch     = { barbershop: shop, date: { $gte: p.start, $lte: p.end }, ...barberFilter };
    const apptMatchPrev = { barbershop: shop, date: { $gte: p.prevStart, $lte: p.prevEnd }, ...barberFilter };
    const txnMatch      = { barbershop: shop, createdAt: { $gte: p.start, $lte: p.end } };
    const txnMatchPrev  = { barbershop: shop, createdAt: { $gte: p.prevStart, $lte: p.prevEnd } };

    const [curAppts, prevAppts, curTxns, prevTxns, clients, topServices] = await Promise.all([
      Appointment.aggregate([
        { $match: apptMatch },
        { $group: { _id: '$status', count: { $sum: 1 }, revenue: { $sum: { $cond: [{ $eq: ['$status', 'concluído'] }, '$_servicePrice', 0] } } } },
      ]).then(async () => {
        // Simpler approach: fetch all appointments for the period
        return Appointment.find(apptMatch).populate('service', 'price name').lean();
      }),
      Appointment.find(apptMatchPrev).populate('service', 'price').lean(),
      Transaction.aggregate([
        { $match: txnMatch },
        { $group: { _id: '$type', total: { $sum: '$amount' } } },
      ]),
      Transaction.aggregate([
        { $match: txnMatchPrev },
        { $group: { _id: '$type', total: { $sum: '$amount' } } },
      ]),
      isAdmin(req) ? Client.countDocuments({ barbershop: shop, createdAt: { $gte: p.start, $lte: p.end } }) : 0,
      Appointment.aggregate([
        { $match: { ...apptMatch, status: 'concluído' } },
        { $group: { _id: '$service', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 },
        { $lookup: { from: 'services', localField: '_id', foreignField: '_id', as: 'svc' } },
        { $unwind: { path: '$svc', preserveNullAndEmptyArrays: true } },
        { $project: { name: '$svc.name', count: 1, price: '$svc.price' } },
      ]),
    ]);

    // Process current period
    const curCompleted  = curAppts.filter(a => a.status === 'concluído');
    const curCancelled  = curAppts.filter(a => a.status === 'cancelado');
    const curAbsent     = curAppts.filter(a => a.status === 'ausente');
    const curRevenue    = curCompleted.reduce((s, a) => s + (a.service?.price || 0), 0);
    const curTicket     = curCompleted.length ? curRevenue / curCompleted.length : 0;

    // Process previous period
    const prevCompleted = prevAppts.filter(a => a.status === 'concluído');
    const prevRevenue   = prevCompleted.reduce((s, a) => s + (a.service?.price || 0), 0);
    const prevTicket    = prevCompleted.length ? prevRevenue / prevCompleted.length : 0;

    const curEntradas = curTxns.find(t => t._id === 'entrada')?.total || 0;
    const curSaidas   = curTxns.find(t => t._id === 'saida')?.total || 0;
    const prevEntradas = prevTxns.find(t => t._id === 'entrada')?.total || 0;
    const prevSaidas   = prevTxns.find(t => t._id === 'saida')?.total || 0;

    // Timeline (daily)
    const timelineMap = {};
    curAppts.forEach(a => {
      const day = new Date(a.date).toISOString().slice(0, 10);
      if (!timelineMap[day]) timelineMap[day] = { date: day, total: 0, completed: 0, revenue: 0 };
      timelineMap[day].total++;
      if (a.status === 'concluído') {
        timelineMap[day].completed++;
        timelineMap[day].revenue += a.service?.price || 0;
      }
    });
    const timeline = Object.values(timelineMap).sort((a, b) => a.date.localeCompare(b.date));

    res.json({
      success: true,
      data: {
        kpis: {
          totalAppointments:   { value: curAppts.length,       prev: prevAppts.length,       pct: pctChange(curAppts.length, prevAppts.length) },
          completedAppointments: { value: curCompleted.length, prev: prevCompleted.length,   pct: pctChange(curCompleted.length, prevCompleted.length) },
          cancelledAppointments: { value: curCancelled.length, prev: prevAppts.filter(a => a.status === 'cancelado').length },
          absentAppointments:    { value: curAbsent.length },
          revenue:             { value: curRevenue,            prev: prevRevenue,            pct: pctChange(curRevenue, prevRevenue) },
          avgTicket:           { value: curTicket,             prev: prevTicket,             pct: pctChange(curTicket, prevTicket) },
          completionRate:      { value: curAppts.length ? Math.round((curCompleted.length / curAppts.length) * 100) : 0 },
          financialEntradas:   { value: curEntradas,           prev: prevEntradas,           pct: pctChange(curEntradas, prevEntradas) },
          financialSaidas:     { value: curSaidas,             prev: prevSaidas },
          financialSaldo:      { value: curEntradas - curSaidas, prev: prevEntradas - prevSaidas },
          newClients:          { value: clients },
        },
        topServices,
        timeline,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ══════════════════════════════════════════════════════════════════════════════
// GET /api/reports/services — Relatório de Serviços
// ══════════════════════════════════════════════════════════════════════════════
const getServicesReport = async (req, res) => {
  try {
    const p = parsePeriod(req.query);
    if (!p) return res.status(400).json({ success: false, message: 'startDate e endDate são obrigatórios.' });

    const barberFilter = !isAdmin(req) ? { barber: req.user._id } : (req.query.barber ? { barber: new mongoose.Types.ObjectId(req.query.barber) } : {});
    const match     = { barbershop: shopId(req), date: { $gte: p.start, $lte: p.end }, ...barberFilter };
    const matchPrev = { barbershop: shopId(req), date: { $gte: p.prevStart, $lte: p.prevEnd }, ...barberFilter };

    const [byService, byServicePrev, list] = await Promise.all([
      Appointment.aggregate([
        { $match: { ...match, status: 'concluído' } },
        { $lookup: { from: 'services', localField: 'service', foreignField: '_id', as: 'svc' } },
        { $unwind: { path: '$svc', preserveNullAndEmptyArrays: true } },
        { $group: {
          _id: '$service',
          name: { $first: '$svc.name' },
          price: { $first: '$svc.price' },
          commission: { $first: '$svc.commission' },
          count: { $sum: 1 },
          revenue: { $sum: { $ifNull: ['$svc.price', 0] } },
          avgDuration: { $avg: '$svc.duration' },
        }},
        { $sort: { count: -1 } },
      ]),
      Appointment.aggregate([
        { $match: { ...matchPrev, status: 'concluído' } },
        { $group: { _id: '$service', count: { $sum: 1 } } },
      ]),
      Appointment.find(match)
        .populate('service', 'name price duration commission')
        .populate('barber', 'name')
        .populate('client', 'name phone')
        .sort({ date: -1 })
        .limit(200)
        .lean(),
    ]);

    const prevMap = {};
    byServicePrev.forEach(s => { prevMap[String(s._id)] = s.count; });

    const services = byService.map(s => ({
      ...s,
      prevCount: prevMap[String(s._id)] || 0,
      pctChange: pctChange(s.count, prevMap[String(s._id)] || 0),
    }));

    const totalRevenue  = services.reduce((s, sv) => s + sv.revenue, 0);
    const totalCount    = services.reduce((s, sv) => s + sv.count, 0);
    const prevTotalCount = byServicePrev.reduce((s, sv) => s + sv.count, 0);

    res.json({
      success: true,
      data: {
        kpis: {
          totalServices:    { value: totalCount,    prev: prevTotalCount, pct: pctChange(totalCount, prevTotalCount) },
          totalRevenue:     { value: totalRevenue },
          avgTicket:        { value: totalCount ? totalRevenue / totalCount : 0 },
          uniqueServices:   { value: services.length },
        },
        byService: services,
        list: list.map(a => ({
          id: a._id, clientName: a.clientName || a.client?.name || '—', service: a.service?.name || '—',
          price: a.service?.price || 0, barber: a.barber?.name || '—', date: a.date, status: a.status,
        })),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ══════════════════════════════════════════════════════════════════════════════
// GET /api/reports/sales — Relatório de Vendas (produtos + tabs)
// ══════════════════════════════════════════════════════════════════════════════
const getSalesReport = async (req, res) => {
  try {
    const p = parsePeriod(req.query);
    if (!p) return res.status(400).json({ success: false, message: 'startDate e endDate são obrigatórios.' });

    const shop = shopId(req);

    const [productSales, productSalesPrev, tabs, tabsPrev] = await Promise.all([
      StockMovement.aggregate([
        { $match: { barbershop: shop, type: 'venda', createdAt: { $gte: p.start, $lte: p.end } } },
        { $lookup: { from: 'products', localField: 'product', foreignField: '_id', as: 'prod' } },
        { $unwind: { path: '$prod', preserveNullAndEmptyArrays: true } },
        { $group: {
          _id: '$product',
          name: { $first: '$prod.name' },
          qty: { $sum: '$quantity' },
          revenue: { $sum: { $multiply: ['$quantity', '$unitPrice'] } },
          cost: { $sum: { $multiply: ['$quantity', '$unitCost'] } },
        }},
        { $sort: { revenue: -1 } },
      ]),
      StockMovement.aggregate([
        { $match: { barbershop: shop, type: 'venda', createdAt: { $gte: p.prevStart, $lte: p.prevEnd } } },
        { $group: { _id: null, revenue: { $sum: { $multiply: ['$quantity', '$unitPrice'] } }, qty: { $sum: '$quantity' } } },
      ]),
      Tab.find({ barbershop: shop, status: 'finalizada', closedAt: { $gte: p.start, $lte: p.end } }).lean(),
      Tab.countDocuments({ barbershop: shop, status: 'finalizada', closedAt: { $gte: p.prevStart, $lte: p.prevEnd } }),
    ]);

    const prodRevenue     = productSales.reduce((s, p) => s + p.revenue, 0);
    const prodCost        = productSales.reduce((s, p) => s + p.cost, 0);
    const prevProdRevenue = productSalesPrev[0]?.revenue || 0;
    const tabsRevenue     = tabs.reduce((s, t) => s + (t.total || 0), 0);

    // By payment method from tabs
    const byPayment = {};
    tabs.forEach(t => {
      const m = t.paymentMethod || 'outro';
      if (!byPayment[m]) byPayment[m] = { method: m, count: 0, total: 0 };
      byPayment[m].count++;
      byPayment[m].total += t.total || 0;
    });

    res.json({
      success: true,
      data: {
        kpis: {
          productRevenue:  { value: prodRevenue,  prev: prevProdRevenue, pct: pctChange(prodRevenue, prevProdRevenue) },
          productMargin:   { value: prodRevenue - prodCost },
          tabsCount:       { value: tabs.length,  prev: tabsPrev,       pct: pctChange(tabs.length, tabsPrev) },
          tabsRevenue:     { value: tabsRevenue },
          totalSales:      { value: prodRevenue + tabsRevenue },
        },
        byProduct: productSales,
        byPayment: Object.values(byPayment).sort((a, b) => b.total - a.total),
        tabsList: tabs.slice(0, 100).map(t => ({
          id: t._id, clientName: t.clientName, total: t.total, paymentMethod: t.paymentMethod,
          items: t.items?.length || 0, closedAt: t.closedAt,
        })),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ══════════════════════════════════════════════════════════════════════════════
// GET /api/reports/financial — Relatório Financeiro
// ══════════════════════════════════════════════════════════════════════════════
const getFinancialReport = async (req, res) => {
  try {
    const p = parsePeriod(req.query);
    if (!p) return res.status(400).json({ success: false, message: 'startDate e endDate são obrigatórios.' });

    const shop = shopId(req);
    const pmFilter = req.query.paymentMethod ? { paymentMethod: req.query.paymentMethod } : {};

    const [byCategory, byCategoryPrev, byPayment, byPaymentPrev, timeline] = await Promise.all([
      Transaction.aggregate([
        { $match: { barbershop: shop, createdAt: { $gte: p.start, $lte: p.end }, ...pmFilter } },
        { $group: { _id: { type: '$type', category: '$category' }, total: { $sum: '$amount' }, count: { $sum: 1 } } },
        { $sort: { total: -1 } },
      ]),
      Transaction.aggregate([
        { $match: { barbershop: shop, createdAt: { $gte: p.prevStart, $lte: p.prevEnd }, ...pmFilter } },
        { $group: { _id: '$type', total: { $sum: '$amount' } } },
      ]),
      Transaction.aggregate([
        { $match: { barbershop: shop, createdAt: { $gte: p.start, $lte: p.end }, type: 'entrada' } },
        { $group: { _id: '$paymentMethod', total: { $sum: '$amount' }, count: { $sum: 1 } } },
        { $sort: { total: -1 } },
      ]),
      Transaction.aggregate([
        { $match: { barbershop: shop, createdAt: { $gte: p.prevStart, $lte: p.prevEnd }, type: 'entrada' } },
        { $group: { _id: '$paymentMethod', total: { $sum: '$amount' } } },
      ]),
      Transaction.aggregate([
        { $match: { barbershop: shop, createdAt: { $gte: p.start, $lte: p.end } } },
        { $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          entradas: { $sum: { $cond: [{ $eq: ['$type', 'entrada'] }, '$amount', 0] } },
          saidas:   { $sum: { $cond: [{ $eq: ['$type', 'saida'] }, '$amount', 0] } },
        }},
        { $sort: { _id: 1 } },
      ]),
    ]);

    // Organize categories by type
    const receitas = byCategory.filter(c => c._id.type === 'entrada').map(c => ({ category: c._id.category, total: c.total, count: c.count }));
    const despesas = byCategory.filter(c => c._id.type === 'saida').map(c => ({ category: c._id.category, total: c.total, count: c.count }));
    const totalEntradas = receitas.reduce((s, r) => s + r.total, 0);
    const totalSaidas   = despesas.reduce((s, d) => s + d.total, 0);
    const prevEntradas  = byCategoryPrev.find(c => c._id === 'entrada')?.total || 0;
    const prevSaidas    = byCategoryPrev.find(c => c._id === 'saida')?.total || 0;

    // Payment method comparison
    const prevPmMap = {};
    byPaymentPrev.forEach(pm => { prevPmMap[pm._id] = pm.total; });
    const paymentMethods = byPayment.map(pm => ({
      method: pm._id, total: pm.total, count: pm.count,
      prev: prevPmMap[pm._id] || 0, pct: pctChange(pm.total, prevPmMap[pm._id] || 0),
    }));

    res.json({
      success: true,
      data: {
        kpis: {
          entradas:    { value: totalEntradas, prev: prevEntradas, pct: pctChange(totalEntradas, prevEntradas) },
          saidas:      { value: totalSaidas,   prev: prevSaidas,   pct: pctChange(totalSaidas, prevSaidas) },
          saldo:       { value: totalEntradas - totalSaidas, prev: prevEntradas - prevSaidas },
          lucroBruto:  { value: totalEntradas - totalSaidas },
        },
        receitas,
        despesas,
        byPayment: paymentMethods,
        timeline: timeline.map(t => ({ date: t._id, entradas: t.entradas, saidas: t.saidas, saldo: t.entradas - t.saidas })),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ══════════════════════════════════════════════════════════════════════════════
// GET /api/reports/professionals — Relatório de Profissionais
// ══════════════════════════════════════════════════════════════════════════════
const getProfessionalsReport = async (req, res) => {
  try {
    const p = parsePeriod(req.query);
    if (!p) return res.status(400).json({ success: false, message: 'startDate e endDate são obrigatórios.' });

    if (!isAdmin(req)) return res.status(403).json({ success: false, message: 'Acesso restrito ao administrador.' });

    const shop = shopId(req);

    const [byBarber, byBarberPrev, commissions] = await Promise.all([
      Appointment.aggregate([
        { $match: { barbershop: shop, date: { $gte: p.start, $lte: p.end } } },
        { $lookup: { from: 'services', localField: 'service', foreignField: '_id', as: 'svc' } },
        { $unwind: { path: '$svc', preserveNullAndEmptyArrays: true } },
        { $lookup: { from: 'users', localField: 'barber', foreignField: '_id', as: 'usr' } },
        { $unwind: { path: '$usr', preserveNullAndEmptyArrays: true } },
        { $group: {
          _id: '$barber',
          name: { $first: '$usr.name' },
          profileImage: { $first: '$usr.profileImage' },
          total: { $sum: 1 },
          completed: { $sum: { $cond: [{ $eq: ['$status', 'concluído'] }, 1, 0] } },
          cancelled: { $sum: { $cond: [{ $eq: ['$status', 'cancelado'] }, 1, 0] } },
          absent:    { $sum: { $cond: [{ $eq: ['$status', 'ausente'] }, 1, 0] } },
          revenue:   { $sum: { $cond: [{ $eq: ['$status', 'concluído'] }, { $ifNull: ['$svc.price', 0] }, 0] } },
        }},
        { $sort: { revenue: -1 } },
      ]),
      Appointment.aggregate([
        { $match: { barbershop: shop, date: { $gte: p.prevStart, $lte: p.prevEnd }, status: 'concluído' } },
        { $lookup: { from: 'services', localField: 'service', foreignField: '_id', as: 'svc' } },
        { $unwind: { path: '$svc', preserveNullAndEmptyArrays: true } },
        { $group: { _id: '$barber', revenue: { $sum: { $ifNull: ['$svc.price', 0] } }, completed: { $sum: 1 } } },
      ]),
      Commission.aggregate([
        { $match: { barbershop: shop, createdAt: { $gte: p.start, $lte: p.end } } },
        { $group: {
          _id: { barber: '$barber', status: '$status' },
          total: { $sum: '$commissionAmount' },
          count: { $sum: 1 },
        }},
      ]),
    ]);

    const prevMap = {};
    byBarberPrev.forEach(b => { prevMap[String(b._id)] = b; });

    const commMap = {};
    commissions.forEach(c => {
      const id = String(c._id.barber);
      if (!commMap[id]) commMap[id] = { pago: 0, pendente: 0 };
      commMap[id][c._id.status] = c.total;
    });

    const professionals = byBarber.map(b => {
      const id = String(b._id);
      const prev = prevMap[id];
      return {
        ...b,
        completionRate: b.total ? Math.round((b.completed / b.total) * 100) : 0,
        avgTicket: b.completed ? b.revenue / b.completed : 0,
        commissionPaid: commMap[id]?.pago || 0,
        commissionPending: commMap[id]?.pendente || 0,
        prevRevenue: prev?.revenue || 0,
        pctRevenue: pctChange(b.revenue, prev?.revenue || 0),
        prevCompleted: prev?.completed || 0,
        pctCompleted: pctChange(b.completed, prev?.completed || 0),
      };
    });

    res.json({
      success: true,
      data: {
        kpis: {
          totalProfessionals: { value: professionals.length },
          totalRevenue:       { value: professionals.reduce((s, p) => s + p.revenue, 0) },
          avgCompletionRate:  { value: professionals.length ? Math.round(professionals.reduce((s, p) => s + p.completionRate, 0) / professionals.length) : 0 },
          totalCommissions:   { value: Object.values(commMap).reduce((s, c) => s + c.pago + c.pendente, 0) },
        },
        professionals,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ══════════════════════════════════════════════════════════════════════════════
// GET /api/reports/agenda — Relatório de Agenda
// ══════════════════════════════════════════════════════════════════════════════
const getAgendaReport = async (req, res) => {
  try {
    const p = parsePeriod(req.query);
    if (!p) return res.status(400).json({ success: false, message: 'startDate e endDate são obrigatórios.' });

    const barberFilter = !isAdmin(req) ? { barber: req.user._id } : (req.query.barber ? { barber: new mongoose.Types.ObjectId(req.query.barber) } : {});
    const match = { barbershop: shopId(req), date: { $gte: p.start, $lte: p.end }, ...barberFilter };

    const [byStatus, byDayOfWeek, byHour, bySource, list] = await Promise.all([
      Appointment.aggregate([
        { $match: match },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      Appointment.aggregate([
        { $match: match },
        { $group: { _id: { $dayOfWeek: '$date' }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      Appointment.aggregate([
        { $match: match },
        { $group: { _id: { $hour: '$date' }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      Appointment.aggregate([
        { $match: match },
        { $group: { _id: { $ifNull: ['$source', 'manual'] }, count: { $sum: 1 } } },
      ]),
      Appointment.find(match)
        .populate('service', 'name price duration')
        .populate('barber', 'name')
        .populate('client', 'name phone')
        .sort({ date: -1 })
        .limit(200)
        .lean(),
    ]);

    const statusMap = {};
    byStatus.forEach(s => { statusMap[s._id] = s.count; });
    const total = Object.values(statusMap).reduce((s, c) => s + c, 0);

    const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const heatmapByDay = byDayOfWeek.map(d => ({ day: dayNames[d._id - 1] || '?', count: d.count }));

    res.json({
      success: true,
      data: {
        kpis: {
          total:      { value: total },
          completed:  { value: statusMap['concluído'] || 0 },
          cancelled:  { value: statusMap['cancelado'] || 0 },
          absent:     { value: statusMap['ausente'] || 0 },
          pending:    { value: statusMap['agendado'] || 0 },
          completionRate: { value: total ? Math.round(((statusMap['concluído'] || 0) / total) * 100) : 0 },
        },
        byStatus: Object.entries(statusMap).map(([status, count]) => ({ status, count })),
        byDayOfWeek: heatmapByDay,
        byHour: byHour.map(h => ({ hour: h._id, count: h.count })),
        bySource: bySource.map(s => ({ source: s._id, count: s.count })),
        list: list.map(a => ({
          id: a._id, clientName: a.clientName || a.client?.name || '—', service: a.service?.name || '—',
          price: a.service?.price || 0, duration: a.service?.duration || 0,
          barber: a.barber?.name || '—', date: a.date, status: a.status, source: a.source || 'manual',
        })),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ══════════════════════════════════════════════════════════════════════════════
// GET /api/reports/clients — Relatório de Clientes
// ══════════════════════════════════════════════════════════════════════════════
const getClientsReport = async (req, res) => {
  try {
    const p = parsePeriod(req.query);
    if (!p) return res.status(400).json({ success: false, message: 'startDate e endDate são obrigatórios.' });
    if (!isAdmin(req)) return res.status(403).json({ success: false, message: 'Acesso restrito ao administrador.' });

    const shop = shopId(req);

    const [totalClients, newClients, newClientsPrev, topClients, retentionData] = await Promise.all([
      Client.countDocuments({ barbershop: shop }),
      Client.countDocuments({ barbershop: shop, createdAt: { $gte: p.start, $lte: p.end } }),
      Client.countDocuments({ barbershop: shop, createdAt: { $gte: p.prevStart, $lte: p.prevEnd } }),
      Appointment.aggregate([
        { $match: { barbershop: shop, date: { $gte: p.start, $lte: p.end }, status: 'concluído', client: { $ne: null } } },
        { $lookup: { from: 'services', localField: 'service', foreignField: '_id', as: 'svc' } },
        { $unwind: { path: '$svc', preserveNullAndEmptyArrays: true } },
        { $group: {
          _id: '$client',
          name: { $first: '$clientName' },
          visits: { $sum: 1 },
          spent: { $sum: { $ifNull: ['$svc.price', 0] } },
          lastVisit: { $max: '$date' },
        }},
        { $sort: { spent: -1 } },
        { $limit: 20 },
        { $lookup: { from: 'clients', localField: '_id', foreignField: '_id', as: 'cl' } },
        { $unwind: { path: '$cl', preserveNullAndEmptyArrays: true } },
        { $project: { name: { $ifNull: ['$cl.name', '$name'] }, phone: '$cl.phone', visits: 1, spent: 1, lastVisit: 1 } },
      ]),
      // Unique clients in period vs previous
      Appointment.aggregate([
        { $match: { barbershop: shop, date: { $gte: p.start, $lte: p.end }, status: 'concluído', client: { $ne: null } } },
        { $group: { _id: '$client' } },
        { $count: 'uniqueClients' },
      ]),
    ]);

    const uniqueClients = retentionData[0]?.uniqueClients || 0;

    res.json({
      success: true,
      data: {
        kpis: {
          totalClients:  { value: totalClients },
          newClients:    { value: newClients, prev: newClientsPrev, pct: pctChange(newClients, newClientsPrev) },
          activeClients: { value: uniqueClients },
          avgSpent:      { value: topClients.length ? topClients.reduce((s, c) => s + c.spent, 0) / topClients.length : 0 },
        },
        topClients,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ══════════════════════════════════════════════════════════════════════════════
// GET /api/reports/stock — Relatório de Estoque
// ══════════════════════════════════════════════════════════════════════════════
const getStockReport = async (req, res) => {
  try {
    const p = parsePeriod(req.query);
    if (!p) return res.status(400).json({ success: false, message: 'startDate e endDate são obrigatórios.' });
    if (!isAdmin(req)) return res.status(403).json({ success: false, message: 'Acesso restrito ao administrador.' });

    const shop = shopId(req);

    const [products, movements, movementsPrev] = await Promise.all([
      Product.find({ barbershop: shop, active: true }).lean(),
      StockMovement.aggregate([
        { $match: { barbershop: shop, createdAt: { $gte: p.start, $lte: p.end } } },
        { $group: {
          _id: { type: '$type' },
          count: { $sum: 1 },
          qty: { $sum: '$quantity' },
          value: { $sum: { $multiply: ['$quantity', '$unitCost'] } },
        }},
      ]),
      StockMovement.aggregate([
        { $match: { barbershop: shop, createdAt: { $gte: p.prevStart, $lte: p.prevEnd } } },
        { $group: { _id: '$type', count: { $sum: 1 } } },
      ]),
    ]);

    const lowStock = products.filter(p => p.stock <= p.minStock && p.minStock > 0);
    const totalValue = products.reduce((s, p) => s + (p.stock * p.costPrice), 0);
    const forSale = products.filter(p => p.category === 'venda');

    const movMap = {};
    movements.forEach(m => { movMap[m._id.type] = m; });

    res.json({
      success: true,
      data: {
        kpis: {
          totalProducts: { value: products.length },
          totalValue:    { value: totalValue },
          lowStock:      { value: lowStock.length },
          forSale:       { value: forSale.length },
        },
        movements: {
          entrada: { count: movMap.entrada?.count || 0, qty: movMap.entrada?.qty || 0 },
          saida:   { count: movMap.saida?.count || 0, qty: movMap.saida?.qty || 0 },
          venda:   { count: movMap.venda?.count || 0, qty: movMap.venda?.qty || 0 },
          ajuste:  { count: movMap.ajuste?.count || 0, qty: movMap.ajuste?.qty || 0 },
        },
        lowStockProducts: lowStock.map(p => ({ id: p._id, name: p.name, stock: p.stock, minStock: p.minStock, unit: p.unit })),
        products: products.map(p => ({
          id: p._id, name: p.name, category: p.category, stock: p.stock, minStock: p.minStock,
          costPrice: p.costPrice, salePrice: p.salePrice, unit: p.unit,
          value: p.stock * p.costPrice,
        })),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ══════════════════════════════════════════════════════════════════════════════
// GET /api/reports/reception — Relatório de Recepção IA
// ══════════════════════════════════════════════════════════════════════════════
const getReceptionReport = async (req, res) => {
  try {
    const p = parsePeriod(req.query);
    if (!p) return res.status(400).json({ success: false, message: 'startDate e endDate são obrigatórios.' });
    if (!isAdmin(req)) return res.status(403).json({ success: false, message: 'Acesso restrito ao administrador.' });

    const shop = shopId(req);

    const [conversations, conversationsPrev, portalAppts] = await Promise.all([
      ReceptionConversation.find({ barbershop: shop, lastMessageAt: { $gte: p.start, $lte: p.end } }).lean(),
      ReceptionConversation.countDocuments({ barbershop: shop, lastMessageAt: { $gte: p.prevStart, $lte: p.prevEnd } }),
      Appointment.countDocuments({ barbershop: shop, source: 'portal', date: { $gte: p.start, $lte: p.end } }),
    ]);

    const totalConversations = conversations.length;
    const totalMessages = conversations.reduce((s, c) => s + (c.messages?.length || 0), 0);
    const avgMessages = totalConversations ? Math.round(totalMessages / totalConversations) : 0;

    res.json({
      success: true,
      data: {
        kpis: {
          totalConversations: { value: totalConversations, prev: conversationsPrev, pct: pctChange(totalConversations, conversationsPrev) },
          totalMessages:      { value: totalMessages },
          avgMessagesPerConv: { value: avgMessages },
          portalBookings:     { value: portalAppts },
        },
        conversations: conversations.slice(0, 50).map(c => ({
          id: c._id, contactName: c.contactName, contactPhone: c.contactPhone,
          messages: c.messages?.length || 0, lastMessage: c.lastMessageAt,
        })),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ══════════════════════════════════════════════════════════════════════════════
// POST /api/reports/custom — Relatório Personalizado
// ══════════════════════════════════════════════════════════════════════════════
const getCustomReport = async (req, res) => {
  try {
    const { source, startDate, endDate, groupBy, metric, filters } = req.body;
    if (!source || !startDate || !endDate) return res.status(400).json({ success: false, message: 'source, startDate e endDate são obrigatórios.' });

    const start = new Date(startDate + 'T00:00:00.000Z');
    const end   = new Date(endDate   + 'T23:59:59.999Z');
    const shop  = shopId(req);

    let collection, dateField, match, groupField, metricField;

    switch (source) {
      case 'appointments':
        collection = Appointment;
        dateField = 'date';
        match = { barbershop: shop, date: { $gte: start, $lte: end } };
        if (!isAdmin(req)) match.barber = req.user._id;
        if (filters?.barber) match.barber = new mongoose.Types.ObjectId(filters.barber);
        if (filters?.service) match.service = new mongoose.Types.ObjectId(filters.service);
        if (filters?.status) match.status = filters.status;
        break;
      case 'transactions':
        collection = Transaction;
        dateField = 'createdAt';
        match = { barbershop: shop, createdAt: { $gte: start, $lte: end } };
        if (filters?.type) match.type = filters.type;
        if (filters?.category) match.category = filters.category;
        if (filters?.paymentMethod) match.paymentMethod = filters.paymentMethod;
        break;
      case 'clients':
        collection = Client;
        dateField = 'createdAt';
        match = { barbershop: shop, createdAt: { $gte: start, $lte: end } };
        break;
      case 'products':
        collection = StockMovement;
        dateField = 'createdAt';
        match = { barbershop: shop, createdAt: { $gte: start, $lte: end } };
        if (filters?.type) match.type = filters.type;
        break;
      default:
        return res.status(400).json({ success: false, message: 'Fonte inválida.' });
    }

    // Build group key
    const groupExpr = {};
    switch (groupBy) {
      case 'day':
        groupExpr.period = { $dateToString: { format: '%Y-%m-%d', date: `$${dateField}` } };
        break;
      case 'week':
        groupExpr.period = { $dateToString: { format: '%Y-W%V', date: `$${dateField}` } };
        break;
      case 'month':
        groupExpr.period = { $dateToString: { format: '%Y-%m', date: `$${dateField}` } };
        break;
      case 'barber':
        groupExpr.period = '$barber';
        break;
      case 'service':
        groupExpr.period = '$service';
        break;
      case 'category':
        groupExpr.period = '$category';
        break;
      case 'paymentMethod':
        groupExpr.period = '$paymentMethod';
        break;
      default:
        groupExpr.period = { $dateToString: { format: '%Y-%m-%d', date: `$${dateField}` } };
    }

    // Build metric
    const metricExpr = {};
    switch (metric) {
      case 'count':
        metricExpr.value = { $sum: 1 };
        break;
      case 'sum':
        metricExpr.value = { $sum: '$amount' };
        if (source === 'appointments') metricExpr.value = { $sum: '$_servicePrice' };
        break;
      case 'avg':
        metricExpr.value = { $avg: '$amount' };
        break;
      default:
        metricExpr.value = { $sum: 1 };
    }

    const pipeline = [
      { $match: match },
      { $group: { _id: groupExpr, ...metricExpr } },
      { $sort: { '_id.period': 1 } },
    ];

    // For appointments with sum, we need a lookup
    if (source === 'appointments' && metric === 'sum') {
      pipeline.splice(1, 0,
        { $lookup: { from: 'services', localField: 'service', foreignField: '_id', as: 'svc' } },
        { $unwind: { path: '$svc', preserveNullAndEmptyArrays: true } },
        { $addFields: { _servicePrice: { $ifNull: ['$svc.price', 0] } } },
      );
      pipeline[4] = { $group: { _id: groupExpr, value: { $sum: '$_servicePrice' } } };
    }

    // For barber/service grouping, add lookup for names
    const result = await collection.aggregate(pipeline);

    // Resolve names if grouped by barber or service
    let data = result.map(r => ({ label: r._id?.period || 'N/A', value: r.value }));

    if (groupBy === 'barber') {
      const ids = result.map(r => r._id?.period).filter(Boolean);
      const users = await User.find({ _id: { $in: ids } }, 'name').lean();
      const nameMap = {};
      users.forEach(u => { nameMap[String(u._id)] = u.name; });
      data = data.map(d => ({ ...d, label: nameMap[String(d.label)] || String(d.label) }));
    }
    if (groupBy === 'service') {
      const ids = result.map(r => r._id?.period).filter(Boolean);
      const svcs = await Service.find({ _id: { $in: ids } }, 'name').lean();
      const nameMap = {};
      svcs.forEach(s => { nameMap[String(s._id)] = s.name; });
      data = data.map(d => ({ ...d, label: nameMap[String(d.label)] || String(d.label) }));
    }

    res.json({ success: true, data: { rows: data, total: data.reduce((s, d) => s + d.value, 0) } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ══════════════════════════════════════════════════════════════════════════════
// GET /api/reports/filters — Available filter options
// ══════════════════════════════════════════════════════════════════════════════
const getFilterOptions = async (req, res) => {
  try {
    const shop = shopId(req);
    const [barbers, services, paymentMethods] = await Promise.all([
      isAdmin(req) ? User.find({ barbershop: shop }, 'name profileImage role').lean() : [req.user],
      Service.find({ barbershop: shop, active: true }, 'name price').sort({ name: 1 }).lean(),
      Transaction.distinct('paymentMethod', { barbershop: shop }),
    ]);

    res.json({
      success: true,
      data: { barbers, services, paymentMethods: paymentMethods.filter(Boolean) },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ══════════════════════════════════════════════════════════════════════════════
// POST/GET/PUT/DELETE /api/reports/saved — Saved custom reports (localStorage on client)
// We keep this simple — saved reports are stored client-side
// ══════════════════════════════════════════════════════════════════════════════

module.exports = {
  getReport,
  getOverview,
  getServicesReport,
  getSalesReport,
  getFinancialReport,
  getProfessionalsReport,
  getAgendaReport,
  getClientsReport,
  getStockReport,
  getReceptionReport,
  getCustomReport,
  getFilterOptions,
};
