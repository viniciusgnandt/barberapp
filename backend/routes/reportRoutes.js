// routes/reportRoutes.js

const router = require('express').Router();
const {
  getReport,
  getOverview,
  getServicesReport,
  getSalesReport,
  getFinancialReport,
  getProfessionalsReport,
  getAgendaReport,
  getClientsReport,
  getStockReport,
  getReceptionReport,
  getCustomReport,
  getFilterOptions,
} = require('../controllers/reportController');
const { authMiddleware } = require('../middleware/authMiddleware');

router.use(authMiddleware);

// Legacy
router.get('/', getReport);

// New report endpoints
router.get('/filters',       getFilterOptions);
router.get('/overview',      getOverview);
router.get('/services',      getServicesReport);
router.get('/sales',         getSalesReport);
router.get('/financial',     getFinancialReport);
router.get('/professionals', getProfessionalsReport);
router.get('/agenda',        getAgendaReport);
router.get('/clients',       getClientsReport);
router.get('/stock',         getStockReport);
router.get('/reception',     getReceptionReport);
router.post('/custom',       getCustomReport);

module.exports = router;
