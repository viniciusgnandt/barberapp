const router = require('express').Router();
const { register, login, selectProfile, switchProfile, getProfiles, getMe } = require('../controllers/authController');
const { authMiddleware } = require('../middleware/authMiddleware');

router.post('/register',        register);
router.post('/login',           login);
router.post('/select-profile',  selectProfile);
router.post('/switch-profile',  authMiddleware, switchProfile);
router.get('/profiles',         authMiddleware, getProfiles);
router.get('/me',               authMiddleware, getMe);

module.exports = router;
