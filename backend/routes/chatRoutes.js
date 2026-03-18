// routes/chatRoutes.js
const router   = require('express').Router();
const { authMiddleware } = require('../middleware/authMiddleware');
const { sendMessage }    = require('../controllers/chatController');

router.post('/message', authMiddleware, sendMessage);

module.exports = router;
