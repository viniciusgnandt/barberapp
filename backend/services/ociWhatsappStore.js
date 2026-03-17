// services/ociWhatsappStore.js — OCI Object Storage store para whatsapp-web.js RemoteAuth

const https  = require('https');
const crypto = require('crypto');
const fs     = require('fs');

// ── AWS4 signing (mesma lógica do uploadController) ────────────────────────────

function hmac(key, data) {
  return crypto.createHmac('sha256', key).update(data).digest();
}

function buildSignedHeaders(method, objectKey, body, cfg) {
  const now     = new Date();
  const amzDate = now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
  const dateStr = amzDate.slice(0, 8);
  const host    = `${cfg.namespace}.compat.objectstorage.${cfg.region}.oraclecloud.com`;
  const objPath = `/${cfg.bucket}/${objectKey}`;

  const EMPTY_HASH = 'e3b0c44298fc1c149afbf4c8996fb924' +
                     '27ae41e4649b934ca495991b7852b855';
  const contentHash = body
    ? crypto.createHash('sha256').update(body).digest('hex')
    : EMPTY_HASH;

  const extraHeaders = body
    ? `content-length:${body.length}\n`
    : '';

  const canonicalHeaders =
    extraHeaders +
    `host:${host}\n` +
    `x-amz-content-sha256:${contentHash}\n` +
    `x-amz-date:${amzDate}\n`;

  const signedHeaders = body
    ? 'content-length;host;x-amz-content-sha256;x-amz-date'
    : 'host;x-amz-content-sha256;x-amz-date';

  const canonicalRequest = [method, objPath, '', canonicalHeaders, signedHeaders, contentHash].join('\n');

  const credentialScope = `${dateStr}/${cfg.region}/s3/aws4_request`;
  const stringToSign    = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    crypto.createHash('sha256').update(canonicalRequest).digest('hex'),
  ].join('\n');

  const kDate    = hmac(Buffer.from(`AWS4${cfg.secretKey}`), dateStr);
  const kRegion  = hmac(kDate, cfg.region);
  const kService = hmac(kRegion, 's3');
  const kSigning = hmac(kService, 'aws4_request');
  const signature = crypto.createHmac('sha256', kSigning).update(stringToSign).digest('hex');

  const authorization =
    `AWS4-HMAC-SHA256 Credential=${cfg.accessKey}/${credentialScope}, ` +
    `SignedHeaders=${signedHeaders}, Signature=${signature}`;

  return { host, objPath, amzDate, contentHash, authorization };
}

function ociCfg() {
  return {
    namespace: process.env.OCI_NAMESPACE,
    bucket:    process.env.OCI_BUCKET_NAME,
    region:    process.env.OCI_REGION || 'sa-saopaulo-1',
    accessKey: process.env.OCI_ACCESS_KEY_ID,
    secretKey: process.env.OCI_SECRET_ACCESS_KEY,
  };
}

// ── OCI operations ─────────────────────────────────────────────────────────────

function ociPut(objectKey, buffer) {
  return new Promise((resolve, reject) => {
    const cfg = ociCfg();
    const { host, objPath, amzDate, contentHash, authorization } =
      buildSignedHeaders('PUT', objectKey, buffer, cfg);

    const req = https.request({
      hostname: host, port: 443, path: objPath, method: 'PUT',
      headers: {
        'Content-Type':          'application/octet-stream',
        'Content-Length':        buffer.length,
        'Authorization':         authorization,
        'x-amz-date':            amzDate,
        'x-amz-content-sha256':  contentHash,
      },
    }, (res) => {
      let body = '';
      res.on('data', c => { body += c; });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) resolve();
        else reject(new Error(`OCI PUT falhou (${res.statusCode}): ${body}`));
      });
    });
    req.on('error', reject);
    req.write(buffer);
    req.end();
  });
}

function ociGet(objectKey) {
  return new Promise((resolve, reject) => {
    const cfg = ociCfg();
    const { host, objPath, amzDate, contentHash, authorization } =
      buildSignedHeaders('GET', objectKey, null, cfg);

    https.request({
      hostname: host, port: 443, path: objPath, method: 'GET',
      headers: {
        'Authorization':         authorization,
        'x-amz-date':            amzDate,
        'x-amz-content-sha256':  contentHash,
      },
    }, (res) => {
      if (res.statusCode === 404) { res.resume(); return resolve(null); }
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) resolve(Buffer.concat(chunks));
        else reject(new Error(`OCI GET falhou (${res.statusCode})`));
      });
    }).on('error', reject).end();
  });
}

function ociHead(objectKey) {
  return new Promise((resolve, reject) => {
    const cfg = ociCfg();
    const { host, objPath, amzDate, contentHash, authorization } =
      buildSignedHeaders('HEAD', objectKey, null, cfg);

    https.request({
      hostname: host, port: 443, path: objPath, method: 'HEAD',
      headers: {
        'Authorization':         authorization,
        'x-amz-date':            amzDate,
        'x-amz-content-sha256':  contentHash,
      },
    }, (res) => { res.resume(); resolve(res.statusCode === 200); })
      .on('error', reject).end();
  });
}

function ociDelete(objectKey) {
  return new Promise((resolve, reject) => {
    const cfg = ociCfg();
    const { host, objPath, amzDate, contentHash, authorization } =
      buildSignedHeaders('DELETE', objectKey, null, cfg);

    https.request({
      hostname: host, port: 443, path: objPath, method: 'DELETE',
      headers: {
        'Authorization':         authorization,
        'x-amz-date':            amzDate,
        'x-amz-content-sha256':  contentHash,
      },
    }, (res) => { res.resume(); resolve(); })
      .on('error', reject).end();
  });
}

// ── Store interface (whatsapp-web.js RemoteAuth) ───────────────────────────────

class OCIWhatsappStore {
  _key(session) {
    return `whatsapp-sessions/${session}.zip`;
  }

  async sessionExists({ session }) {
    return ociHead(this._key(session));
  }

  // data = Buffer (zip gerado pelo RemoteAuth)
  async save({ session, data }) {
    await ociPut(this._key(session), data);
    console.log(`[Reception] Sessão WhatsApp salva no bucket: ${this._key(session)}`);
  }

  // RemoteAuth chama extract passando o path onde o zip deve ser gravado
  async extract({ session, path: destPath }) {
    const buffer = await ociGet(this._key(session));
    if (!buffer) throw new Error(`Sessão ${session} não encontrada no bucket.`);
    fs.writeFileSync(destPath, buffer);
  }

  async delete({ session }) {
    await ociDelete(this._key(session));
    console.log(`[Reception] Sessão WhatsApp removida do bucket: ${this._key(session)}`);
  }
}

module.exports = OCIWhatsappStore;
