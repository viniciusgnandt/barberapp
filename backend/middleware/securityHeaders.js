// middleware/securityHeaders.js — Security headers middleware

const helmet = require('helmet');

function securityHeaders() {
  return [
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc:  ["'self'", "https://js.stripe.com"],
          frameSrc:   ["'self'", "https://js.stripe.com", "https://hooks.stripe.com"],
          connectSrc: ["'self'", "https://api.stripe.com"],
          imgSrc:     ["'self'", "data:", "https:", "blob:"],
          styleSrc:   ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
          fontSrc:    ["'self'", "https://fonts.gstatic.com"],
          objectSrc:  ["'none'"],
          baseUri:    ["'self'"],
        },
      },
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
    // Extra headers not covered by helmet defaults
    (_req, res, next) => {
      res.setHeader('X-Frame-Options', 'DENY');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
      res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
      res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
      res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(self)');
      next();
    },
  ];
}

module.exports = securityHeaders;
