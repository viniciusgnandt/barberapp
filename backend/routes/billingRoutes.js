// routes/billingRoutes.js

const express = require('express');
const router  = express.Router();
const {
  getBilling,
  createCheckoutSession,
  createPackageCheckoutSession,
  handleWebhook,
  applyCoupon,
  cancelPlan,
} = require('../controllers/billingController');
const { authMiddleware } = require('../middleware/authMiddleware');

const adminOnly = (req, res, next) => {
  if (req.user?.role !== 'admin')
    return res.status(403).json({ success: false, message: 'Acesso restrito ao administrador.' });
  next();
};

// ── Rotas autenticadas ─────────────────────────────────────────────────────────
// Note: /webhook is registered directly in server.js (before express.json) to preserve raw body
router.use(authMiddleware);
router.use(adminOnly);

router.get('/',                        getBilling);
router.post('/create-checkout-session',createCheckoutSession);
router.post('/create-package-checkout',createPackageCheckoutSession);
router.post('/apply-coupon',           applyCoupon);
router.post('/cancel',                 cancelPlan);

module.exports = router;
