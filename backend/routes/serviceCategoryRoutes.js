// routes/serviceCategoryRoutes.js

const express = require('express');
const router  = express.Router();
const { authMiddleware } = require('../middleware/authMiddleware');
const ctrl = require('../controllers/serviceCategoryController');

router.get('/',     authMiddleware, ctrl.getAll);
router.post('/',    ...ctrl.create);
router.put('/:id',  ...ctrl.update);
router.delete('/:id', ...ctrl.remove);

module.exports = router;
