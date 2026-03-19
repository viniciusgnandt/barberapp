// controllers/billingController.js

const Stripe     = require('stripe');
const Barbershop = require('../models/Barbershop');
const Coupon     = require('../models/Coupon');

const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

// ── Planos disponíveis ────────────────────────────────────────────────────────
const PLANS = {
  free: {
    key:        'free',
    name:       'Free',
    priceCents: 0,
    priceLabel: 'Grátis',
    days:       30,
    features:   ['1 profissional', 'Agendamento online básico', 'Portal do cliente'],
  },
  basic: {
    key:        'basic',
    name:       'Basic',
    priceCents: 4900,
    priceLabel: 'R$ 49,00/mês',
    days:       30,
    features:   ['Até 3 profissionais', 'Agendamentos ilimitados', 'Relatórios básicos', 'Suporte por email'],
  },
  pro: {
    key:        'pro',
    name:       'Pro',
    priceCents: 9900,
    priceLabel: 'R$ 99,00/mês',
    days:       30,
    features:   ['Até 10 profissionais', 'IA receptionist (WhatsApp)', 'Relatórios completos', 'Notificações automáticas'],
  },
  premium: {
    key:        'premium',
    name:       'Premium',
    priceCents: 19900,
    priceLabel: 'R$ 199,00/mês',
    days:       30,
    features:   ['Profissionais ilimitados', 'Tudo do Pro', 'Suporte prioritário 24h', 'Pacotes de mensagens inclusos'],
  },
};

// ── Pacotes adicionais de mensagens ───────────────────────────────────────────
const PACKAGE_TIERS = { 1000: 49, 3000: 139, 5000: 229 };

// ── Helper: get or create Stripe customer ─────────────────────────────────────
async function getOrCreateCustomer(shop, userEmail) {
  if (shop.stripeCustomerId) return shop.stripeCustomerId;

  const customer = await stripe.customers.create({
    name:     shop.name,
    email:    shop.email || userEmail || undefined,
    metadata: { barbershopId: String(shop._id) },
  });

  shop.stripeCustomerId = customer.id;
  await shop.save();
  return customer.id;
}

// ── Helper: process a completed Stripe session (idempotent) ───────────────────
async function processSession(session, shop) {
  const alreadyProcessed = shop.invoices.some(inv => inv.stripeSessionId === session.id);
  if (alreadyProcessed) return false;

  const { type, planKey, messages, quantity } = session.metadata || {};

  if (type === 'plan' && planKey && PLANS[planKey]) {
    const plan = PLANS[planKey];
    const base = (shop.planStatus === 'active' && shop.planExpiresAt && shop.planExpiresAt > new Date())
      ? new Date(shop.planExpiresAt) : new Date();
    shop.planExpiresAt = new Date(base.getTime() + plan.days * 24 * 60 * 60 * 1000);
    shop.plan       = planKey;
    shop.planStatus = 'active';
    shop.invoices.push({
      description:     `Plano ${plan.name} — ${plan.days} dias`,
      amount:          plan.priceCents / 100,
      status:          'paid',
      paidAt:          new Date(),
      stripeSessionId: session.id,
    });
    await shop.save();
    return true;
  }

  if (type === 'package') {
    const msgs      = parseInt(messages, 10);
    const qty       = parseInt(quantity, 10) || 1;
    const tier      = PACKAGE_TIERS[msgs];
    const now       = new Date();
    const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    for (let i = 0; i < qty; i++) {
      shop.messagePackages.push({ messages: msgs, remaining: msgs, purchasedAt: now, expiresAt });
    }
    shop.invoices.push({
      description:     `${qty}x Pacote ${msgs.toLocaleString('pt-BR')} msgs (30 dias)`,
      amount:          (tier || 0) * qty,
      status:          'paid',
      paidAt:          now,
      stripeSessionId: session.id,
    });
    await shop.save();
    return true;
  }

  return false;
}

