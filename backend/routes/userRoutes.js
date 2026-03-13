// routes/userRoutes.js

const router = require('express').Router();
const { getMe, updateMe } = require('../controllers/userController');
const { authMiddleware }  = require('../middleware/authMiddleware');

router.use(authMiddleware);

router.get('/me',  getMe);
router.put('/me',  updateMe);

module.exports = router;
