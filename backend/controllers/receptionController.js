// controllers/receptionController.js

const ReceptionSession      = require('../models/ReceptionSession');
const ReceptionConversation = require('../models/ReceptionConversation');
const Barbershop            = require('../models/Barbershop');
const whatsappService       = require('../services/whatsappService');

// GET /api/reception/status
const getStatus = async (req, res) => {
  try {
    const barbershopId = req.user.barbershop._id;
    const session = await ReceptionSession.findOne({ barbershop: barbershopId });
    res.json({ success: true, data: session || { status: 'disconnected' } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/reception/qr — SSE stream (token via query param for EventSource compat)
const subscribeQr = (req, res) => {
  const barbershopId = String(req.user.barbershop._id);

  res.setHeader('Content-Type',  'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection',    'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  // Heartbeat to keep connection alive
  const heartbeat = setInterval(() => {
    try { res.write(':heartbeat\n\n'); } catch (_) { clearInterval(heartbeat); }
  }, 20000);

  whatsappService.addSseSubscriber(barbershopId, res);

  req.on('close', () => {
    clearInterval(heartbeat);
    whatsappService.removeSseSubscriber(barbershopId, res);
  });
};

// POST /api/reception/connect
const connect = async (req, res) => {
  try {
    const barbershopId   = String(req.user.barbershop._id);
    const barbershopName = req.user.barbershop.name;

    await whatsappService.createClient(barbershopId, barbershopName);

    res.json({ success: true, message: 'Conectando WhatsApp...' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/reception/disconnect
const disconnect = async (req, res) => {
  try {
    const barbershopId = String(req.user.barbershop._id);
    await whatsappService.destroyClient(barbershopId);
    res.json({ success: true, message: 'WhatsApp desconectado.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/reception/conversations
const getConversations = async (req, res) => {
  try {
    const barbershopId = req.user.barbershop._id;
    const convos = await ReceptionConversation
      .find({ barbershop: barbershopId, contactPhone: { $not: /^chat_/ } })
      .sort({ lastMessageAt: -1 })
      .select('contactPhone contactName contactPhoto lastMessageAt messages');
    res.json({ success: true, data: convos });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/reception/conversations/:id
const getConversation = async (req, res) => {
  try {
    const convo = await ReceptionConversation.findOne({
      _id:        req.params.id,
      barbershop: req.user.barbershop._id,
    });
    if (!convo) return res.status(404).json({ success: false, message: 'Conversa não encontrada.' });
    res.json({ success: true, data: convo });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/reception/usage
const getUsage = async (req, res) => {
  try {
    const barbershopId = req.user.barbershop._id;

    // Optional date filter
    const filterStart = req.query.startDate ? new Date(req.query.startDate + 'T00:00:00') : null;
    const filterEnd   = req.query.endDate   ? new Date(req.query.endDate   + 'T23:59:59') : null;

    const convos = await ReceptionConversation.find({ barbershop: barbershopId }).select('messages contactPhone');

    const now = new Date();

    // ── Billing cycle window ──────────────────────────────────────────────────
    const shop = await Barbershop.findById(barbershopId).select('planExpiresAt createdAt messagePackages');
    let cicloFim;
    if (shop?.planExpiresAt) {
      cicloFim = new Date(shop.planExpiresAt);
    } else {
      const base = shop?.createdAt || now;
      cicloFim   = new Date(base.getTime() + 30 * 24 * 60 * 60 * 1000);
    }
    const cicloInicio = new Date(cicloFim.getTime() - 30 * 24 * 60 * 60 * 1000);

    // ── Month map: dynamic range if filtered, else last 6 months ─────────────
    const monthMap = {};
    if (filterStart && filterEnd) {
      let d = new Date(filterStart.getFullYear(), filterStart.getMonth(), 1);
      const last = new Date(filterEnd.getFullYear(), filterEnd.getMonth(), 1);
      while (d <= last) {
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        monthMap[key] = { mes: key, mensagens: 0 };
        d = new Date(d.getFullYear(), d.getMonth() + 1, 1);
      }
    } else {
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        monthMap[key] = { mes: key, mensagens: 0 };
      }
    }

    // ── Aggregate ─────────────────────────────────────────────────────────────
    let totalAI        = 0;
    let cicloAI        = 0;
    const allContacts  = new Set();
    const filtContacts = new Set();
    let filtConversas  = 0;

    convos.forEach(convo => {
      allContacts.add(convo.contactPhone);
      let convoHasFilt = false;
      convo.messages.forEach(msg => {
        if (msg.role !== 'assistant') return;
        if (msg.timestamp >= cicloInicio && msg.timestamp <= cicloFim) cicloAI++;
        if (filterStart && msg.timestamp < filterStart) return;
        if (filterEnd   && msg.timestamp > filterEnd)   return;
        totalAI++;
        convoHasFilt = true;
        filtContacts.add(convo.contactPhone);
        const key = `${msg.timestamp.getFullYear()}-${String(msg.timestamp.getMonth() + 1).padStart(2, '0')}`;
        if (monthMap[key]) monthMap[key].mensagens++;
      });
      if (convoHasFilt) filtConversas++;
    });

    const isFiltered = !!(filterStart || filterEnd);

    // ── Package info ──────────────────────────────────────────────────────────
    const BASE_LIMIT       = 2000;
    const activePackages   = (shop.messagePackages || []).filter(p => p.remaining > 0 && p.expiresAt > now);
    const packageRemaining = activePackages.reduce((sum, p) => sum + p.remaining, 0);
    const packageUsed      = Math.max(0, cicloAI - BASE_LIMIT);
    const totalDisponivel  = BASE_LIMIT + packageRemaining;

    res.json({
      success: true,
      data: {
        limite:           BASE_LIMIT,
        mensagensCiclo:   cicloAI,
        packageUsed,
        packageRemaining,
        totalDisponivel,
        pacotes:          activePackages.map(p => ({
          id:          p._id,
          messages:    p.messages,
          remaining:   p.remaining,
          recurring:   p.recurring,
          purchasedAt: p.purchasedAt,
          expiresAt:   p.expiresAt,
        })),
        cicloInicio:      cicloInicio.toISOString(),
        cicloFim:         cicloFim.toISOString(),
        totalMensagens:   totalAI,
        totalContatos:    isFiltered ? filtContacts.size : allContacts.size,
        totalConversas:   isFiltered ? filtConversas      : convos.length,
        porMes:           Object.values(monthMap),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { getStatus, subscribeQr, connect, disconnect, getConversations, getConversation, getUsage };
