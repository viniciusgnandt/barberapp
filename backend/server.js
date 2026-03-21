// server.js — Ponto de entrada da API

const express = require('express');
const cors    = require('cors');
require('dotenv').config();

const connectDB         = require('./config/db');
const { reconnectAll }  = require('./services/whatsappService');
const { startNotificationScheduler } = require('./services/notificationService');
const rateLimit         = require('./middleware/rateLimit');
const bruteForce        = require('./middleware/bruteForce');
const securityHeaders   = require('./middleware/securityHeaders');
const sanitize          = require('./middleware/sanitize');
const { handleWebhook } = require('./controllers/billingController');
const { seedInitialAdmin } = require('./scripts/seedAdmin');

connectDB().then(() => {
  reconnectAll().catch(() => {});
  startNotificationScheduler();
  seedInitialAdmin().catch(() => {});
}).catch(() => {});

const app = express();

// ── Security Headers (helmet + custom) ───────────────────────────────────────
app.use(securityHeaders());

// ── CORS ──────────────────────────────────────────────────────────────────────
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : ['http://localhost:5173', 'http://localhost:5500', 'http://127.0.0.1:5500'];

app.use(cors({ origin: allowedOrigins, credentials: true }));

// ── Trust proxy (for correct IP in rate limiting behind reverse proxy) ────────
app.set('trust proxy', 1);

// ── Stripe webhook — raw body BEFORE express.json() ──────────────────────────
app.post('/api/billing/webhook', express.raw({ type: 'application/json' }), handleWebhook);

// ── Body parsing ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// ── Input sanitization (strip $ operators, trim strings) ─────────────────────
app.use(sanitize);

// ── JSON syntax error handler ────────────────────────────────────────────────
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    console.error('JSON malformado:', err.message);
    return res.status(400).json({ success: false, message: 'Requisição com JSON inválido' });
  }
  next();
});

// ── Rate limiting ─────────────────────────────────────────────────────────────
const loginLimit = rateLimit({
  windowMs: 60_000,
  max:      10,
  message:  'Muitas tentativas de login. Aguarde 1 minuto.',
});

const forgotLimit = rateLimit({
  windowMs: 15 * 60_000,
  max:      5,
  message:  'Muitas solicitações de recuperação de senha. Aguarde 15 minutos.',
});

const chatLimit = rateLimit({
  windowMs: 60_000,
  max:      20,
  message:  'Limite de mensagens atingido. Aguarde 1 minuto.',
});

const apiLimit = rateLimit({
  windowMs: 60_000,
  max:      100,
  message:  'Limite de requisições excedido. Aguarde.',
});

// Brute force protection on login endpoints
const loginBruteForce = bruteForce();

app.use('/api/auth/login',                     loginLimit, loginBruteForce);
app.use('/api/auth/forgot-password',           forgotLimit);
app.use('/api/portal/auth/login',              loginLimit, loginBruteForce);
app.use('/api/portal/auth/forgot-password',    forgotLimit);
app.use('/api/portal/auth/reset-password',     forgotLimit);
app.use('/api/chat/message',                   chatLimit);
app.use('/api/platform/auth/login',            loginLimit, loginBruteForce);

// General API rate limit (moderate)
app.use('/api/', apiLimit);

// ── Rotas da API ─────────────────────────────────────────────────────────────
app.use('/api/auth',                require('./routes/authRoutes'));
app.use('/api/users',               require('./routes/userRoutes'));
app.use('/api/barbershops',         require('./routes/barbershopRoutes'));
app.use('/api/services',            require('./routes/serviceRoutes'));
app.use('/api/appointments',        require('./routes/appointmentRoutes'));
app.use('/api/clients',             require('./routes/clientRoutes'));
app.use('/api/upload',              require('./routes/uploadRoutes'));
app.use('/api/reports',             require('./routes/reportRoutes'));
app.use('/api/billing',             require('./routes/billingRoutes'));
app.use('/api/products',            require('./routes/productRoutes'));
app.use('/api/service-categories',  require('./routes/serviceCategoryRoutes'));
app.use('/api/roles',               require('./routes/roleRoutes'));
app.use('/api/reception',           require('./routes/receptionRoutes'));
app.use('/api/chat',                require('./routes/chatRoutes'));
app.use('/api/portal',              require('./routes/portalRoutes'));

// ── New modules ──────────────────────────────────────────────────────────────
app.use('/api/platform',            require('./routes/platformAdminRoutes'));
app.use('/api/financial',           require('./routes/financialRoutes'));

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) =>
  res.json({ success: true, message: 'API online', ts: new Date() })
);

// ── Erro global ───────────────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: 'Erro interno.' });
});

// ── Start ─────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀  API rodando em http://localhost:${PORT}`);
});
