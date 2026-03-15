// routes/productRoutes.js

const express = require('express');
const router  = express.Router();
const { authMiddleware: auth } = require('../middleware/authMiddleware');
const ctrl    = require('../controllers/productController');

router.use(auth);

// Rotas específicas ANTES de /:id para evitar conflito
router.get('/report',    ...ctrl.getStockReport);
router.get('/movements', ...ctrl.getMovements);

router.get('/',              ctrl.getProducts);
router.post('/',             ...ctrl.createProduct);
router.put('/:id',           ...ctrl.updateProduct);
router.delete('/:id',        ...ctrl.deleteProduct);
router.post('/:id/movement', ...ctrl.addMovement);

module.exports = router;
