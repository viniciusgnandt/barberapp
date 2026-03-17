// middleware/clientAuthMiddleware.js
const jwt        = require('jsonwebtoken');
const ClientUser = require('../models/ClientUser');

module.exports = async (req, res, next) => {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer '))
    return res.status(401).json({ success: false, message: 'Token necessário.' });

  try {
    const decoded = jwt.verify(auth.slice(7), process.env.JWT_SECRET);
    if (decoded.type !== 'client')
      return res.status(401).json({ success: false, message: 'Token inválido.' });

    const client = await ClientUser.findById(decoded.id);
    if (!client)
      return res.status(401).json({ success: false, message: 'Usuário não encontrado.' });

    req.client = client;
    next();
  } catch {
    return res.status(401).json({ success: false, message: 'Token inválido ou expirado.' });
  }
};
