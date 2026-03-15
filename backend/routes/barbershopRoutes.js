// routes/barbershopRoutes.js

const router = require('express').Router();
const {
  getBarbershops, getMyBarbershop, getBarbershop,
  createBarbershop, updateBarbershop, deleteBarbershop,
  getBarbershopEmployees, createEmployee, resetEmployeePassword, updateEmployeeRole, removeEmployee,
} = require('../controllers/barbershopController');
const { authMiddleware }        = require('../middleware/authMiddleware');
const { checkBarbershopAccess } = require('../middleware/permissionMiddleware');

router.use(authMiddleware);

router.get('/mine',                                          getMyBarbershop);
router.get('/',                                              getBarbershops);
router.get('/:id',                                           checkBarbershopAccess, getBarbershop);
router.post('/',                                             createBarbershop);
router.put('/:id',                                           checkBarbershopAccess, updateBarbershop);
router.delete('/:id',                                        checkBarbershopAccess, deleteBarbershop);
router.get('/:id/employees',                                 checkBarbershopAccess, getBarbershopEmployees);
router.post('/:id/employees',                                checkBarbershopAccess, createEmployee);
router.put('/:id/employees/:userId/reset-password',          checkBarbershopAccess, resetEmployeePassword);
router.put('/:id/employees/:userId/role',                    checkBarbershopAccess, updateEmployeeRole);
router.delete('/:id/employees/:userId',                      checkBarbershopAccess, removeEmployee);

module.exports = router;
