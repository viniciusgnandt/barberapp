// middleware/platformAdminAuth.js — JWT auth for platform administrators

const jwt           = require('jsonwebtoken');
const PlatformAdmin = require('../models/PlatformAdmin');

async function platformAdminAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer '))
    return res.status(401).json({ success: false, message: 'Token não fornecido.' });

  try {
    const decoded = jwt.verify(header.split(' ')[1], process.env.JWT_SECRET);
    if (decoded.type !== 'platform-admin')
      return res.status(401).json({ success: false, message: 'Token inválido.' });

    const admin = await PlatformAdmin.findById(decoded.id);
    if (!admin || !admin.active)
      return res.status(401).json({ success: false, message: 'Admin não encontrado ou inativo.' });

    req.platformAdmin = admin;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError')
      return res.status(401).json({ success: false, message: 'Sessão expirada.' });
    return res.status(401).json({ success: false, message: 'Token inválido.' });
  }
}

function superadminOnly(req, res, next) {
  if (req.platformAdmin?.role !== 'superadmin')
    return res.status(403).json({ success: false, message: 'Acesso restrito a superadmin.' });
  next();
}

module.exports = { platformAdminAuth, superadminOnly };
