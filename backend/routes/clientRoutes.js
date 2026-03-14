// routes/clientRoutes.js

const router = require('express').Router();
const { authMiddleware } = require('../middleware/authMiddleware');
const {
  getClients, getClient, createClient, updateClient, deleteClient,
} = require('../controllers/clientController');

router.use(authMiddleware);

router.get('/',     getClients);
router.get('/:id',  getClient);
router.post('/',    createClient);
router.put('/:id',  updateClient);
router.delete('/:id', deleteClient);

module.exports = router;
