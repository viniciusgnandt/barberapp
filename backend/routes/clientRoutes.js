// routes/clientRoutes.js

const router = require('express').Router();
const { authMiddleware } = require('../middleware/authMiddleware');
const {
  getClients, getClient, createClient, updateClient, deleteClient, getClientAppointments, rectifyAppointments,
} = require('../controllers/clientController');

router.use(authMiddleware);

router.get('/',                      getClients);
router.post('/rectify',              rectifyAppointments);
router.get('/:id',                   getClient);
router.get('/:id/appointments',      getClientAppointments);
router.post('/',    createClient);
router.put('/:id',  updateClient);
router.delete('/:id', deleteClient);

module.exports = router;
