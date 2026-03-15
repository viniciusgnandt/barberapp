// controllers/serviceCategoryController.js

const ServiceCategory = require('../models/ServiceCategory');
const { authMiddleware }      = require('../middleware/authMiddleware');
const { checkServiceManageAccess } = require('../middleware/permissionMiddleware');

// GET /api/service-categories
const getAll = async (req, res) => {
  try {
    const cats = await ServiceCategory
      .find({ barbershop: req.user.barbershop._id })
      .sort({ order: 1, createdAt: 1 });
    res.json({ success: true, data: cats });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/service-categories
const create = [authMiddleware, checkServiceManageAccess, async (req, res) => {
  try {
    const { name, color, order } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Nome é obrigatório.' });

    const cat = await ServiceCategory.create({
      name,
      color: color || '#6366f1',
      order: order ?? 0,
      barbershop: req.user.barbershop._id,
    });
    res.status(201).json({ success: true, data: cat });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}];

// PUT /api/service-categories/:id
const update = [authMiddleware, checkServiceManageAccess, async (req, res) => {
  try {
    const cat = await ServiceCategory.findOneAndUpdate(
      { _id: req.params.id, barbershop: req.user.barbershop._id },
      { $set: req.body },
      { new: true },
    );
    if (!cat) return res.status(404).json({ success: false, message: 'Categoria não encontrada.' });
    res.json({ success: true, data: cat });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}];

// DELETE /api/service-categories/:id
const remove = [authMiddleware, checkServiceManageAccess, async (req, res) => {
  try {
    const Service = require('../models/Service');
    // Unlink services from this category before deleting
    await Service.updateMany(
      { category: req.params.id, barbershop: req.user.barbershop._id },
      { $unset: { category: '' } },
    );
    await ServiceCategory.deleteOne({ _id: req.params.id, barbershop: req.user.barbershop._id });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}];

module.exports = { getAll, create, update, remove };
