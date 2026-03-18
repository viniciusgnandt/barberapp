// middleware/rateLimit.js — Simple in-memory rate limiter (no external dependency)

const store = new Map();

// Cleanup entries older than 1 hour to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now > entry.resetAt + 60_000) store.delete(key);
  }
}, 60_000);

/**
 * @param {object} opts
 * @param {number} opts.windowMs   - Time window in ms
 * @param {number} opts.max        - Max requests per window
 * @param {string} opts.message    - Error message when limit exceeded
 * @param {function} [opts.keyFn]  - Custom key function (req) => string
 */
function rateLimit({ windowMs, max, message, keyFn }) {
  return (req, res, next) => {
    const key     = keyFn ? keyFn(req) : (req.ip + '|' + req.path);
    const now     = Date.now();
    let   entry   = store.get(key);

    if (!entry || now > entry.resetAt) {
      entry = { count: 0, resetAt: now + windowMs };
    }

    entry.count++;
    store.set(key, entry);

    if (entry.count > max) {
      return res.status(429).json({ success: false, message });
    }

    next();
  };
}

module.exports = rateLimit;
