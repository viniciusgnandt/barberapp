// routes/portalRoutes.js
const router     = require('express').Router();
const clientAuth = require('../middleware/clientAuthMiddleware');
const {
  registerClient, loginClient, meClient, updateClientProfile,
  forgotClientPassword, resetClientPassword,
  searchBarbershops, getBarbershop, getSlots,
  getClientAppointments, createClientAppointment, cancelClientAppointment,
} = require('../controllers/portalController');

// Auth
router.post('/auth/register',        registerClient);
router.post('/auth/login',           loginClient);
router.get ('/auth/me',              clientAuth, meClient);
router.put ('/auth/me',              clientAuth, updateClientProfile);
router.post('/auth/forgot-password', forgotClientPassword);
router.post('/auth/reset-password',  resetClientPassword);

// Public discovery
router.get('/barbershops',           searchBarbershops);
router.get('/barbershops/:id',       getBarbershop);
router.get('/barbershops/:id/slots', getSlots);

// Client appointments (auth required)
router.get ('/appointments',          clientAuth, getClientAppointments);
router.post('/appointments',          clientAuth, createClientAppointment);
router.put ('/appointments/:id/cancel', clientAuth, cancelClientAppointment);

module.exports = router;
