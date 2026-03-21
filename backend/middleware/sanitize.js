// middleware/sanitize.js — Input sanitization middleware
// Strips MongoDB operators and trims strings to prevent NoSQL injection

function deepSanitize(obj) {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'string') return obj.trim();
  if (Array.isArray(obj)) return obj.map(deepSanitize);
  if (typeof obj === 'object') {
    const clean = {};
    for (const [key, val] of Object.entries(obj)) {
      // Block MongoDB operators in keys
      if (key.startsWith('$')) continue;
      clean[key] = deepSanitize(val);
    }
    return clean;
  }
  return obj;
}

function sanitizeMiddleware(req, _res, next) {
  if (req.body && typeof req.body === 'object') {
    req.body = deepSanitize(req.body);
  }
  if (req.query && typeof req.query === 'object') {
    req.query = deepSanitize(req.query);
  }
  if (req.params && typeof req.params === 'object') {
    req.params = deepSanitize(req.params);
  }
  next();
}

module.exports = sanitizeMiddleware;
