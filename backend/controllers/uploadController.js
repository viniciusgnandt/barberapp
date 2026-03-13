// controllers/uploadController.js — Controlador de Upload de Arquivos

const multer = require('multer');
const fs     = require('fs');
const path   = require('path');
const https  = require('https');
const crypto = require('crypto');

// ── Multer ─────────────────────────────────────────────────────────────────────
const storage = multer.memoryStorage();
const upload  = multer({
  storage,
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE || '5242880') },
  fileFilter: (_req, file, cb) => {
    const allowed = (process.env.ALLOWED_FILE_TYPES || 'image/jpeg,image/png,image/webp').split(',');
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Tipo de arquivo não permitido'));
  },
});

// ── AWS4-HMAC-SHA256 helpers ───────────────────────────────────────────────────
function hmac(key, data) {
  return crypto.createHmac('sha256', key).update(data).digest();
}

function getSigningKey(secretKey, date, region, service) {
  const kDate    = hmac(Buffer.from(`AWS4${secretKey}`), date);
  const kRegion  = hmac(kDate, region);
  const kService = hmac(kRegion, service);
  return hmac(kService, 'aws4_request');
}

// ── OCI Object Storage (S3-compat) ────────────────────────────────────────────
async function uploadToOCI(fileBuffer, fileName, fileType, tenantId) {
  const namespace = process.env.OCI_NAMESPACE;
  const bucket    = process.env.OCI_BUCKET_NAME;
  const region    = process.env.OCI_REGION || 'us-phoenix-1';
  const accessKey = process.env.OCI_ACCESS_KEY_ID;
  const secretKey = process.env.OCI_SECRET_ACCESS_KEY;

  // Subfolder por tenant: {barbershopId}/{fileType}/{timestamp}-{filename}
  const objectName = `${tenantId}/${fileType}/${Date.now()}-${fileName}`;
  const host       = `${namespace}.compat.objectstorage.${region}.oraclecloud.com`;
  const objPath    = `/${bucket}/${objectName}`;

  // Timestamp strings
  const now     = new Date();
  const amzDate = now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
  const dateStr = amzDate.slice(0, 8);

  // Hash of the file body
  const contentHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

  // Canonical request
  const canonicalHeaders =
    `content-length:${fileBuffer.length}\n` +
    `host:${host}\n` +
    `x-amz-content-sha256:${contentHash}\n` +
    `x-amz-date:${amzDate}\n`;

  const signedHeaders   = 'content-length;host;x-amz-content-sha256;x-amz-date';
  const canonicalRequest = ['PUT', objPath, '', canonicalHeaders, signedHeaders, contentHash].join('\n');

  // String to sign
  const credentialScope = `${dateStr}/${region}/s3/aws4_request`;
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    crypto.createHash('sha256').update(canonicalRequest).digest('hex'),
  ].join('\n');

  // Signature
  const signingKey = getSigningKey(secretKey, dateStr, region, 's3');
  const signature  = crypto.createHmac('sha256', signingKey).update(stringToSign).digest('hex');

  const authorization =
    `AWS4-HMAC-SHA256 Credential=${accessKey}/${credentialScope}, ` +
    `SignedHeaders=${signedHeaders}, Signature=${signature}`;

  return new Promise((resolve, reject) => {
    const options = {
      hostname: host,
      port: 443,
      path: objPath,
      method: 'PUT',
      headers: {
        'Content-Type':          'application/octet-stream',
        'Content-Length':        fileBuffer.length,
        'Authorization':         authorization,
        'x-amz-date':            amzDate,
        'x-amz-content-sha256':  contentHash,
      },
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({
            fileName: objectName,
            url: `https://${host}${objPath}`,
            fileType,
            size: fileBuffer.length,
          });
        } else {
          reject(new Error(`Upload OCI falhou (${res.statusCode}): ${body}`));
        }
      });
    });

    req.on('error', reject);
    req.write(fileBuffer);
    req.end();
  });
}

// ── Local storage (dev fallback) ──────────────────────────────────────────────
async function uploadLocal(fileBuffer, fileName, fileType, tenantId) {
  // Subfolder por tenant: uploads/{barbershopId}/{fileType}/{timestamp}-{filename}
  const uploadDir = path.join(__dirname, '../uploads', String(tenantId), fileType);
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

  const storedName = `${Date.now()}-${fileName}`;
  const filePath   = path.join(uploadDir, storedName);

  return new Promise((resolve, reject) => {
    fs.writeFile(filePath, fileBuffer, (err) => {
      if (err) reject(err);
      else resolve({
        fileName: storedName,
        url: `/uploads/${tenantId}/${fileType}/${storedName}`,
        fileType,
        size: fileBuffer.length,
      });
    });
  });
}

// ── Controller ────────────────────────────────────────────────────────────────
const uploadFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Nenhum arquivo foi enviado.' });
    }

    const uploadType = req.body.type || 'uploads';
    const tenantId   = String(req.user.barbershop?._id ?? req.user.barbershop);
    const useOCI     =
      process.env.OCI_ACCESS_KEY_ID &&
      process.env.OCI_SECRET_ACCESS_KEY &&
      process.env.OCI_NAMESPACE &&
      process.env.OCI_BUCKET_NAME;

    let uploadResult;
    if (useOCI) {
      uploadResult = await uploadToOCI(req.file.buffer, req.file.originalname, uploadType, tenantId);
    } else {
      uploadResult = await uploadLocal(req.file.buffer, req.file.originalname, uploadType, tenantId);
    }

    // Persist URL on the right model
    if (uploadType === 'avatar') {
      const User = require('../models/User');
      await User.findByIdAndUpdate(req.user._id, { profileImage: uploadResult.url });
    } else if (uploadType === 'logo') {
      const Barbershop = require('../models/Barbershop');
      const barbershopId = req.user.barbershop?._id ?? req.user.barbershop;
      await Barbershop.findByIdAndUpdate(barbershopId, { logo: uploadResult.url });
    }

    res.json({ success: true, message: 'Arquivo enviado com sucesso.', data: uploadResult });
  } catch (err) {
    console.error('Erro ao fazer upload:', err.message);
    res.status(500).json({ success: false, message: err.message || 'Erro ao fazer upload.' });
  }
};

module.exports = { upload, uploadFile, uploadToOCI, uploadLocal };
