const router = require('express').Router();
const {
  register, login, verifyEmail, resendVerification, forgotPassword, resetPassword,
  selectProfile, switchProfile, getProfiles, getMe,
} = require('../controllers/authController');
const { authMiddleware } = require('../middleware/authMiddleware');

router.post('/register',              register);
router.post('/login',                 login);
router.get('/verify-email/:token',    verifyEmail);
router.post('/resend-verification',   resendVerification);
router.post('/forgot-password',       forgotPassword);
router.post('/reset-password/:token', resetPassword);
router.post('/select-profile',        selectProfile);
router.post('/switch-profile',        authMiddleware, switchProfile);
router.get('/profiles',               authMiddleware, getProfiles);
router.get('/me',                     authMiddleware, getMe);

module.exports = router;
