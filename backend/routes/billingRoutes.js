// routes/billingRoutes.js — Stripe Subscriptions + Payment Methods (NO Checkout)

const express = require('express');
const router  = express.Router();
const {
  getBilling,
  getCards,
  deleteCard,
  setDefaultCard,
  attachPaymentMethod,
  createSetupIntent,
  previewChange,
  subscribe,
  cancelPlan,
  buyPackage,
  confirmPackage,
  applyCoupon,
} = require('../controllers/billingController');
const { authMiddleware } = require('../middleware/authMiddleware');

const adminOnly = (req, res, next) => {
  if (req.user?.role !== 'admin')
    return res.status(403).json({ success: false, message: 'Acesso restrito ao administrador.' });
  next();
};

// Note: /webhook is registered directly in server.js (before express.json) to preserve raw body
router.use(authMiddleware);
router.use(adminOnly);

router.get ('/',                        getBilling);
router.post('/preview-change',         previewChange);
router.post('/subscribe',              subscribe);
router.post('/buy-package',            buyPackage);
router.post('/confirm-package',        confirmPackage);
router.post('/apply-coupon',            applyCoupon);
router.post('/cancel',                  cancelPlan);

// ── Card management (in-app, NO Checkout) ───────────────────────────────────
router.get   ('/cards',                    getCards);
router.post  ('/cards/setup-intent',       createSetupIntent);
router.post  ('/cards/attach',             attachPaymentMethod);
router.delete('/cards/:pmId',              deleteCard);
router.post  ('/cards/:pmId/set-default',  setDefaultCard);

module.exports = router;
