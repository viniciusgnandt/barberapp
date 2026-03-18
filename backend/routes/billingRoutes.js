// routes/billingRoutes.js

const router = require('express').Router();
const { getBilling, pay, applyCoupon, cancelPlan, buyPackage } = require('../controllers/billingController');
const { authMiddleware } = require('../middleware/authMiddleware');

const adminOnly = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Acesso restrito ao administrador.' });
  }
  next();
};

router.use(authMiddleware);
router.use(adminOnly);

router.get('/',              getBilling);
router.post('/pay',          pay);
router.post('/apply-coupon', applyCoupon);
router.post('/cancel',       cancelPlan);
router.post('/buy-package',  buyPackage);

module.exports = router;
