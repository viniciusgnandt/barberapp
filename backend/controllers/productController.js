// controllers/productController.js

const Product       = require('../models/Product');
const StockMovement = require('../models/StockMovement');

const adminOnly = (req, res, next) => {
  if (req.user?.role !== 'admin')
    return res.status(403).json({ success: false, message: 'Acesso restrito ao administrador.' });
  next();
};

// ── GET /api/products ─────────────────────────────────────────────────────────
const getProducts = async (req, res) => {
  try {
    const { category, lowStock } = req.query;
    const filter = { barbershop: req.user.barbershop._id };
    if (category) filter.category = category;
    if (lowStock === 'true') filter.$expr = { $lte: ['$stock', '$minStock'] };

    const data = await Product.find(filter).sort({ name: 1 });
    res.json({ success: true, count: data.length, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── POST /api/products ────────────────────────────────────────────────────────
const createProduct = [adminOnly, async (req, res) => {
  try {
    const { name, description, brand, category, unit, costPrice, salePrice, stock, minStock } = req.body;
    if (!name || !category || costPrice === undefined)
      return res.status(400).json({ success: false, message: 'Nome, categoria e preço de custo são obrigatórios.' });
    if (category === 'venda' && !salePrice)
      return res.status(400).json({ success: false, message: 'Preço de venda é obrigatório para produtos à venda.' });

    const product = await Product.create({
      name, description, brand, category, unit: unit || 'un',
      costPrice: Number(costPrice),
      salePrice: salePrice ? Number(salePrice) : undefined,
      stock:     Number(stock)    || 0,
      minStock:  Number(minStock) || 0,
      barbershop: req.user.barbershop._id,
    });

    // Registra movimentação inicial se stock > 0
    if (product.stock > 0) {
      await StockMovement.create({
        product:    product._id,
        barbershop: req.user.barbershop._id,
        type:       'entrada',
        quantity:   product.stock,
        unitCost:   product.costPrice,
        notes:      'Estoque inicial',
        createdBy:  req.user._id,
      });
    }

    res.status(201).json({ success: true, data: product });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}];

// ── PUT /api/products/:id ─────────────────────────────────────────────────────
const updateProduct = [adminOnly, async (req, res) => {
  try {
    const product = await Product.findOne({ _id: req.params.id, barbershop: req.user.barbershop._id });
    if (!product) return res.status(404).json({ success: false, message: 'Produto não encontrado.' });

    const fields = ['name', 'description', 'brand', 'category', 'unit', 'costPrice', 'salePrice', 'minStock', 'active'];
    fields.forEach(f => { if (req.body[f] !== undefined) product[f] = req.body[f]; });
    await product.save();

    res.json({ success: true, data: product });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}];

// ── DELETE /api/products/:id ──────────────────────────────────────────────────
const deleteProduct = [adminOnly, async (req, res) => {
  try {
    const product = await Product.findOneAndDelete({ _id: req.params.id, barbershop: req.user.barbershop._id });
    if (!product) return res.status(404).json({ success: false, message: 'Produto não encontrado.' });
    await StockMovement.deleteMany({ product: product._id });
    res.json({ success: true, message: 'Produto removido.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}];

// ── POST /api/products/:id/movement ──────────────────────────────────────────
const addMovement = [adminOnly, async (req, res) => {
  try {
    const { type, quantity, unitCost, unitPrice, notes } = req.body;
    if (!type || !quantity || Number(quantity) <= 0)
      return res.status(400).json({ success: false, message: 'Tipo e quantidade (> 0) são obrigatórios.' });

    const product = await Product.findOne({ _id: req.params.id, barbershop: req.user.barbershop._id });
    if (!product) return res.status(404).json({ success: false, message: 'Produto não encontrado.' });

    const qty = Number(quantity);

    // Atualiza estoque
    if (type === 'entrada') {
      product.stock += qty;
    } else if (type === 'saida' || type === 'venda') {
      if (product.stock < qty)
        return res.status(400).json({ success: false, message: 'Estoque insuficiente.' });
      product.stock -= qty;
    } else if (type === 'ajuste') {
      // qty pode ser positivo (acréscimo) ou negativo (decréscimo) vindo do body
      const delta = Number(req.body.delta ?? qty);
      product.stock = Math.max(0, product.stock + delta);
    }

    await product.save();

    const movement = await StockMovement.create({
      product:    product._id,
      barbershop: req.user.barbershop._id,
      type,
      quantity:  qty,
      unitCost:  unitCost  !== undefined ? Number(unitCost)  : product.costPrice,
      unitPrice: unitPrice !== undefined ? Number(unitPrice) : (product.salePrice || 0),
      notes:     notes || '',
      createdBy: req.user._id,
    });

    res.status(201).json({ success: true, data: { product, movement } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}];

// ── GET /api/products/movements ───────────────────────────────────────────────
const getMovements = [adminOnly, async (req, res) => {
  try {
    const { productId, startDate, endDate, type } = req.query;
    const filter = { barbershop: req.user.barbershop._id };
    if (productId) filter.product = productId;
    if (type)      filter.type    = type;
    if (startDate || endDate) {
      const BRT = 3 * 60 * 60 * 1000;
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(new Date(startDate + 'T00:00:00.000Z').getTime() + BRT);
      if (endDate)   filter.createdAt.$lte = new Date(new Date(endDate   + 'T23:59:59.999Z').getTime() + BRT);
    }

    const data = await StockMovement.find(filter)
      .populate('product',   'name unit category')
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 })
      .limit(200);

    res.json({ success: true, count: data.length, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}];

// ── GET /api/products/report ──────────────────────────────────────────────────
const getStockReport = [adminOnly, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const BRT = 3 * 60 * 60 * 1000;

    const dateFilter = {};
    if (startDate) dateFilter.$gte = new Date(new Date(startDate + 'T00:00:00.000Z').getTime() + BRT);
    if (endDate)   dateFilter.$lte = new Date(new Date(endDate   + 'T23:59:59.999Z').getTime() + BRT);

    const movFilter = { barbershop: req.user.barbershop._id };
    if (startDate || endDate) movFilter.createdAt = dateFilter;

    // Todos os produtos
    const products = await Product.find({ barbershop: req.user.barbershop._id });

    // Movimentações do período
    const movements = await StockMovement.find(movFilter)
      .populate('product',   'name unit category costPrice salePrice')
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 });

    // ── Summary ────────────────────────────────────────────────────────────────
    const totalProducts  = products.length;
    const lowStockCount  = products.filter(p => p.stock <= p.minStock && p.minStock > 0).length;
    const totalStockValue = products.reduce((s, p) => s + p.stock * p.costPrice, 0);

    const sales     = movements.filter(m => m.type === 'venda');
    const salesRevenue = sales.reduce((s, m) => s + m.quantity * m.unitPrice,  0);
    const salesCost    = sales.reduce((s, m) => s + m.quantity * m.unitCost,   0);
    const salesProfit  = salesRevenue - salesCost;
    const salesCount   = sales.length;

    // ── Vendas por produto ─────────────────────────────────────────────────────
    const salesMap = {};
    sales.forEach(m => {
      const id = String(m.product?._id || m.product);
      const name = m.product?.name || '—';
      if (!salesMap[id]) salesMap[id] = { name, unit: m.product?.unit || 'un', quantity: 0, revenue: 0, cost: 0, profit: 0 };
      salesMap[id].quantity += m.quantity;
      salesMap[id].revenue  += m.quantity * m.unitPrice;
      salesMap[id].cost     += m.quantity * m.unitCost;
      salesMap[id].profit   += m.quantity * (m.unitPrice - m.unitCost);
    });
    const salesByProduct = Object.values(salesMap).sort((a, b) => b.revenue - a.revenue);

    // ── Estoque atual por produto ──────────────────────────────────────────────
    const stockList = products.map(p => ({
      _id:        p._id,
      name:       p.name,
      brand:      p.brand,
      category:   p.category,
      unit:       p.unit,
      stock:      p.stock,
      minStock:   p.minStock,
      costPrice:  p.costPrice,
      salePrice:  p.salePrice,
      stockValue: p.stock * p.costPrice,
      lowStock:   p.stock <= p.minStock && p.minStock > 0,
    })).sort((a, b) => a.name.localeCompare(b.name));

    res.json({
      success: true,
      data: {
        summary: { totalProducts, lowStockCount, totalStockValue, salesRevenue, salesCost, salesProfit, salesCount },
        lowStock: stockList.filter(p => p.lowStock),
        salesByProduct,
        stockList,
        movements: movements.slice(0, 100),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}];

module.exports = { getProducts, createProduct, updateProduct, deleteProduct, addMovement, getMovements, getStockReport };
