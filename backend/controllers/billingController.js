// controllers/billingController.js — Stripe Subscriptions + Payment Methods API (NO Checkout)

const Stripe     = require('stripe');
const Barbershop = require('../models/Barbershop');
const Coupon     = require('../models/Coupon');

const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

// ── Planos SaaS (baseados em custos Gemini Flash-Lite) ──────────────────────
// Gemini Flash-Lite: ~$0.075/1M input + ~$0.30/1M output ≈ R$0,002/msg
// Margem saudável + valor agregado da plataforma

// ── Análise de custos e margem ───────────────────────────────────────────────
// Gemini Flash-Lite: ~$0.075/1M input + ~$0.30/1M output
// Média por mensagem: ~400 tokens input + ~200 tokens output = ~R$0,002/msg
// Custo infra (servidor, DB, storage): ~R$0,50/cliente/mês
// Margem mínima: 80%+ sobre custo total
//
// Starter:      500 msgs × R$0,002 = R$1,00 + R$0,50 infra = R$1,50 custo → R$97 preço → 98,5% margem
// Professional: 2000 msgs × R$0,002 = R$4,00 + R$0,50 = R$4,50 custo → R$197 preço → 97,7% margem
// Business:     5000 msgs × R$0,002 = R$10,00 + R$0,50 = R$10,50 custo → R$397 preço → 97,4% margem

const PLANS = {
  free: {
    key:           'free',
    name:          'Free',
    priceCents:    0,
    priceLabel:    'Grátis',
    maxBarbers:    1,
    aiMessages:    0,
    features:      ['1 profissional', 'Agendamento online básico', 'Portal do cliente'],
    stripePriceId: null,
  },
  starter: {
    key:           'starter',
    name:          'Starter',
    priceCents:    9700,
    priceLabel:    'R$ 97,00/mês',
    maxBarbers:    3,
    aiMessages:    500,
    features:      ['Até 3 profissionais', 'Agendamentos ilimitados', '500 msgs IA/mês', 'Relatórios básicos', 'Suporte por email'],
    stripePriceId: process.env.STRIPE_PRICE_STARTER || null,
  },
  professional: {
    key:           'professional',
    name:          'Professional',
    priceCents:    19700,
    priceLabel:    'R$ 197,00/mês',
    maxBarbers:    10,
    aiMessages:    2000,
    features:      ['Até 10 profissionais', '2.000 msgs IA/mês', 'IA Recepcionista (WhatsApp)', 'Relatórios completos', 'Financeiro + Comandas', 'Notificações automáticas'],
    stripePriceId: process.env.STRIPE_PRICE_PROFESSIONAL || null,
  },
  business: {
    key:           'business',
    name:          'Business',
    priceCents:    39700,
    priceLabel:    'R$ 397,00/mês',
    maxBarbers:    999,
    aiMessages:    5000,
    features:      ['Profissionais ilimitados', '5.000 msgs IA/mês', 'Tudo do Professional', 'Suporte prioritário 24h', 'Multi-unidades (em breve)'],
    stripePriceId: process.env.STRIPE_PRICE_BUSINESS || null,
  },
};

// Keep legacy plan keys for backward compatibility
const PLAN_ALIASES = { basic: 'starter', pro: 'professional', premium: 'business', trial: 'free' };

function resolvePlan(key) {
  return PLANS[key] || PLANS[PLAN_ALIASES[key]] || null;
}

// ── Pacotes adicionais de mensagens ─────────────────────────────────────────
const PACKAGE_TIERS = { 1000: 49, 3000: 139, 5000: 229 };

// ── Helper: get or create Stripe customer ───────────────────────────────────
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

