// routes/userRoutes.js

const router = require('express').Router();
const { getMe, updateMe, savePreferences } = require('../controllers/userController');
const { authMiddleware }  = require('../middleware/authMiddleware');

router.use(authMiddleware);

router.get('/me',           getMe);
router.put('/me',           updateMe);
router.put('/me/preferences', savePreferences);

module.exports = router;
