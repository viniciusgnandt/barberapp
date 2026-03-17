// routes/receptionRoutes.js

const router = require('express').Router();
const { authMiddleware } = require('../middleware/authMiddleware');
const {
  getStatus, subscribeQr, connect, disconnect, getConversations, getConversation, getUsage,
} = require('../controllers/receptionController');

// SSE-compatible auth: EventSource can't set headers, so accept token via query param
const sseAuth = (req, res, next) => {
  if (req.query.token) req.headers.authorization = `Bearer ${req.query.token}`;
  return authMiddleware(req, res, next);
};

const adminOnly = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Acesso restrito ao administrador.' });
  }
  next();
};

const auth = [authMiddleware, adminOnly];

router.get('/status',            ...auth,           getStatus);
router.get('/qr',                sseAuth, adminOnly, subscribeQr);
router.post('/connect',          ...auth,           connect);
router.post('/disconnect',       ...auth,           disconnect);
router.get('/conversations',     ...auth,           getConversations);
router.get('/conversations/:id', ...auth,           getConversation);
router.get('/usage',             ...auth,           getUsage);

module.exports = router;