// ── GET /api/billing ──────────────────────────────────────────────────────────
const getBilling = async (req, res) => {
  try {
    const shop = await Barbershop.findById(req.user.barbershop._id)
      .select('name plan planStatus planExpiresAt invoices messagePackages createdAt');
    if (!shop) return res.status(404).json({ success: false, message: 'Barbearia não encontrada.' });

    // Normalize trial/legacy accounts to free
    if (shop.plan === 'trial' || !shop.plan) {
      shop.plan          = 'free';
      shop.planStatus    = 'active';
      shop.planExpiresAt = undefined;
      await shop.save();
    }

    const daysLeft = shop.planExpiresAt
      ? Math.max(0, Math.ceil((new Date(shop.planExpiresAt) - new Date()) / (1000 * 60 * 60 * 24)))
      : 0;

    const activePackages = (shop.messagePackages || []).filter(
      p => p.remaining > 0 && (!p.expiresAt || p.expiresAt > new Date())
    );

    res.json({
      success: true,
      data: {
        plan:            shop.plan,
        planStatus:      shop.planStatus,
        planExpiresAt:   shop.planExpiresAt,
        daysLeft,
        plans:           PLANS,
        invoices:        shop.invoices.sort((a, b) => new Date(b.paidAt) - new Date(a.paidAt)),
        messagePackages: activePackages,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── POST /api/billing/sync-session — força sincronização de sessão Stripe ─────
const syncSession = async (req, res) => {
  try {
    const { sessionId } = req.body;
    if (!sessionId) return res.status(400).json({ success: false, message: 'sessionId obrigatório.' });

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    // Accept paid sessions (payment mode) or completed setup sessions
    if (session.payment_status !== 'paid' && session.mode !== 'setup')
      return res.status(400).json({ success: false, message: 'Sessão não concluída.' });

    const shopWithStripe = await Barbershop.findById(req.user.barbershop._id).select('+stripeCustomerId');
    if (!shopWithStripe) return res.status(404).json({ success: false, message: 'Barbearia não encontrada.' });

    // Verify session belongs to this shop's Stripe customer
    if (shopWithStripe.stripeCustomerId && session.customer !== shopWithStripe.stripeCustomerId)
      return res.status(403).json({ success: false, message: 'Sessão não pertence a este cadastro.' });

    const shop = await Barbershop.findById(req.user.barbershop._id);
    const processed = await processSession(session, shop);

    res.json({ success: true, message: processed ? 'Plano atualizado.' : 'Já processado.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET /api/billing/cards ────────────────────────────────────────────────────
const getCards = async (req, res) => {
  try {
    const shop = await Barbershop.findById(req.user.barbershop._id).select('+stripeCustomerId');
    if (!shop) return res.status(404).json({ success: false, message: 'Barbearia não encontrada.' });
    if (!shop.stripeCustomerId) return res.json({ success: true, data: { cards: [], defaultId: null } });

    const [pms, customer] = await Promise.all([
      stripe.paymentMethods.list({ customer: shop.stripeCustomerId, type: 'card' }),
      stripe.customers.retrieve(shop.stripeCustomerId),
    ]);

    const defaultId = customer.invoice_settings?.default_payment_method || null;

    res.json({
      success: true,
      data: {
        defaultId,
        cards: pms.data.map(pm => ({
          id:       pm.id,
          brand:    pm.card.brand,
          last4:    pm.card.last4,
          expMonth: pm.card.exp_month,
          expYear:  pm.card.exp_year,
        })),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── POST /api/billing/cards/setup-session ─────────────────────────────────────
const createSetupSession = async (req, res) => {
  try {
    const shop = await Barbershop.findById(req.user.barbershop._id).select('+stripeCustomerId');
    if (!shop) return res.status(404).json({ success: false, message: 'Barbearia não encontrada.' });

    const customerId = await getOrCreateCustomer(shop, req.user.email);

    const session = await stripe.checkout.sessions.create({
      customer:             customerId,
      payment_method_types: ['card'],
      mode:                 'setup',
      success_url: `${process.env.FRONTEND_URL}/settings/billing?success=card`,
      cancel_url:  `${process.env.FRONTEND_URL}/settings/billing?canceled=1`,
      locale:      'pt-BR',
    });

    res.json({ success: true, url: session.url });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── DELETE /api/billing/cards/:pmId ───────────────────────────────────────────
const deleteCard = async (req, res) => {
  try {
    const { pmId } = req.params;
    const shop = await Barbershop.findById(req.user.barbershop._id).select('+stripeCustomerId');
    if (!shop || !shop.stripeCustomerId)
      return res.status(404).json({ success: false, message: 'Nenhum cartão cadastrado.' });

    const pm = await stripe.paymentMethods.retrieve(pmId);
    if (pm.customer !== shop.stripeCustomerId)
      return res.status(403).json({ success: false, message: 'Cartão não encontrado.' });

    await stripe.paymentMethods.detach(pmId);
    res.json({ success: true, message: 'Cartão removido.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── POST /api/billing/cards/:pmId/set-default ─────────────────────────────────
const setDefaultCard = async (req, res) => {
  try {
    const { pmId } = req.params;
    const shop = await Barbershop.findById(req.user.barbershop._id).select('+stripeCustomerId');
    if (!shop || !shop.stripeCustomerId)
      return res.status(404).json({ success: false, message: 'Nenhum cliente Stripe.' });

    const pm = await stripe.paymentMethods.retrieve(pmId);
    if (pm.customer !== shop.stripeCustomerId)
      return res.status(403).json({ success: false, message: 'Cartão não encontrado.' });

    await stripe.customers.update(shop.stripeCustomerId, {
      invoice_settings: { default_payment_method: pmId },
    });

    res.json({ success: true, message: 'Cartão padrão atualizado.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── POST /api/billing/create-checkout-session ─────────────────────────────────
const createCheckoutSession = async (req, res) => {
  try {
    const { planKey = 'pro' } = req.body;
    const plan = PLANS[planKey];
    if (!plan || plan.priceCents === 0)
      return res.status(400).json({ success: false, message: 'Plano inválido.' });

    const shop = await Barbershop.findById(req.user.barbershop._id).select('+stripeCustomerId');
    if (!shop) return res.status(404).json({ success: false, message: 'Barbearia não encontrada.' });

    if (shop.planStatus === 'cancelled')
      return res.status(400).json({ success: false, message: 'Plano cancelado. Entre em contato com o suporte.' });

    const customerId = await getOrCreateCustomer(shop, req.user.email);

    const session = await stripe.checkout.sessions.create({
      customer:             customerId,
      payment_method_types: ['card'],
      saved_payment_method_options: { payment_method_save: 'enabled' },
      line_items: [{
        price_data: {
          currency:     'brl',
          product_data: {
            name:        `Plano ${plan.name} — ${plan.days} dias`,
            description: plan.features.join(' · '),
          },
          unit_amount: plan.priceCents,
        },
        quantity: 1,
      }],
      mode:        'payment',
      success_url: `${process.env.FRONTEND_URL}/settings/billing?success=plan&plan=${planKey}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${process.env.FRONTEND_URL}/settings/billing?canceled=1`,
      metadata:    { barbershopId: String(shop._id), type: 'plan', planKey },
      locale:      'pt-BR',
    });

    res.json({ success: true, url: session.url, sessionId: session.id });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── POST /api/billing/create-package-checkout ─────────────────────────────────
const createPackageCheckoutSession = async (req, res) => {
  try {
    const { messages, quantity = 1 } = req.body;
    const msgs  = parseInt(messages, 10);
    const qty   = Math.max(1, Math.min(10, parseInt(quantity, 10) || 1));
    const price = PACKAGE_TIERS[msgs];
    if (!price) return res.status(400).json({ success: false, message: 'Pacote inválido. Escolha 1.000, 3.000 ou 5.000 mensagens.' });

    const shop = await Barbershop.findById(req.user.barbershop._id).select('+stripeCustomerId');
    if (!shop) return res.status(404).json({ success: false, message: 'Barbearia não encontrada.' });

    const customerId = await getOrCreateCustomer(shop, req.user.email);

    const session = await stripe.checkout.sessions.create({
      customer:             customerId,
      payment_method_types: ['card'],
      saved_payment_method_options: { payment_method_save: 'enabled' },
      line_items: [{
        price_data: {
          currency:     'brl',
          product_data: { name: `Pacote ${msgs.toLocaleString('pt-BR')} mensagens (30 dias)` },
          unit_amount:  price * 100,
        },
        quantity: qty,
      }],
      mode:        'payment',
      success_url: `${process.env.FRONTEND_URL}/settings/billing?success=package&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${process.env.FRONTEND_URL}/settings/billing?canceled=1`,
      metadata:    { barbershopId: String(shop._id), type: 'package', messages: String(msgs), quantity: String(qty) },
      locale:      'pt-BR',
    });

    res.json({ success: true, url: session.url, sessionId: session.id });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── POST /api/billing/webhook — Stripe events ─────────────────────────────────
const handleWebhook = async (req, res) => {
  const sig    = req.headers['stripe-signature'];
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const isDev  = !secret || secret.startsWith('whsec_COLE');
  let event;

  if (isDev) {
    try {
      const body = req.body instanceof Buffer ? req.body.toString('utf8') : req.body;
      event = typeof body === 'string' ? JSON.parse(body) : body;
      console.warn('[Stripe Webhook] ⚠️  Sem verificação de assinatura (modo dev).');
    } catch (err) {
      return res.status(400).json({ message: 'Payload inválido.' });
    }
  } else {
    try {
      event = stripe.webhooks.constructEvent(req.body, sig, secret);
    } catch (err) {
      console.error('[Stripe Webhook] Signature error:', err.message);
      return res.status(400).json({ message: `Webhook Error: ${err.message}` });
    }
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;

    // Handle setup mode — set PM as default
    if (session.mode === 'setup') {
      if (session.setup_intent && session.customer) {
        try {
          const setupIntent = await stripe.setupIntents.retrieve(session.setup_intent);
          if (setupIntent.payment_method) {
            await stripe.customers.update(session.customer, {
              invoice_settings: { default_payment_method: setupIntent.payment_method },
            });
            console.log(`[Stripe Webhook] Default PM set for customer ${session.customer}`);
          }
        } catch (err) {
          console.error('[Stripe Webhook] Setup intent error:', err.message);
        }
      }
      return res.json({ received: true });
    }

    // Handle payment mode
    const { barbershopId } = session.metadata || {};
    if (!barbershopId) return res.json({ received: true });

    const shop = await Barbershop.findById(barbershopId);
    if (!shop) return res.json({ received: true });

    const processed = await processSession(session, shop);
    if (processed) {
      console.log(`[Stripe Webhook] Processed session ${session.id} for barbershop ${barbershopId}`);
    }
  }

  res.json({ received: true });
};

// ── POST /api/billing/apply-coupon ────────────────────────────────────────────
const applyCoupon = async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ success: false, message: 'Informe o código do cupom.' });

    const coupon = await Coupon.findOne({ code: code.toUpperCase().trim(), active: true });
    if (!coupon) return res.status(404).json({ success: false, message: 'Cupom inválido ou expirado.' });

    const shop = await Barbershop.findById(req.user.barbershop._id);
    if (!shop) return res.status(404).json({ success: false, message: 'Barbearia não encontrada.' });

    const alreadyUsed = coupon.usedBy.some(u => String(u.barbershop) === String(shop._id));
    if (alreadyUsed) return res.status(400).json({ success: false, message: 'Este cupom já foi utilizado.' });

    if (coupon.maxUses !== null && coupon.usedBy.length >= coupon.maxUses)
      return res.status(400).json({ success: false, message: 'Cupom esgotado.' });

    if (shop.planStatus === 'cancelled')
      return res.status(400).json({ success: false, message: 'Plano cancelado. Entre em contato com o suporte.' });

    const base = (shop.planExpiresAt && shop.planExpiresAt > new Date())
      ? new Date(shop.planExpiresAt) : new Date();
    shop.planExpiresAt = new Date(base.getTime() + coupon.daysToAdd * 24 * 60 * 60 * 1000);
    if (shop.planStatus === 'expired') shop.planStatus = 'active';

    shop.invoices.push({
      description: `Cupom ${coupon.code} — +${coupon.daysToAdd} dias`,
      amount:      0,
      status:      'paid',
      paidAt:      new Date(),
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

// ── POST /api/billing/cancel ──────────────────────────────────────────────────
const cancelPlan = async (req, res) => {
  try {
    const shop = await Barbershop.findById(req.user.barbershop._id);
    if (!shop) return res.status(404).json({ success: false, message: 'Barbearia não encontrada.' });

    if (shop.planStatus === 'cancelled')
      return res.status(400).json({ success: false, message: 'Plano já cancelado.' });

    shop.planStatus = 'cancelled';
    await shop.save();

    res.json({ success: true, message: 'Plano cancelado. O acesso continua até o fim do período contratado.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  getBilling,
  syncSession,
  getCards,
  createSetupSession,
  deleteCard,
  setDefaultCard,
  createCheckoutSession,
  createPackageCheckoutSession,
  handleWebhook,
  applyCoupon,
  cancelPlan,
};
