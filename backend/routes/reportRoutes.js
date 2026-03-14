// routes/reportRoutes.js

const router = require('express').Router();
const { getReport } = require('../controllers/reportController');
const { authMiddleware } = require('../middleware/authMiddleware');

router.use(authMiddleware);
router.get('/', getReport);

module.exports = router;
