// server.js — Ponto de entrada da API

const express = require('express');
const cors    = require('cors');
require('dotenv').config();

const connectDB = require('./config/db');

connectDB();

const app = express();

// ── Middlewares ────────────────────────────────────────────────────────────────
app.use(cors());          // Aceita requisições do frontend (localhost:5500)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Middleware para tratar erros JSON
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    console.error('JSON malformado:', err.message);
    return res.status(400).json({ success: false, message: 'Requisição com JSON inválido' });
  }
  next();
});

// ── Rotas da API ───────────────────────────────────────────────────────────────
app.use('/api/auth',         require('./routes/authRoutes'));
app.use('/api/users',        require('./routes/userRoutes'));
app.use('/api/barbershops',  require('./routes/barbershopRoutes'));
app.use('/api/services',     require('./routes/serviceRoutes'));
app.use('/api/appointments', require('./routes/appointmentRoutes'));
app.use('/api/clients',      require('./routes/clientRoutes'));
app.use('/api/upload',       require('./routes/uploadRoutes'));
app.use('/api/reports',      require('./routes/reportRoutes'));
app.use('/api/billing',      require('./routes/billingRoutes'));
app.use('/api/products',     require('./routes/productRoutes'));
app.use('/api/service-categories', require('./routes/serviceCategoryRoutes'));

// ── Health check ───────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) =>
  res.json({ success: true, message: 'API online', ts: new Date() })
);

// ── Erro global ────────────────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: 'Erro interno.' });
});

// ── Start ──────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀  API rodando em http://localhost:${PORT}`);
});
