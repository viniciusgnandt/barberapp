// routes/platformAdminRoutes.js — Platform admin routes

const express = require('express');
const router  = express.Router();
const bruteForceMiddleware = require('../middleware/bruteForce');
const { platformAdminAuth, superadminOnly } = require('../middleware/platformAdminAuth');
const ctrl = require('../controllers/platformAdminController');

// ── Public (no auth) ──────────────────────────────────────────────────────────
router.post('/auth/login',            bruteForceMiddleware(), ctrl.login);
router.post('/auth/verify-2fa',       ctrl.verify2FA);
router.post('/auth/accept-invite',    ctrl.acceptInvite);
router.post('/auth/forgot-password',  ctrl.forgotPassword);
router.post('/auth/reset-password',   ctrl.resetPasswordWithCode);

// ── Authenticated ─────────────────────────────────────────────────────────────
router.use(platformAdminAuth);

router.get('/auth/me',              ctrl.getMe);
router.put('/auth/change-password', ctrl.changePassword);
router.get('/dashboard',        ctrl.getDashboard);
router.get('/clients',          ctrl.getClients);
router.get('/ai-stats',         ctrl.getAIStats);

// ── Superadmin only ───────────────────────────────────────────────────────────
router.get ('/admins',                          ctrl.getAdmins);
router.post('/admins/invite',    superadminOnly, ctrl.inviteAdmin);
router.post('/admins/:id/reset-password', superadminOnly, ctrl.resetAdminPassword);

module.exports = router;
