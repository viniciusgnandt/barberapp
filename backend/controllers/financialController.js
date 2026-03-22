// controllers/financialController.js — Cash register, transactions, commissions, tabs

const CashRegister = require('../models/CashRegister');
const Transaction  = require('../models/Transaction');
const Commission   = require('../models/Commission');
const Tab          = require('../models/Tab');
const Service      = require('../models/Service');
const Product      = require('../models/Product');
const StockMovement = require('../models/StockMovement');

const shopId = (req) => req.user.barbershop._id;

// ═══════════════════════════════════════════════════════════════════════════════
// CAIXA
// ═══════════════════════════════════════════════════════════════════════════════

const openCashRegister = async (req, res) => {
  try {
    const existing = await CashRegister.findOne({ barbershop: shopId(req), status: 'open' });
    if (existing) return res.status(400).json({ success: false, message: 'Já existe um caixa aberto.' });

    const cash = await CashRegister.create({
      barbershop:     shopId(req),
      openedBy:       req.user._id,
      openingBalance: req.body.openingBalance || 0,
      notes:          req.body.notes,
    });

    res.status(201).json({ success: true, data: cash });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const closeCashRegister = async (req, res) => {
  try {
    const cash = await CashRegister.findOne({ barbershop: shopId(req), status: 'open' });
    if (!cash) return res.status(404).json({ success: false, message: 'Nenhum caixa aberto.' });

    // Calculate closing balance from transactions
    const txns = await Transaction.find({ barbershop: shopId(req), cashRegister: cash._id });
    const balance = cash.openingBalance + txns.reduce((sum, t) =>
      t.type === 'entrada' ? sum + t.amount : sum - t.amount, 0);

    cash.status         = 'closed';
    cash.closedBy       = req.user._id;
    cash.closedAt       = new Date();
    cash.closingBalance = req.body.closingBalance ?? balance;
    cash.notes          = req.body.notes || cash.notes;
    await cash.save();

    res.json({ success: true, data: { ...cash.toObject(), calculatedBalance: balance } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getCurrentCashRegister = async (req, res) => {
  try {
    const cash = await CashRegister.findOne({ barbershop: shopId(req), status: 'open' })
      .populate('openedBy', 'name');
    if (!cash) return res.json({ success: true, data: null });

    const txns = await Transaction.find({ barbershop: shopId(req), cashRegister: cash._id });
    const balance = cash.openingBalance + txns.reduce((sum, t) =>
      t.type === 'entrada' ? sum + t.amount : sum - t.amount, 0);

    res.json({ success: true, data: { ...cash.toObject(), currentBalance: balance, transactionCount: txns.length } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getCashHistory = async (req, res) => {
  try {
    const { page = 1, limit = 20, startDate, endDate } = req.query;
    const filter = { barbershop: shopId(req) };
    if (startDate || endDate) {
      filter.openedAt = {};
      if (startDate) filter.openedAt.$gte = new Date(startDate);
      if (endDate)   filter.openedAt.$lte = new Date(endDate + 'T23:59:59.999Z');
    }

    const [registers, total] = await Promise.all([
      CashRegister.find(filter)
        .populate('openedBy', 'name')
        .populate('closedBy', 'name')
        .sort({ openedAt: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit)),
      CashRegister.countDocuments(filter),
    ]);

    res.json({ success: true, data: { registers, total, page: Number(page), pages: Math.ceil(total / limit) } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// TRANSACTIONS (Entradas e Saídas)
// ═══════════════════════════════════════════════════════════════════════════════

const createTransaction = async (req, res) => {
  try {
    const { type, category, amount, description, paymentMethod, barber, client } = req.body;
    if (!type || !amount || amount <= 0)
      return res.status(400).json({ success: false, message: 'Tipo e valor são obrigatórios.' });

    // Auto-link to open cash register
    const openCash = await CashRegister.findOne({ barbershop: shopId(req), status: 'open' });

    const txn = await Transaction.create({
      barbershop:    shopId(req),
      cashRegister:  openCash?._id,
      type,
      category:      category || 'outros',
      amount,
      description,
      paymentMethod: paymentMethod || 'dinheiro',
      barber,
      client,
      createdBy:     req.user._id,
    });

    res.status(201).json({ success: true, data: txn });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getTransactions = async (req, res) => {
  try {
    const { page = 1, limit = 50, type, category, startDate, endDate, cashRegister } = req.query;
    const filter = { barbershop: shopId(req) };
    if (type)         filter.type = type;
    if (category)     filter.category = category;
    if (cashRegister) filter.cashRegister = cashRegister;
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate)   filter.createdAt.$lte = new Date(endDate + 'T23:59:59.999Z');
    }

    const [txns, total] = await Promise.all([
      Transaction.find(filter)
        .populate('barber', 'name')
        .populate('client', 'name')
        .populate('createdBy', 'name')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit)),
      Transaction.countDocuments(filter),
    ]);

    // Summary
    const summary = await Transaction.aggregate([
      { $match: filter },
      { $group: { _id: '$type', total: { $sum: '$amount' } } },
    ]);
    const entradas = summary.find(s => s._id === 'entrada')?.total || 0;
    const saidas   = summary.find(s => s._id === 'saida')?.total || 0;

    res.json({
      success: true,
      data: { transactions: txns, total, page: Number(page), pages: Math.ceil(total / limit), summary: { entradas, saidas, saldo: entradas - saidas } },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const updateTransaction = async (req, res) => {
  try {
    const allowed = ['amount', 'description', 'category', 'paymentMethod'];
    const updates = {};
    allowed.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });
    const txn = await Transaction.findOneAndUpdate(
      { _id: req.params.id, barbershop: shopId(req) },
      updates,
      { new: true }
    );
    if (!txn) return res.status(404).json({ success: false, message: 'Transação não encontrada.' });
    res.json({ success: true, data: txn });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const deleteTransaction = async (req, res) => {
  try {
    const txn = await Transaction.findOneAndDelete({ _id: req.params.id, barbershop: shopId(req) });
    if (!txn) return res.status(404).json({ success: false, message: 'Transação não encontrada.' });
    res.json({ success: true, message: 'Transação removida.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// COMMISSIONS
// ═══════════════════════════════════════════════════════════════════════════════

const getCommissions = async (req, res) => {
  try {
    const { page = 1, limit = 50, barber, status, startDate, endDate } = req.query;
    const filter = { barbershop: shopId(req) };
    if (barber)   filter.barber = barber;
    if (status)   filter.status = status;
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate)   filter.createdAt.$lte = new Date(endDate + 'T23:59:59.999Z');
    }

    const [commissions, total] = await Promise.all([
      Commission.find(filter)
        .populate('barber', 'name')
        .populate('service', 'name')
        .populate('paidBy', 'name')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit)),
      Commission.countDocuments(filter),
    ]);

    // Summary per barber
    const summary = await Commission.aggregate([
      { $match: filter },
      {
        $group: {
          _id:      { barber: '$barber', status: '$status' },
          total:    { $sum: '$commissionAmount' },
          discount: { $sum: '$discount' },
          count:    { $sum: 1 },
        },
      },
      { $lookup: { from: 'users', localField: '_id.barber', foreignField: '_id', as: 'barberInfo' } },
      { $unwind: '$barberInfo' },
      { $project: { barberName: '$barberInfo.name', status: '$_id.status', total: 1, discount: 1, count: 1 } },
    ]);

    res.json({
      success: true,
      data: { commissions, total, page: Number(page), pages: Math.ceil(total / limit), summary },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const payCommission = async (req, res) => {
  try {
    const { commissionIds, discount = 0, discountReason } = req.body;
    if (!commissionIds?.length)
      return res.status(400).json({ success: false, message: 'IDs das comissões obrigatórios.' });

    const result = await Commission.updateMany(
      { _id: { $in: commissionIds }, barbershop: shopId(req), status: 'pendente' },
      { $set: { status: 'pago', paidAt: new Date(), paidBy: req.user._id, discount, discountReason } },
    );

    // Record as transaction — one entry per barber
    const paid = await Commission.find({ _id: { $in: commissionIds } })
      .populate('barber', 'name');
    const totalPaid = paid.reduce((s, c) => s + c.commissionAmount - (c.discount || 0), 0);

    if (totalPaid > 0) {
      const openCash = await CashRegister.findOne({ barbershop: shopId(req), status: 'open' });
      const paymentMethod = req.body.paymentMethod || 'dinheiro';

      // Group by barber to create one transaction per barber
      const byBarber = {};
      paid.forEach(c => {
        const bid = String(c.barber?._id || c.barber);
        if (!byBarber[bid]) byBarber[bid] = { barber: c.barber, amount: 0, count: 0 };
        byBarber[bid].amount += c.commissionAmount - (c.discount || 0);
        byBarber[bid].count++;
      });

      await Promise.all(Object.values(byBarber).map(g =>
        Transaction.create({
          barbershop:    shopId(req),
          cashRegister:  openCash?._id,
          type:          'saida',
          category:      'comissao',
          amount:        g.amount,
          description:   `Comissão — ${g.barber?.name || 'Profissional'} (${g.count} serviço(s))`,
          paymentMethod,
          barber:        g.barber?._id || g.barber,
          createdBy:     req.user._id,
        })
      ));
    }

    res.json({ success: true, message: `${result.modifiedCount} comissão(ões) pagas.`, totalPaid });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// TABS (Comandas)
// ═══════════════════════════════════════════════════════════════════════════════

const createTab = async (req, res) => {
  try {
    const { clientName, client, barber, appointment } = req.body;
    if (!barber) return res.status(400).json({ success: false, message: 'Profissional obrigatório.' });

    const tab = await Tab.create({
      barbershop: shopId(req),
      clientName,
      client,
      barber,
      appointment,
    });

    res.status(201).json({ success: true, data: tab });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getTabs = async (req, res) => {
  try {
    const { status, page = 1, limit = 50 } = req.query;
    const filter = { barbershop: shopId(req) };
    if (status) filter.status = status;

    const [tabs, total] = await Promise.all([
      Tab.find(filter)
        .populate('barber', 'name')
        .populate('client', 'name phone')
        .populate('closedBy', 'name')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit)),
      Tab.countDocuments(filter),
    ]);

    res.json({ success: true, data: { tabs, total, page: Number(page), pages: Math.ceil(total / limit) } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getTab = async (req, res) => {
  try {
    const tab = await Tab.findOne({ _id: req.params.id, barbershop: shopId(req) })
      .populate('barber', 'name')
      .populate('client', 'name phone')
      .populate('items.service', 'name price')
      .populate('items.product', 'name salePrice');
    if (!tab) return res.status(404).json({ success: false, message: 'Comanda não encontrada.' });
    res.json({ success: true, data: tab });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const addTabItem = async (req, res) => {
  try {
    const tab = await Tab.findOne({ _id: req.params.id, barbershop: shopId(req) });
    if (!tab) return res.status(404).json({ success: false, message: 'Comanda não encontrada.' });

    const { type, serviceId, productId, quantity = 1 } = req.body;
    let item;

    if (type === 'servico' && serviceId) {
      const svc = await Service.findOne({ _id: serviceId, barbershop: shopId(req) });
      if (!svc) return res.status(404).json({ success: false, message: 'Serviço não encontrado.' });
      item = { type: 'servico', service: svc._id, name: svc.name, quantity, unitPrice: svc.price, total: svc.price * quantity };
    } else if (type === 'produto' && productId) {
      const prod = await Product.findOne({ _id: productId, barbershop: shopId(req) });
      if (!prod) return res.status(404).json({ success: false, message: 'Produto não encontrado.' });
      item = { type: 'produto', product: prod._id, name: prod.name, quantity, unitPrice: prod.salePrice, total: prod.salePrice * quantity };
    } else {
      return res.status(400).json({ success: false, message: 'Tipo, serviceId ou productId obrigatórios.' });
    }

    tab.items.push(item);
    tab.subtotal = tab.items.reduce((s, i) => s + i.total, 0);
    tab.total    = tab.subtotal - (tab.discount || 0);
    await tab.save();

    res.json({ success: true, data: tab });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const removeTabItem = async (req, res) => {
  try {
    const tab = await Tab.findOne({ _id: req.params.id, barbershop: shopId(req) });
    if (!tab) return res.status(404).json({ success: false, message: 'Comanda não encontrada.' });

    tab.items.id(req.params.itemId)?.deleteOne();
    tab.subtotal = tab.items.reduce((s, i) => s + i.total, 0);
    tab.total    = tab.subtotal - (tab.discount || 0);
    await tab.save();

    res.json({ success: true, data: tab });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const closeTab = async (req, res) => {
  try {
    const tab = await Tab.findOne({ _id: req.params.id, barbershop: shopId(req), status: 'aberta' })
      .populate('items.service');
    if (!tab) return res.status(404).json({ success: false, message: 'Comanda não encontrada ou já fechada.' });

    const { paymentMethod, discount = 0 } = req.body;
    tab.discount      = discount;
    tab.total         = tab.subtotal - discount;
    tab.status        = 'finalizada';
    tab.paymentMethod = paymentMethod || 'dinheiro';
    tab.closedAt      = new Date();
    tab.closedBy      = req.user._id;
    await tab.save();

    // Record transactions — separate per category (servico / produto)
    const openCash = await CashRegister.findOne({ barbershop: shopId(req), status: 'open' });
    if (tab.total > 0) {
      const ratio = tab.subtotal > 0 ? tab.total / tab.subtotal : 1; // apply discount proportionally
      const svcTotal  = tab.items.filter(i => i.type === 'servico').reduce((s, i) => s + (i.total || 0), 0);
      const prodTotal = tab.items.filter(i => i.type === 'produto').reduce((s, i) => s + (i.total || 0), 0);

      const baseEntry = {
        barbershop:    shopId(req),
        cashRegister:  openCash?._id,
        type:          'entrada',
        barber:        tab.barber,
        client:        tab.client,
        tab:           tab._id,
        paymentMethod: tab.paymentMethod,
        createdBy:     req.user._id,
      };

      if (svcTotal > 0) {
        await Transaction.create({
          ...baseEntry,
          category:    'servico',
          amount:      Math.round(svcTotal * ratio * 100) / 100,
          description: `Comanda #${tab._id.toString().slice(-6)} — ${tab.clientName || 'Cliente'} (serviços)`,
        });
      }
      if (prodTotal > 0) {
        await Transaction.create({
          ...baseEntry,
          category:    'produto',
          amount:      Math.round(prodTotal * ratio * 100) / 100,
          description: `Comanda #${tab._id.toString().slice(-6)} — ${tab.clientName || 'Cliente'} (produtos)`,
        });
      }
      // Fallback: if no typed items (edge case), record as comanda
      if (svcTotal === 0 && prodTotal === 0) {
        await Transaction.create({
          ...baseEntry,
          category:    'comanda',
          amount:      tab.total,
          description: `Comanda #${tab._id.toString().slice(-6)} — ${tab.clientName || 'Cliente'}`,
        });
      }
    }

    // Generate commissions for services
    for (const item of tab.items) {
      if (item.type === 'servico' && item.service) {
        const svc = await Service.findById(item.service);
        if (svc && svc.commission > 0) {
          await Commission.create({
            barbershop:       shopId(req),
            barber:           tab.barber,
            tab:              tab._id,
            service:          svc._id,
            serviceName:      svc.name,
            serviceAmount:    item.total,
            commissionRate:   svc.commission,
            commissionAmount: Math.round(item.total * svc.commission / 100 * 100) / 100,
          });
        }
      }
      // Deduct stock for products
      if (item.type === 'produto' && item.product) {
        const prod = await Product.findById(item.product);
        if (prod) {
          prod.stock = Math.max(0, prod.stock - item.quantity);
          await prod.save();
          await StockMovement.create({
            product:    prod._id,
            barbershop: shopId(req),
            type:       'venda',
            quantity:   -item.quantity,
            unitPrice:  item.unitPrice,
            notes:      `Comanda #${tab._id.toString().slice(-6)}`,
            createdBy:  req.user._id,
          });
        }
      }
    }

    res.json({ success: true, data: tab });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const reopenTab = async (req, res) => {
  try {
    const tab = await Tab.findOne({ _id: req.params.id, barbershop: shopId(req) });
    if (!tab) return res.status(404).json({ success: false, message: 'Comanda não encontrada.' });
    if (tab.status === 'aberta') return res.json({ success: true, data: tab });
    tab.status    = 'aberta';
    tab.closedAt  = undefined;
    tab.closedBy  = undefined;
    await tab.save();
    const populated = await Tab.findById(tab._id)
      .populate('barber', 'name')
      .populate('client', 'name phone')
      .populate('items.service', 'name price commission duration');
    res.json({ success: true, data: populated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// BALANÇO PATRIMONIAL
// ═══════════════════════════════════════════════════════════════════════════════

const getBalanceSheet = async (req, res) => {
  try {
    const shop = shopId(req);
    const { startDate, endDate } = req.query;

    // ── ATIVO CIRCULANTE ────────────────────────────────────────────────────

    // 1. Disponibilidades — saldo acumulado de todas as transações do caixa
    const txnAll = await Transaction.aggregate([
      { $match: { barbershop: shop } },
      { $group: { _id: '$type', total: { $sum: '$amount' } } },
    ]);
    const totalEntradas = txnAll.find(t => t._id === 'entrada')?.total || 0;
    const totalSaidas   = txnAll.find(t => t._id === 'saida')?.total   || 0;
    const saldoCaixa    = Math.max(0, totalEntradas - totalSaidas);

    // 2. Caixa aberto agora
    const openRegister = await CashRegister.findOne({ barbershop: shop, status: 'open' }).lean();

    // 3. Contas a receber — comandas abertas ainda não pagas
    const openTabsAgg = await Tab.aggregate([
      { $match: { barbershop: shop, status: 'aberta' } },
      { $group: { _id: null, total: { $sum: '$total' }, count: { $sum: 1 } } },
    ]);
    const contasAReceber      = openTabsAgg[0]?.total || 0;
    const contasAReceberCount = openTabsAgg[0]?.count || 0;

    // 4. Estoques — valor de custo dos produtos em estoque
    const products     = await Product.find({ barbershop: shop, active: true }).lean();
    const valorEstoque = products.reduce((s, p) => s + (p.stock || 0) * (p.costPrice || 0), 0);
    const qtdEstoque   = products.reduce((s, p) => s + (p.stock || 0), 0);

    // ── PASSIVO CIRCULANTE ──────────────────────────────────────────────────

    // 5. Comissões a pagar — obrigações com profissionais
    const commAgg = await Commission.aggregate([
      { $match: { barbershop: shop, status: 'pendente' } },
      { $group: { _id: null, total: { $sum: '$commissionAmount' }, count: { $sum: 1 } } },
    ]);
    const comissoesAPagar      = commAgg[0]?.total || 0;
    const comissoesAPagarCount = commAgg[0]?.count || 0;

    // 6. Saídas comprometidas por categoria (fornecedores/impostos/aluguel)
    //    Considera o mês corrente como referência de despesas recorrentes
    const now         = new Date();
    const mesInicio   = new Date(now.getFullYear(), now.getMonth(), 1);
    const mesActualAgg = await Transaction.aggregate([
      { $match: { barbershop: shop, type: 'saida', createdAt: { $gte: mesInicio } } },
      { $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } },
      { $sort: { total: -1 } },
    ]);

    // ── DRE — Demonstração do Resultado do Exercício ────────────────────────

    const dreMatch = { barbershop: shop };
    if (startDate || endDate) {
      dreMatch.createdAt = {};
      if (startDate) dreMatch.createdAt.$gte = new Date(startDate);
      if (endDate)   dreMatch.createdAt.$lte = new Date(endDate + 'T23:59:59.999Z');
    }

    const [dreAgg, dreByCat, dreByMethod] = await Promise.all([
      Transaction.aggregate([
        { $match: dreMatch },
        { $group: { _id: '$type', total: { $sum: '$amount' }, count: { $sum: 1 } } },
      ]),
      Transaction.aggregate([
        { $match: dreMatch },
        { $group: { _id: { type: '$type', category: '$category' }, total: { $sum: '$amount' }, count: { $sum: 1 } } },
        { $sort: { total: -1 } },
      ]),
      Transaction.aggregate([
        { $match: { ...dreMatch, type: 'entrada' } },
        { $group: { _id: '$paymentMethod', total: { $sum: '$amount' }, count: { $sum: 1 } } },
      ]),
    ]);

    const receitaBruta     = dreAgg.find(t => t._id === 'entrada')?.total || 0;
    const despesasTotais   = dreAgg.find(t => t._id === 'saida')?.total   || 0;
    const resultadoLiquido = receitaBruta - despesasTotais;

    // Agrupa saídas por categoria para o DRE
    const despesasPorCategoria = dreByCat
      .filter(r => r._id.type === 'saida')
      .map(r => ({ category: r._id.category || 'outros', total: r.total, count: r.count }));

    const receitasPorCategoria = dreByCat
      .filter(r => r._id.type === 'entrada')
      .map(r => ({ category: r._id.category || 'outros', total: r.total, count: r.count }));

    // ── Totais e equação contábil ───────────────────────────────────────────

    const ativoCirculante    = saldoCaixa + contasAReceber + valorEstoque;
    const ativoTotal         = ativoCirculante; // sem ativo não-circulante por ora
    const passivoCirculante  = comissoesAPagar;
    const passivoTotal       = passivoCirculante;
    const patrimonioLiquido  = ativoTotal - passivoTotal;

    // ── Indicadores ─────────────────────────────────────────────────────────

    const capitalDeGiro     = ativoCirculante - passivoCirculante;
    const liquidezCorrente  = passivoCirculante > 0
      ? +(ativoCirculante / passivoCirculante).toFixed(2) : null;
    const endividamento     = ativoTotal > 0
      ? +((passivoTotal / ativoTotal) * 100).toFixed(1) : 0;
    const margemLiquida     = receitaBruta > 0
      ? +((resultadoLiquido / receitaBruta) * 100).toFixed(1) : 0;
    const giroAtivo         = ativoTotal > 0
      ? +(receitaBruta / ativoTotal).toFixed(2) : null;

    res.json({
      success: true,
      data: {
        referenceDate: new Date(),
        caixaAberto:   !!openRegister,

        ativo: {
          circulante: {
            caixa:          { valor: saldoCaixa,      label: 'Disponibilidades (Caixa)' },
            contasAReceber: { valor: contasAReceber,   label: 'Contas a Receber', count: contasAReceberCount },
            estoques:       { valor: valorEstoque,     label: 'Estoques', count: qtdEstoque },
          },
          totalCirculante: ativoCirculante,
          total:           ativoTotal,
        },

        passivo: {
          circulante: {
            comissoesAPagar: { valor: comissoesAPagar, label: 'Comissões a Pagar', count: comissoesAPagarCount },
          },
          totalCirculante: passivoCirculante,
          total:           passivoTotal,
          mesAtual:        mesActualAgg,
        },

        patrimonioLiquido: {
          capitalProprio: { valor: patrimonioLiquido, label: 'Patrimônio Líquido' },
          total:          patrimonioLiquido,
        },

        equacao: {
          ativo:        ativoTotal,
          passivoPL:    passivoTotal + patrimonioLiquido,
          equilibrado:  Math.abs(ativoTotal - (passivoTotal + patrimonioLiquido)) < 0.01,
        },

        dre: {
          periodo:               { startDate: startDate || null, endDate: endDate || null },
          receitaBruta,
          despesasTotais,
          resultadoLiquido,
          receitasPorCategoria,
          despesasPorCategoria,
          receitasPorMetodo: dreByMethod.map(r => ({ method: r._id || 'dinheiro', total: r.total, count: r.count })),
        },

        indicadores: {
          capitalDeGiro,
          liquidezCorrente,
          endividamento,
          margemLiquida,
          giroAtivo,
        },
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  openCashRegister, closeCashRegister, getCurrentCashRegister, getCashHistory,
  createTransaction, getTransactions, updateTransaction, deleteTransaction,
  getCommissions, payCommission,
  createTab, getTabs, getTab, addTabItem, removeTabItem, closeTab, reopenTab,
  getBalanceSheet,
};