// ── GET /api/billing ────────────────────────────────────────────────────────
const getBilling = async (req, res) => {
  try {
    const shop = await Barbershop.findById(req.user.barbershop._id)
      .select('+stripeCustomerId +stripeSubscriptionId +stripePriceId')
      .select('name plan planStatus planExpiresAt invoices messagePackages createdAt');
    if (!shop) return res.status(404).json({ success: false, message: 'Barbearia não encontrada.' });

    // Normalize legacy plans
    if (['trial', 'basic', 'pro', 'premium'].includes(shop.plan)) {
      const alias = PLAN_ALIASES[shop.plan];
      if (alias) shop.plan = alias;
      if (!shop.plan || shop.plan === 'trial') {
        shop.plan       = 'free';
        shop.planStatus = 'active';
      }
      await shop.save();
    }

    // Check subscription status from Stripe if active
    let subscriptionStatus = null;
    let stripeRenewalDate  = null;
    if (shop.stripeSubscriptionId) {
      try {
        const sub = await stripe.subscriptions.retrieve(shop.stripeSubscriptionId);
        subscriptionStatus = sub.status;
        if (sub.current_period_end) {
          stripeRenewalDate = new Date(sub.current_period_end * 1000);
        }
        if (sub.status === 'active' || sub.status === 'trialing') {
          shop.planStatus = 'active';
          if (stripeRenewalDate) shop.planExpiresAt = stripeRenewalDate;
        } else if (sub.status === 'canceled') {
          shop.planStatus = 'cancelled';
        } else if (sub.status === 'past_due') {
          shop.planStatus = 'active';
        }
        await shop.save();
      } catch (_) { /* subscription may have been deleted */ }
    }

    // planExpiresAt: prefer DB value (already saved), fallback to live Stripe value
    const expiresAt = shop.planExpiresAt || stripeRenewalDate;
    const daysLeft  = expiresAt
      ? Math.max(0, Math.ceil((new Date(expiresAt) - new Date()) / (1000 * 60 * 60 * 24)))
      : null;

    const activePackages = (shop.messagePackages || []).filter(
      p => p.remaining > 0 && (!p.expiresAt || p.expiresAt > new Date())
    );

    res.json({
      success: true,
      data: {
        plan:               shop.plan,
        planStatus:         shop.planStatus,
        planExpiresAt:      expiresAt,
        daysLeft,
        plans:              PLANS,
        subscriptionStatus,
        hasSubscription:    !!shop.stripeSubscriptionId,
        invoices:           shop.invoices.sort((a, b) => new Date(b.paidAt) - new Date(a.paidAt)),
        messagePackages:    activePackages,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── POST /api/billing/attach-payment-method — Attach a PM to customer ───────
const attachPaymentMethod = async (req, res) => {
  try {
    const { paymentMethodId } = req.body;
    if (!paymentMethodId) return res.status(400).json({ success: false, message: 'paymentMethodId obrigatório.' });

    const shop = await Barbershop.findById(req.user.barbershop._id).select('+stripeCustomerId');
    if (!shop) return res.status(404).json({ success: false, message: 'Barbearia não encontrada.' });

    const customerId = await getOrCreateCustomer(shop, req.user.email);

    // Attach PM to customer
    await stripe.paymentMethods.attach(paymentMethodId, { customer: customerId });

    // Set as default
    await stripe.customers.update(customerId, {
      invoice_settings: { default_payment_method: paymentMethodId },
    });

    res.json({ success: true, message: 'Cartão adicionado com sucesso.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── POST /api/billing/create-setup-intent — For Stripe Elements card form ───
const createSetupIntent = async (req, res) => {
  try {
    const shop = await Barbershop.findById(req.user.barbershop._id).select('+stripeCustomerId');
    if (!shop) return res.status(404).json({ success: false, message: 'Barbearia não encontrada.' });

    const customerId = await getOrCreateCustomer(shop, req.user.email);

    const setupIntent = await stripe.setupIntents.create({
      customer:              customerId,
      payment_method_types:  ['card'],
      metadata:              { barbershopId: String(shop._id) },
    });

    res.json({ success: true, clientSecret: setupIntent.client_secret });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── POST /api/billing/preview-change — Preview proration before changing plan
const previewChange = async (req, res) => {
  try {
    const { planKey } = req.body;
    const plan = resolvePlan(planKey);
    if (!plan || plan.priceCents === 0)
      return res.status(400).json({ success: false, message: 'Plano inválido.' });

    const shop = await Barbershop.findById(req.user.barbershop._id)
      .select('+stripeCustomerId +stripeSubscriptionId');
    if (!shop) return res.status(404).json({ success: false, message: 'Barbearia não encontrada.' });

    // No active subscription — full price
    if (!shop.stripeSubscriptionId) {
      return res.json({ success: true, data: { type: 'new', amount: plan.priceCents / 100, periodEnd: null } });
    }

    let sub;
    try { sub = await stripe.subscriptions.retrieve(shop.stripeSubscriptionId); } catch (_) {}
    if (!sub || sub.status === 'canceled') {
      return res.json({ success: true, data: { type: 'new', amount: plan.priceCents / 100, periodEnd: null } });
    }

    const currentPriceCents = PLANS[shop.plan]?.priceCents || 0;
    const isUpgrade = plan.priceCents > currentPriceCents;
    const periodEnd = new Date(sub.current_period_end * 1000);

    // Preview upcoming invoice with new price
    let prorationAmount = null;
    try {
      const upcoming = await stripe.invoices.retrieveUpcoming({
        customer:             shop.stripeCustomerId,
        subscription:         shop.stripeSubscriptionId,
        subscription_items:   [{ id: sub.items.data[0].id, price: plan.stripePriceId }],
        subscription_proration_date: Math.floor(Date.now() / 1000),
      });
      prorationAmount = upcoming.amount_due / 100;
    } catch (_) {
      prorationAmount = isUpgrade ? (plan.priceCents - currentPriceCents) / 100 : 0;
    }

    res.json({
      success: true,
      data: {
        type:           isUpgrade ? 'upgrade' : 'downgrade',
        amount:         prorationAmount,
        periodEnd,
        currentPlan:    shop.plan,
        newPlan:        plan.key,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── POST /api/billing/subscribe — Create or update subscription ─────────────
const subscribe = async (req, res) => {
  try {
    const { planKey, paymentMethodId } = req.body;
    const plan = resolvePlan(planKey);
    if (!plan || plan.priceCents === 0)
      return res.status(400).json({ success: false, message: 'Plano inválido.' });

    if (!plan.stripePriceId)
      return res.status(400).json({ success: false, message: 'Plano não configurado no Stripe. Configure STRIPE_PRICE_* no .env.' });

    const shop = await Barbershop.findById(req.user.barbershop._id)
      .select('+stripeCustomerId +stripeSubscriptionId +stripePriceId');
    if (!shop) return res.status(404).json({ success: false, message: 'Barbearia não encontrada.' });

    const customerId = await getOrCreateCustomer(shop, req.user.email);

    // If a new PM was provided, attach and set as default
    if (paymentMethodId) {
      try {
        await stripe.paymentMethods.attach(paymentMethodId, { customer: customerId });
      } catch (e) {
        if (!e.message.includes('already been attached')) throw e;
      }
      await stripe.customers.update(customerId, {
        invoice_settings: { default_payment_method: paymentMethodId },
      });
    }

    // Check if customer has a default PM
    const customer = await stripe.customers.retrieve(customerId);
    const defaultPM = customer.invoice_settings?.default_payment_method;
    if (!defaultPM)
      return res.status(400).json({ success: false, message: 'Adicione um cartão antes de assinar.' });

    // ── Change existing subscription (upgrade or downgrade) ──────────────────
    if (shop.stripeSubscriptionId) {
      let sub;
      try { sub = await stripe.subscriptions.retrieve(shop.stripeSubscriptionId); } catch (_) {}

      if (sub && sub.status !== 'canceled') {
        const currentPriceCents = PLANS[shop.plan]?.priceCents || 0;
        const isUpgrade = plan.priceCents > currentPriceCents;

        // Upgrade: charge prorated difference immediately via always_invoice
        // Downgrade: apply credit on next invoice via create_prorations (plan changes immediately)
        const prorationBehavior = isUpgrade ? 'always_invoice' : 'create_prorations';

        const updateParams = {
          items: [{ id: sub.items.data[0].id, price: plan.stripePriceId }],
          proration_behavior:     prorationBehavior,
          default_payment_method: defaultPM,
          metadata:               { barbershopId: String(shop._id), planKey: plan.key },
        };

        // Expand payment_intent only for upgrades (immediate charge)
        if (isUpgrade) updateParams.expand = ['latest_invoice.payment_intent'];

        const updated = await stripe.subscriptions.update(shop.stripeSubscriptionId, updateParams);

        shop.plan          = plan.key;
        shop.planStatus    = 'active';
        shop.stripePriceId = plan.stripePriceId;
        if (updated.current_period_end) {
          shop.planExpiresAt = new Date(updated.current_period_end * 1000);
        }

        // Log proration invoice for upgrades
        if (isUpgrade) {
          const inv = updated.latest_invoice;
          const pi  = inv?.payment_intent;
          if (inv && !shop.invoices.some(i => i.stripeSessionId === (inv.id || inv))) {
            shop.invoices.push({
              description:     `Upgrade para ${plan.name} (proporcional)`,
              amount:          (inv.amount_paid || inv.amount_due || 0) / 100,
              status:          inv.status === 'paid' ? 'paid' : 'pending',
              paidAt:          inv.status === 'paid' ? new Date() : undefined,
              stripeSessionId: typeof inv === 'string' ? inv : inv.id,
            });
          }
          await shop.save();

          const clientSecret = pi?.status === 'requires_action' ? pi.client_secret : null;
          return res.json({
            success: true,
            message: `Upgrade para ${plan.name} efetuado! Cobrança proporcional realizada.`,
            subscriptionId: updated.id,
            clientSecret,
            changeType: 'upgrade',
          });
        }

        // Downgrade
        await shop.save();
        return res.json({
          success: true,
          message: `Plano alterado para ${plan.name}. O crédito proporcional será aplicado na próxima fatura.`,
          subscriptionId: updated.id,
          changeType: 'downgrade',
        });
      }
    }

    // ── Nova assinatura ──────────────────────────────────────────────────────
    const subscription = await stripe.subscriptions.create({
      customer:               customerId,
      items:                  [{ price: plan.stripePriceId }],
      default_payment_method: defaultPM,
      payment_behavior:       'error_if_incomplete',
      expand:                 ['latest_invoice.payment_intent'],
      metadata:               { barbershopId: String(shop._id), planKey: plan.key },
    });

    shop.stripeSubscriptionId = subscription.id;
    shop.stripePriceId        = plan.stripePriceId;
    shop.plan                 = plan.key;
    shop.planStatus           = 'active';
    if (subscription.current_period_end) {
      shop.planExpiresAt = new Date(subscription.current_period_end * 1000);
    }

    const invoice       = subscription.latest_invoice;
    const paymentIntent = invoice?.payment_intent;
    if (!shop.invoices.some(inv => inv.stripeSessionId === subscription.id)) {
      shop.invoices.push({
        description:     `Assinatura ${plan.name}`,
        amount:          plan.priceCents / 100,
        status:          'paid',
        paidAt:          new Date(),
        stripeSessionId: subscription.id,
      });
    }
    await shop.save();

    const clientSecret = paymentIntent?.status === 'requires_action'
      ? paymentIntent.client_secret : null;

    res.json({
      success:        true,
      message:        `Plano ${plan.name} ativado!`,
      subscriptionId: subscription.id,
      status:         subscription.status,
      clientSecret,
      changeType:     'new',
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── POST /api/billing/cancel — Cancel subscription ──────────────────────────
const cancelPlan = async (req, res) => {
  try {
    const shop = await Barbershop.findById(req.user.barbershop._id)
      .select('+stripeSubscriptionId');
    if (!shop) return res.status(404).json({ success: false, message: 'Barbearia não encontrada.' });

    if (shop.planStatus === 'cancelled')
      return res.status(400).json({ success: false, message: 'Plano já cancelado.' });

    let accessUntil = shop.planExpiresAt;

    // Cancel at period end — user keeps access until end of billing cycle, no refund
    if (shop.stripeSubscriptionId) {
      try {
        const sub = await stripe.subscriptions.update(shop.stripeSubscriptionId, {
          cancel_at_period_end: true,
        });
        accessUntil = new Date(sub.current_period_end * 1000);
        shop.planExpiresAt = accessUntil;
      } catch (_) { /* subscription may not exist in Stripe */ }
    }

    shop.planStatus = 'cancelled';
    await shop.save();

    const daysLeft = accessUntil
      ? Math.max(0, Math.ceil((accessUntil - new Date()) / (1000 * 60 * 60 * 24)))
      : 0;

    res.json({
      success:      true,
      message:      `Plano cancelado. Acesso mantido até ${accessUntil ? new Date(accessUntil).toLocaleDateString('pt-BR') : 'o fim do período'}.`,
      data:         { accessUntil, daysLeft },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET /api/billing/cards ──────────────────────────────────────────────────
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

// ── DELETE /api/billing/cards/:pmId ─────────────────────────────────────────
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

// ── POST /api/billing/cards/:pmId/set-default ───────────────────────────────
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

    // Also update active subscription if exists
    const shopFull = await Barbershop.findById(shop._id).select('+stripeSubscriptionId');
    if (shopFull?.stripeSubscriptionId) {
      try {
        await stripe.subscriptions.update(shopFull.stripeSubscriptionId, {
          default_payment_method: pmId,
        });
      } catch (_) {}
    }

    res.json({ success: true, message: 'Cartão padrão atualizado.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── POST /api/billing/buy-package — One-time payment for message packages ───
const buyPackage = async (req, res) => {
  try {
    const { messages, quantity = 1, paymentMethodId } = req.body;
    const msgs  = parseInt(messages, 10);
    const qty   = Math.max(1, Math.min(10, parseInt(quantity, 10) || 1));
    const price = PACKAGE_TIERS[msgs];
    if (!price) return res.status(400).json({ success: false, message: 'Pacote inválido. Escolha 1.000, 3.000 ou 5.000 mensagens.' });

    const shop = await Barbershop.findById(req.user.barbershop._id).select('+stripeCustomerId');
    if (!shop) return res.status(404).json({ success: false, message: 'Barbearia não encontrada.' });

    const customerId = await getOrCreateCustomer(shop, req.user.email);

    // Use provided PM or customer's default
    let pmId = paymentMethodId;
    if (!pmId) {
      const customer = await stripe.customers.retrieve(customerId);
      pmId = customer.invoice_settings?.default_payment_method;
    }
    if (!pmId) return res.status(400).json({ success: false, message: 'Adicione um cartão antes de comprar.' });

    // Create PaymentIntent (one-time charge, no subscription)
    const paymentIntent = await stripe.paymentIntents.create({
      amount:         price * qty * 100, // cents
      currency:       'brl',
      customer:       customerId,
      payment_method: pmId,
      confirm:        true,
      automatic_payment_methods: { enabled: true, allow_redirects: 'never' },
      metadata: {
        barbershopId: String(shop._id),
        type:         'package',
        messages:     String(msgs),
        quantity:     String(qty),
      },
      description: `${qty}x Pacote ${msgs.toLocaleString('pt-BR')} mensagens`,
    });

    if (paymentIntent.status === 'succeeded') {
      const now       = new Date();
      const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      for (let i = 0; i < qty; i++) {
        shop.messagePackages.push({ messages: msgs, remaining: msgs, purchasedAt: now, expiresAt });
      }
      shop.invoices.push({
        description:     `${qty}x Pacote ${msgs.toLocaleString('pt-BR')} msgs (30 dias)`,
        amount:          price * qty,
        status:          'paid',
        paidAt:          now,
        stripeSessionId: paymentIntent.id,
      });
      await shop.save();
      return res.json({ success: true, message: 'Pacote adquirido com sucesso!' });
    }

    // Needs confirmation (3D Secure)
    if (paymentIntent.status === 'requires_action') {
      return res.json({
        success:      true,
        message:      'Confirme o pagamento.',
        clientSecret: paymentIntent.client_secret,
        requiresAction: true,
      });
    }

    res.status(400).json({ success: false, message: `Status do pagamento: ${paymentIntent.status}` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── POST /api/billing/confirm-package — After 3DS confirmation ──────────────
const confirmPackage = async (req, res) => {
  try {
    const { paymentIntentId } = req.body;
    if (!paymentIntentId) return res.status(400).json({ success: false, message: 'paymentIntentId obrigatório.' });

    const pi = await stripe.paymentIntents.retrieve(paymentIntentId);
    if (pi.status !== 'succeeded')
      return res.status(400).json({ success: false, message: 'Pagamento não confirmado.' });

    const { barbershopId, messages, quantity } = pi.metadata || {};
    if (!barbershopId || barbershopId !== String(req.user.barbershop._id))
      return res.status(403).json({ success: false, message: 'Pagamento não pertence a esta barbearia.' });

    const shop = await Barbershop.findById(barbershopId);
    if (!shop) return res.status(404).json({ success: false, message: 'Barbearia não encontrada.' });

    // Prevent double processing
    const already = shop.invoices.some(inv => inv.stripeSessionId === paymentIntentId);
    if (already) return res.json({ success: true, message: 'Já processado.' });

    const msgs = parseInt(messages, 10);
    const qty  = parseInt(quantity, 10) || 1;
    const now  = new Date();
    const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    for (let i = 0; i < qty; i++) {
      shop.messagePackages.push({ messages: msgs, remaining: msgs, purchasedAt: now, expiresAt });
    }
    shop.invoices.push({
      description:     `${qty}x Pacote ${msgs.toLocaleString('pt-BR')} msgs (30 dias)`,
      amount:          (PACKAGE_TIERS[msgs] || 0) * qty,
      status:          'paid',
      paidAt:          now,
      stripeSessionId: paymentIntentId,
    });
    await shop.save();
    res.json({ success: true, message: 'Pacote ativado!' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── POST /api/billing/apply-coupon ──────────────────────────────────────────
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

// ── POST /api/billing/webhook — Stripe events ──────────────────────────────
const handleWebhook = async (req, res) => {
  const sig    = req.headers['stripe-signature'];
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const isDev  = !secret || secret.startsWith('whsec_COLE');
  let event;

  if (isDev) {
    try {
      const body = req.body instanceof Buffer ? req.body.toString('utf8') : req.body;
      event = typeof body === 'string' ? JSON.parse(body) : body;
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

  const type = event.type;

  // Subscription events
  if (type === 'invoice.paid') {
    const invoice = event.data.object;
    if (invoice.subscription) {
      const sub  = await stripe.subscriptions.retrieve(invoice.subscription);
      const shop = await Barbershop.findOne({ stripeCustomerId: invoice.customer });
      if (shop) {
        const planKey = sub.metadata?.planKey || shop.plan;
        shop.plan               = planKey;
        shop.planStatus         = 'active';
        shop.stripeSubscriptionId = sub.id;
        if (sub.current_period_end) {
          shop.planExpiresAt = new Date(sub.current_period_end * 1000);
        }

        const already = shop.invoices.some(inv => inv.stripeSessionId === invoice.id);
        if (!already) {
          shop.invoices.push({
            description:     `Assinatura ${PLANS[planKey]?.name || planKey}`,
            amount:          invoice.amount_paid / 100,
            status:          'paid',
            paidAt:          new Date(invoice.status_transitions?.paid_at * 1000 || Date.now()),
            stripeSessionId: invoice.id,
          });
        }
        await shop.save();
        console.log(`[Stripe Webhook] invoice.paid → ${shop.name} → ${planKey}`);
      }
    }
  }

  if (type === 'invoice.payment_failed') {
    const invoice = event.data.object;
    const shop = await Barbershop.findOne({ stripeCustomerId: invoice.customer });
    if (shop) {
      console.log(`[Stripe Webhook] invoice.payment_failed → ${shop.name}`);
      // Plan stays active (Stripe retries), but we log it
    }
  }

  if (type === 'customer.subscription.deleted') {
    const sub  = event.data.object;
    const shop = await Barbershop.findOne({ stripeCustomerId: sub.customer });
    if (shop) {
      shop.planStatus = 'expired';
      shop.plan       = 'free';
      shop.stripeSubscriptionId = null;
      shop.stripePriceId        = null;
      await shop.save();
      console.log(`[Stripe Webhook] subscription.deleted → ${shop.name} → free`);
    }
  }

  if (type === 'customer.subscription.updated') {
    const sub  = event.data.object;
    const shop = await Barbershop.findOne({ stripeCustomerId: sub.customer });
    if (shop) {
      if (sub.cancel_at_period_end) {
        shop.planStatus = 'cancelled';
      } else if (sub.status === 'active') {
        shop.planStatus = 'active';
        if (sub.current_period_end) {
          shop.planExpiresAt = new Date(sub.current_period_end * 1000);
        }
      }
      await shop.save();
    }
  }

  // One-time payment for packages
  if (type === 'payment_intent.succeeded') {
    const pi = event.data.object;
    if (pi.metadata?.type === 'package') {
      const shop = await Barbershop.findById(pi.metadata.barbershopId);
      if (shop) {
        const already = shop.invoices.some(inv => inv.stripeSessionId === pi.id);
        if (!already) {
          const msgs = parseInt(pi.metadata.messages, 10);
          const qty  = parseInt(pi.metadata.quantity, 10) || 1;
          const now  = new Date();
          const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
          for (let i = 0; i < qty; i++) {
            shop.messagePackages.push({ messages: msgs, remaining: msgs, purchasedAt: now, expiresAt });
          }
          shop.invoices.push({
            description:     `${qty}x Pacote ${msgs.toLocaleString('pt-BR')} msgs (30 dias)`,
            amount:          (PACKAGE_TIERS[msgs] || 0) * qty,
            status:          'paid',
            paidAt:          now,
            stripeSessionId: pi.id,
          });
          await shop.save();
        }
      }
    }
  }

  res.json({ received: true });
};

module.exports = {
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
  handleWebhook,
};
