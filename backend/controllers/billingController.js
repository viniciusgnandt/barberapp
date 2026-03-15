// controllers/billingController.js

const Barbershop = require('../models/Barbershop');
const Coupon     = require('../models/Coupon');

// GET /api/billing — billing info for the current barbershop
const getBilling = async (req, res) => {
  try {
    const shop = await Barbershop.findById(req.user.barbershop._id)
      .select('name plan planStatus planExpiresAt invoices createdAt');
    if (!shop) return res.status(404).json({ success: false, message: 'Barbearia não encontrada.' });

    // Auto-initialize trial if planExpiresAt was never set (legacy accounts)
    if (!shop.planExpiresAt) {
      const base    = shop.createdAt || new Date();
      shop.planExpiresAt = new Date(base.getTime() + 30 * 24 * 60 * 60 * 1000);
      if (!shop.invoices?.length) {
        shop.invoices.push({ description: 'Período Gratuito — 30 dias', amount: 0, status: 'paid', paidAt: base });
      }
      await shop.save();
    }

    // Auto-renew if past expiry date (unless cancelled)
    if (shop.planStatus === 'active' && shop.planExpiresAt && new Date() > shop.planExpiresAt) {
      const amount = shop.plan === 'trial' ? 0 : 49.90;
      const desc   = shop.plan === 'trial'
        ? 'Renovação Automática — Período Gratuito 30 dias'
        : 'Renovação Automática — Plano Básico 30 dias';
      if (shop.plan === 'trial') shop.plan = 'basic';
      shop.planExpiresAt = new Date(new Date().getTime() + 30 * 24 * 60 * 60 * 1000);
      shop.invoices.push({ description: desc, amount, status: 'paid', paidAt: new Date() });
      await shop.save();
    }

    const daysLeft = shop.planExpiresAt
      ? Math.max(0, Math.ceil((new Date(shop.planExpiresAt) - new Date()) / (1000 * 60 * 60 * 24)))
      : 0;

    res.json({
      success: true,
      data: {
        plan:          shop.plan,
        planStatus:    shop.planStatus,
        planExpiresAt: shop.planExpiresAt,
        daysLeft,
        invoices:      shop.invoices.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/billing/pay — mock credit card payment (extends plan by 30 days)
const pay = async (req, res) => {
  try {
    const { cardNumber, cardName, cardExpiry, cardCvv } = req.body;

    if (!cardNumber || !cardName || !cardExpiry || !cardCvv) {
      return res.status(400).json({ success: false, message: 'Preencha todos os dados do cartão.' });
    }

    const last4 = String(cardNumber).replace(/\s/g, '').slice(-4);

    const shop = await Barbershop.findById(req.user.barbershop._id);
    if (!shop) return res.status(404).json({ success: false, message: 'Barbearia não encontrada.' });

    if (shop.planStatus === 'cancelled') {
      return res.status(400).json({ success: false, message: 'Plano cancelado. Entre em contato com o suporte.' });
    }

    // Extend expiration by 30 days from now (or from current expiry if still active)
    const base = (shop.planStatus === 'active' && shop.planExpiresAt && shop.planExpiresAt > new Date())
      ? new Date(shop.planExpiresAt)
      : new Date();
    shop.planExpiresAt = new Date(base.getTime() + 30 * 24 * 60 * 60 * 1000);
    shop.plan       = 'basic';
    shop.planStatus = 'active';

    shop.invoices.push({
      description: 'Plano Básico — 30 dias',
      amount:      49.90,
      status:      'paid',
      paidAt:      new Date(),
      card:        last4,
    });

    await shop.save();

    res.json({
      success: true,
      message: 'Pagamento realizado com sucesso!',
      data: { planExpiresAt: shop.planExpiresAt, planStatus: shop.planStatus },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/billing/apply-coupon — apply a coupon code
const applyCoupon = async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ success: false, message: 'Informe o código do cupom.' });

    const coupon = await Coupon.findOne({ code: code.toUpperCase().trim(), active: true });
    if (!coupon) return res.status(404).json({ success: false, message: 'Cupom inválido ou expirado.' });

    const shop = await Barbershop.findById(req.user.barbershop._id);
    if (!shop) return res.status(404).json({ success: false, message: 'Barbearia não encontrada.' });

    // Check if already used by this shop
    const alreadyUsed = coupon.usedBy.some(u => String(u.barbershop) === String(shop._id));
    if (alreadyUsed) return res.status(400).json({ success: false, message: 'Este cupom já foi utilizado.' });

    // Check max uses
    if (coupon.maxUses !== null && coupon.usedBy.length >= coupon.maxUses) {
      return res.status(400).json({ success: false, message: 'Cupom esgotado.' });
    }

    if (shop.planStatus === 'cancelled') {
      return res.status(400).json({ success: false, message: 'Plano cancelado. Entre em contato com o suporte.' });
    }

    // Extend expiration
    const base = (shop.planExpiresAt && shop.planExpiresAt > new Date())
      ? new Date(shop.planExpiresAt)
      : new Date();
    shop.planExpiresAt = new Date(base.getTime() + coupon.daysToAdd * 24 * 60 * 60 * 1000);
    if (shop.planStatus === 'expired') shop.planStatus = 'active';

    shop.invoices.push({
      description: `Cupom ${coupon.code} — +${coupon.daysToAdd} dias`,
      amount:      0,
      status:      'paid',
      paidAt:      new Date(),
      card:        null,
    });

    coupon.usedBy.push({ barbershop: shop._id });
    await Promise.all([shop.save(), coupon.save()]);

    const daysLeft = Math.max(0, Math.ceil((shop.planExpiresAt - new Date()) / (1000 * 60 * 60 * 24)));

    res.json({
      success: true,
      message: `Cupom aplicado! +${coupon.daysToAdd} dias adicionados.`,
      data:    { planExpiresAt: shop.planExpiresAt, daysLeft },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/billing/cancel — cancel the plan
const cancelPlan = async (req, res) => {
  try {
    const shop = await Barbershop.findById(req.user.barbershop._id);
    if (!shop) return res.status(404).json({ success: false, message: 'Barbearia não encontrada.' });

    if (shop.planStatus === 'cancelled') {
      return res.status(400).json({ success: false, message: 'Plano já cancelado.' });
    }

    shop.planStatus = 'cancelled';
    await shop.save();

    res.json({ success: true, message: 'Plano cancelado com sucesso.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { getBilling, pay, applyCoupon, cancelPlan };
