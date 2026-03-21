// middleware/bruteForce.js — Progressive delay + lockout for login endpoints

const store = new Map();

// Cleanup every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now > entry.resetAt) store.delete(key);
  }
}, 5 * 60_000);

const LOCKOUT_THRESHOLDS = [
  { attempts: 3,  delayMs: 2_000 },
  { attempts: 5,  delayMs: 5_000 },
  { attempts: 8,  delayMs: 15_000 },
  { attempts: 10, lockoutMs: 15 * 60_000 }, // 15 min lockout
  { attempts: 15, lockoutMs: 60 * 60_000 }, // 1 hour lockout
];

function getThreshold(attempts) {
  let result = null;
  for (const t of LOCKOUT_THRESHOLDS) {
    if (attempts >= t.attempts) result = t;
  }
  return result;
}

/**
 * Track login attempts and apply progressive delay / lockout.
 * Call bruteForce.record(key, success) after auth attempt.
 */
function bruteForceMiddleware() {
  return (req, res, next) => {
    const email = (req.body?.email || '').toLowerCase().trim();
    const ip    = req.ip || req.connection?.remoteAddress || 'unknown';
    const ipKey    = `bf:ip:${ip}`;
    const emailKey = email ? `bf:email:${email}` : null;

    const ipEntry    = store.get(ipKey);
    const emailEntry = emailKey ? store.get(emailKey) : null;

    const maxAttempts = Math.max(ipEntry?.attempts || 0, emailEntry?.attempts || 0);
    const threshold   = getThreshold(maxAttempts);

    if (threshold?.lockoutMs) {
      const lockUntil = Math.max(ipEntry?.lockUntil || 0, emailEntry?.lockUntil || 0);
      if (lockUntil > Date.now()) {
        const minutesLeft = Math.ceil((lockUntil - Date.now()) / 60_000);
        console.warn(`[BruteForce] Locked out: ip=${ip} email=${email} minutes=${minutesLeft}`);
        return res.status(429).json({
          success: false,
          message: `Conta temporariamente bloqueada. Tente novamente em ${minutesLeft} minuto(s).`,
          lockedUntil: new Date(lockUntil).toISOString(),
        });
      }
    }

    // Attach helper to req for the controller to call after auth
    req.bruteForce = {
      recordFailure: () => {
        const now = Date.now();
        for (const key of [ipKey, emailKey].filter(Boolean)) {
          const entry = store.get(key) || { attempts: 0, resetAt: now + 60 * 60_000 };
          entry.attempts++;
          entry.resetAt = now + 60 * 60_000;
          const t = getThreshold(entry.attempts);
          if (t?.lockoutMs) entry.lockUntil = now + t.lockoutMs;
          store.set(key, entry);
        }
        console.warn(`[BruteForce] Failed login: ip=${ip} email=${email} attempts=${maxAttempts + 1}`);
      },
      recordSuccess: () => {
        store.delete(ipKey);
        if (emailKey) store.delete(emailKey);
      },
      delay: threshold?.delayMs || 0,
    };

    // Apply progressive delay
    if (threshold?.delayMs) {
      return setTimeout(next, threshold.delayMs);
    }

    next();
  };
}

module.exports = bruteForceMiddleware;
