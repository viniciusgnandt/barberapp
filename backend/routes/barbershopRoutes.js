// routes/barbershopRoutes.js

const router = require('express').Router();
const {
  getBarbershops, getMyBarbershop, getBarbershop,
  createBarbershop, updateBarbershop, deleteBarbershop,
  getBarbershopEmployees, removeEmployee,
} = require('../controllers/barbershopController');
const { authMiddleware }        = require('../middleware/authMiddleware');
const { checkBarbershopAccess } = require('../middleware/permissionMiddleware');

router.use(authMiddleware);

router.get('/mine',                         getMyBarbershop);           // qualquer role
router.get('/',                             getBarbershops);
router.get('/:id',                          checkBarbershopAccess, getBarbershop);
router.post('/',                            createBarbershop);
router.put('/:id',                          checkBarbershopAccess, updateBarbershop);
router.delete('/:id',                       checkBarbershopAccess, deleteBarbershop);
router.get('/:id/employees',                checkBarbershopAccess, getBarbershopEmployees);
router.delete('/:id/employees/:userId',     checkBarbershopAccess, removeEmployee);

module.exports = router;
