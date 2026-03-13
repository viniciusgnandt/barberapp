// routes/uploadRoutes.js — Rotas de Upload

const express = require('express');
const router = express.Router();
const { upload, uploadFile } = require('../controllers/uploadController');
const { authMiddleware } = require('../middleware/authMiddleware');

// POST /api/upload - Fazer upload de arquivo
router.post('/', authMiddleware, upload.single('file'), uploadFile);

// GET /api/upload/test - Verificar se o serviço de upload está funcionando
router.get('/test', (_req, res) => {
  res.json({ message: 'Upload service is running' });
});

module.exports = router;
