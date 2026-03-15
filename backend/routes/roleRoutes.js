// routes/roleRoutes.js

const router = require('express').Router();
const { getRoles, createRole, updateRole, deleteRole } = require('../controllers/roleController');
const { authMiddleware } = require('../middleware/authMiddleware');

const adminOnly = (req, res, next) => {
  if (req.user.role !== 'admin')
    return res.status(403).json({ success: false, message: 'Apenas administradores podem gerenciar funções.' });
  next();
};

router.use(authMiddleware);
router.get('/',     getRoles);
router.post('/',    adminOnly, createRole);
router.put('/:id',  adminOnly, updateRole);
router.delete('/:id', adminOnly, deleteRole);

module.exports = router;
