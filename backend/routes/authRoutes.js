const router = require('express').Router();
const { register, login, getMe } = require('../controllers/authController');
const { authMiddleware } = require('../middleware/authMiddleware');

router.post('/register', register);
router.post('/login',    login);
router.get('/me',        authMiddleware, getMe);

module.exports = router;
