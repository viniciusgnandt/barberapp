// routes/barbershopRoutes.js

const router = require('express').Router();
const {
  getBarbershops,
  getBarbershop,
  createBarbershop,
  updateBarbershop,
  deleteBarbershop,
  getBarbershopEmployees,
} = require('../controllers/barbershopController');
const { authMiddleware } = require('../middleware/authMiddleware');
const { checkBarbershopAccess } = require('../middleware/permissionMiddleware');

router.use(authMiddleware);

router.get('/',                 getBarbershops);
router.get('/:id',              checkBarbershopAccess, getBarbershop);
router.post('/',                createBarbershop);
router.put('/:id',              checkBarbershopAccess, updateBarbershop);
router.delete('/:id',           checkBarbershopAccess, deleteBarbershop);
router.get('/:id/employees',    checkBarbershopAccess, getBarbershopEmployees);

module.exports = router;
