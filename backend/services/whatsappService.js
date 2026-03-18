// services/whatsappService.js — WhatsApp client manager (one per barbershop)

const { Client, RemoteAuth } = require('whatsapp-web.js');
const qrcode             = require('qrcode');
const fs                 = require('fs');
const path               = require('path');

// Persistent local directory — survives nodemon restarts and OS reboots (kept in .gitignore)
const WWEBJS_DATA_PATH = path.join(__dirname, '../.wwebjs_auth');
fs.mkdirSync(WWEBJS_DATA_PATH, { recursive: true });

// Prevent unhandled rejection crashes from RemoteAuth internal ENOENT
// (happens on Windows when Chrome locks session files during compressSession)
process.on('unhandledRejection', (reason) => {
  if (reason?.code === 'ENOENT' && String(reason?.path).includes('wwebjs_temp_session')) {
    console.warn('[Reception] Aviso: falha ao compactar sessão WhatsApp localmente (o backup automático tentará novamente):', reason.message);
    return;
  }
  // Re-throw other unhandled rejections so they're not silently swallowed
  console.error('[UnhandledRejection]', reason);
});
const ReceptionSession      = require('../models/ReceptionSession');
const ReceptionConversation = require('../models/ReceptionConversation');
const { generateReply }     = require('./claudeService');
const OCIWhatsappStore      = require('./ociWhatsappStore');
const { ociPut, syncCacheFromBucket, syncCacheToBucket } = require('./ociWhatsappStore');

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

// ── Temp file cleanup ─────────────────────────────────────────────────────────

function cleanTempSession(barbershopId) {
  const tempDir = path.join(WWEBJS_DATA_PATH, `RemoteAuth-${barbershopId}`);
  try {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
      console.log(`[Reception] Temp session removido: ${tempDir}`);
    }
  } catch (err) {
    console.warn(`[Reception] Falha ao remover temp session: ${err.message}`);
  }
}

// ── Client lifecycle ──────────────────────────────────────────────────────────

async function createClient(barbershopId, barbershopName) {
  if (!barbershopId || barbershopId === 'undefined' || barbershopId === 'null') {
    throw new Error(`createClient chamado com barbershopId inválido: ${barbershopId}`);
  }
  if (clients.has(barbershopId)) return; // already running

  const client = new Client({
    authStrategy: new RemoteAuth({
      clientId:             String(barbershopId),
      store:                new OCIWhatsappStore(),
      backupSyncIntervalMs: 300000, // sincroniza com o bucket a cada 5 min
      dataPath:             WWEBJS_DATA_PATH,
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

    // Upload cache to bucket and remove from disk (best-effort)
    syncCacheToBucket().catch(err =>
      console.warn('[Reception] Cache upload to bucket failed:', err.message)
    );
  });

  // Emitido pelo RemoteAuth após salvar o zip no bucket
  client.on('remote_session_saved', () => {
    console.log(`[Reception] Sessão salva no bucket para ${barbershopId}`);
    cleanTempSession(barbershopId);
  });

  client.on('auth_failure', async () => {
    clients.delete(barbershopId);
    lastQr.delete(barbershopId);
    cleanTempSession(barbershopId);
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
    // contact.id.user has the real phone (e.g. 5511952424483); msg.from may be @lid
    const phone   = contact?.id?.user || msg.from.replace(/@.*$/, '');
    const name    = contact?.pushname || contact?.name || phone;
    const photo   = await contact?.getProfilePicUrl().catch(() => null) || null;

    // Upsert conversation
    let convo = await ReceptionConversation.findOneAndUpdate(
      { barbershop: barbershopId, contactPhone: phone },
      { $setOnInsert: { contactName: name }, $set: { lastMessageAt: new Date() } },
      { upsert: true, new: true }
    );

    if (convo.contactName !== name) convo.contactName = name;
    if (photo && convo.contactPhoto !== photo) convo.contactPhoto = photo;

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

  // ── Pre-init: backup session to bucket BEFORE Chrome starts (no file locks) ──
  // This ensures the bucket always has the latest session, even if gracefulShutdown
  // did not run (e.g. nodemon force-kill on Windows).
  await saveSessionToBucket(barbershopId).catch(err =>
    console.warn('[Reception] Pre-init session backup skipped:', err.message)
  );

  // Restore cache from bucket if not on disk (best-effort)
  await syncCacheFromBucket().catch(err =>
    console.warn('[Reception] Cache sync from bucket failed:', err.message)
  );

  client.initialize().catch(err => {
    console.error('[Reception] Client init error:', err.message);
    clients.delete(barbershopId);
  });
}

async function destroyClient(barbershopId) {
  const client = clients.get(barbershopId);
  if (client) {
    try { await client.destroy(); } catch (_) {}
    cleanTempSession(barbershopId);
    clients.delete(barbershopId);
  }
  lastQr.delete(barbershopId);
  await ReceptionSession.findOneAndUpdate(
    { barbershop: barbershopId },
    { status: 'disconnected', phone: null, connectedAt: null }
  );
  broadcast(barbershopId, 'disconnected', {});
}

// ── Graceful shutdown — save sessions to bucket before exit ───────────────────
// Nodemon sends SIGTERM on each restart; we stop Chrome (releases file locks),
// zip the session dir and upload to OCI so the next start auto-restores it.

async function saveSessionToBucket(barbershopId) {
  const sessionName = `RemoteAuth-${barbershopId}`;
  const userDataDir = path.join(WWEBJS_DATA_PATH, sessionName);
  if (!fs.existsSync(userDataDir)) return;

  const archiver = require('archiver');
  const zipPath  = path.join(WWEBJS_DATA_PATH, `${sessionName}.zip`);
  const chunks   = [];

  await new Promise((resolve, reject) => {
    const archive = archiver('zip');
    archive.on('error', reject);
    archive.on('data', c => chunks.push(c));
    archive.on('end', resolve);
    archive.directory(userDataDir, false);
    archive.finalize();
  });

  const buffer = Buffer.concat(chunks);
  await ociPut(`whatsapp-sessions/${sessionName}.zip`, buffer);
  console.log(`[Reception] Sessão ${sessionName} salva no bucket ao encerrar.`);

  // Clean up local zip if created
  if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
}

async function gracefulShutdown(signal) {
  console.log(`[Reception] ${signal} recebido — salvando sessões antes de encerrar...`);
  const promises = [];
  for (const [barbershopId, client] of clients) {
    promises.push(
      client.destroy()
        .catch(() => {})
        .then(() => saveSessionToBucket(barbershopId))
        .catch(err => console.warn(`[Reception] Falha ao salvar sessão ${barbershopId}:`, err.message))
    );
  }
  await Promise.all(promises);
  console.log('[Reception] Sessões salvas. Encerrando.');
  process.exit(0);
}

let _shutdownRegistered = false;
function registerShutdownHandlers() {
  if (_shutdownRegistered) return;
  _shutdownRegistered = true;
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT',  () => gracefulShutdown('SIGINT'));
}

// ── Auto-reconnect on startup ─────────────────────────────────────────────────

async function reconnectAll() {
  registerShutdownHandlers();
  const Barbershop = require('../models/Barbershop');
  const sessions   = await ReceptionSession.find({ status: { $in: ['connected', 'connecting'] } });
  for (const session of sessions) {
    if (!session.barbershop) continue;
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
