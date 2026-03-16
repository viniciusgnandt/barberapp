// services/whatsappService.js — WhatsApp client manager (one per barbershop)

const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode  = require('qrcode');
const ReceptionSession      = require('../models/ReceptionSession');
const ReceptionConversation = require('../models/ReceptionConversation');
const { generateReply }     = require('./claudeService');

// ── In-memory state ───────────────────────────────────────────────────────────

const clients        = new Map(); // barbershopId -> Client
const sseSubscribers = new Map(); // barbershopId -> Set<res>
const lastQr         = new Map(); // barbershopId -> base64 QR (latest pending QR)

// ── SSE helpers ───────────────────────────────────────────────────────────────

function getSubscribers(barbershopId) {
  if (!sseSubscribers.has(barbershopId)) sseSubscribers.set(barbershopId, new Set());
  return sseSubscribers.get(barbershopId);
}

function broadcast(barbershopId, event, data) {
  const msg = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  getSubscribers(barbershopId).forEach(res => {
    try { res.write(msg); } catch (_) { getSubscribers(barbershopId).delete(res); }
  });
}

function addSseSubscriber(barbershopId, res) {
  getSubscribers(barbershopId).add(res);
  // Send pending QR immediately so the subscriber doesn't wait for next refresh
  const qr = lastQr.get(barbershopId);
  if (qr) {
    try { res.write(`event: qr\ndata: ${JSON.stringify({ qr })}\n\n`); } catch (_) {}
  }
}

function removeSseSubscriber(barbershopId, res) {
  getSubscribers(barbershopId)?.delete(res);
}

// ── Client lifecycle ──────────────────────────────────────────────────────────

async function createClient(barbershopId, barbershopName) {
  if (clients.has(barbershopId)) return; // already running

  const client = new Client({
    authStrategy: new LocalAuth({
      clientId: String(barbershopId),
      dataPath:  './.wwebjs_auth',
    }),
    puppeteer: {
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    },
  });

  clients.set(barbershopId, client);

  await ReceptionSession.findOneAndUpdate(
    { barbershop: barbershopId },
    { status: 'connecting', phone: null, connectedAt: null },
    { upsert: true }
  );

  client.on('qr', async (qr) => {
    const qrImage = await qrcode.toDataURL(qr);
    lastQr.set(barbershopId, qrImage);
    broadcast(barbershopId, 'qr', { qr: qrImage });
    await ReceptionSession.findOneAndUpdate({ barbershop: barbershopId }, { status: 'connecting' });
  });

  client.on('ready', async () => {
    lastQr.delete(barbershopId);
    const info = client.info;
    await ReceptionSession.findOneAndUpdate(
      { barbershop: barbershopId },
      { status: 'connected', phone: info.wid.user, connectedAt: new Date() }
    );
    broadcast(barbershopId, 'connected', { phone: info.wid.user });
  });

  client.on('auth_failure', async () => {
    clients.delete(barbershopId);
    lastQr.delete(barbershopId);
    await ReceptionSession.findOneAndUpdate(
      { barbershop: barbershopId },
      { status: 'disconnected', phone: null, connectedAt: null }
    );
    broadcast(barbershopId, 'disconnected', { reason: 'auth_failure' });
  });

  client.on('disconnected', async () => {
    clients.delete(barbershopId);
    lastQr.delete(barbershopId);
    await ReceptionSession.findOneAndUpdate(
      { barbershop: barbershopId },
      { status: 'disconnected', phone: null, connectedAt: null }
    );
    broadcast(barbershopId, 'disconnected', {});
  });

  client.on('message', async (msg) => {
    if (msg.fromMe || msg.isStatus) return;
    if (!msg.body?.trim()) return; // ignore media/sticker/voice without caption

    const contact = await msg.getContact().catch(() => null);
    const phone   = msg.from.replace('@c.us', '');
    const name    = contact?.pushname || contact?.name || phone;

    // Upsert conversation
    let convo = await ReceptionConversation.findOneAndUpdate(
      { barbershop: barbershopId, contactPhone: phone },
      { $setOnInsert: { contactName: name }, $set: { lastMessageAt: new Date() } },
      { upsert: true, new: true }
    );

    if (convo.contactName !== name) {
      convo.contactName = name;
    }

    convo.messages.push({ role: 'user', content: msg.body });
    await convo.save();

    broadcast(barbershopId, 'message', {
      conversationId: convo._id,
      contactPhone:   phone,
      contactName:    name,
      message: { role: 'user', content: msg.body, timestamp: new Date() },
    });

    // Generate AI reply
    try {
      const reply = await generateReply(barbershopName, convo.messages, { barbershopId, contactPhone: phone, contactName: name });
      convo.messages.push({ role: 'assistant', content: reply });
      convo.lastMessageAt = new Date();
      await convo.save();

      await client.sendMessage(msg.from, reply);

      broadcast(barbershopId, 'message', {
        conversationId: convo._id,
        contactPhone:   phone,
        contactName:    name,
        message: { role: 'assistant', content: reply, timestamp: new Date() },
      });
    } catch (err) {
      console.error('[Reception] Error generating reply:', err.message);
    }
  });

  client.initialize().catch(err => {
    console.error('[Reception] Client init error:', err.message);
    clients.delete(barbershopId);
  });
}

async function destroyClient(barbershopId) {
  const client = clients.get(barbershopId);
  if (client) {
    try { await client.destroy(); } catch (_) {}
    clients.delete(barbershopId);
  }
  lastQr.delete(barbershopId);
  await ReceptionSession.findOneAndUpdate(
    { barbershop: barbershopId },
    { status: 'disconnected', phone: null, connectedAt: null }
  );
  broadcast(barbershopId, 'disconnected', {});
}

// ── Auto-reconnect on startup ─────────────────────────────────────────────────

async function reconnectAll() {
  const Barbershop = require('../models/Barbershop');
  const sessions   = await ReceptionSession.find({ status: { $in: ['connected', 'connecting'] } });
  for (const session of sessions) {
    const shop = await Barbershop.findById(session.barbershop).select('name');
    if (!shop) continue;
    const id = String(session.barbershop);
    console.log(`[Reception] Reconectando WhatsApp: ${shop.name}…`);
    createClient(id, shop.name).catch(err =>
      console.error(`[Reception] Falha ao reconectar ${shop.name}:`, err.message)
    );
  }
}

module.exports = { createClient, destroyClient, addSseSubscriber, removeSseSubscriber, reconnectAll };
