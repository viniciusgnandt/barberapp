// routes/financialRoutes.js — Financial module routes

const express = require('express');
const router  = express.Router();
const { authMiddleware } = require('../middleware/authMiddleware');
const ctrl = require('../controllers/financialController');

router.use(authMiddleware);

// ── Caixa ─────────────────────────────────────────────────────────────────────
router.get ('/cash',          ctrl.getCurrentCashRegister);
router.post('/cash/open',     ctrl.openCashRegister);
router.post('/cash/close',    ctrl.closeCashRegister);
router.get ('/cash/history',  ctrl.getCashHistory);

// ── Transações (entradas e saídas) ────────────────────────────────────────────
router.get   ('/transactions',     ctrl.getTransactions);
router.post  ('/transactions',     ctrl.createTransaction);
router.put   ('/transactions/:id', ctrl.updateTransaction);
router.delete('/transactions/:id', ctrl.deleteTransaction);

// ── Comissões ─────────────────────────────────────────────────────────────────
router.get ('/commissions',     ctrl.getCommissions);
router.post('/commissions/pay', ctrl.payCommission);

// ── Balanço Patrimonial ───────────────────────────────────────────────────────
router.get('/balance-sheet', ctrl.getBalanceSheet);

// ── Comandas ──────────────────────────────────────────────────────────────────
router.get   ('/tabs',                      ctrl.getTabs);
router.post  ('/tabs',                      ctrl.createTab);
router.get   ('/tabs/:id',                  ctrl.getTab);
router.post  ('/tabs/:id/items',            ctrl.addTabItem);
router.delete('/tabs/:id/items/:itemId',    ctrl.removeTabItem);
router.post  ('/tabs/:id/close',            ctrl.closeTab);
router.post  ('/tabs/:id/reopen',           ctrl.reopenTab);

module.exports = router;
