// controllers/chatController.js — Lia chat assistant

const ReceptionConversation = require('../models/ReceptionConversation');
const Barbershop             = require('../models/Barbershop');
const { generateChatReply } = require('../services/chatService');

// POST /api/chat/message
const sendMessage = async (req, res) => {
  try {
    const { message, history = [] } = req.body;
    if (!message?.trim()) return res.status(400).json({ success: false, message: 'Mensagem obrigatória.' });

    const barbershopId   = req.user.barbershop._id;
    const userId         = req.user._id;
    const barbershopName = req.user.barbershop.name;

    // ── Usage check ───────────────────────────────────────────────────────────
    const shop = await Barbershop.findById(barbershopId).select('planExpiresAt createdAt messagePackages');
    const now  = new Date();
    let cicloFim = shop?.planExpiresAt
      ? new Date(shop.planExpiresAt)
      : new Date((shop?.createdAt || now).getTime() + 30 * 24 * 60 * 60 * 1000);
    const cicloInicio = new Date(cicloFim.getTime() - 30 * 24 * 60 * 60 * 1000);

    const contactPhone = `chat_${userId}`;
    let convo = await ReceptionConversation.findOne({ barbershop: barbershopId, contactPhone });
    if (!convo) {
      convo = await ReceptionConversation.create({
        barbershop:   barbershopId,
        contactPhone,
        contactName:  req.user.name,
        messages:     [],
      });
    }

    // Count all AI messages in cycle (across all conversations for this barbershop)
    const allConvos = await ReceptionConversation.find({ barbershop: barbershopId }).select('messages');
    const cycleAI   = allConvos.reduce((sum, c) =>
      sum + c.messages.filter(m => m.role === 'assistant' && m.timestamp >= cicloInicio && m.timestamp <= cicloFim).length,
      0
    );

    // Active packages (only used after base 2000)
    const BASE_LIMIT       = 2000;
    const activePackages   = (shop.messagePackages || []).filter(p => p.remaining > 0 && p.expiresAt > now);
    const packageRemaining = activePackages.reduce((s, p) => s + p.remaining, 0);
    const totalLimit       = BASE_LIMIT + packageRemaining;

    if (cycleAI >= totalLimit) {
      return res.status(429).json({ success: false, message: 'Limite de mensagens atingido. Contrate um pacote adicional para continuar.' });
    }

    // If over base limit, deduct from oldest active package
    if (cycleAI >= BASE_LIMIT && activePackages.length > 0) {
      const oldest = shop.messagePackages.find(p => p.remaining > 0 && p.expiresAt > now);
      if (oldest) {
        oldest.remaining -= 1;
        await shop.save();
      }
    }

    // ── Generate reply ────────────────────────────────────────────────────────
    const messages = [...history, { role: 'user', content: message }];
    const reply = await generateChatReply(barbershopName, messages, { barbershopId: String(barbershopId) });

    // ── Persist ───────────────────────────────────────────────────────────────
    convo.messages.push({ role: 'user',      content: message, timestamp: now });
    convo.messages.push({ role: 'assistant', content: reply,   timestamp: new Date() });
    convo.lastMessageAt = new Date();
    await convo.save();

    res.json({ success: true, data: { reply } });
  } catch (err) {
    console.error('[chatController.sendMessage]', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { sendMessage };
