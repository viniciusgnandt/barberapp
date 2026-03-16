// controllers/receptionController.js

const ReceptionSession      = require('../models/ReceptionSession');
const ReceptionConversation = require('../models/ReceptionConversation');
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
      .find({ barbershop: barbershopId })
      .sort({ lastMessageAt: -1 })
      .select('contactPhone contactName lastMessageAt messages');
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

module.exports = { getStatus, subscribeQr, connect, disconnect, getConversations, getConversation };
