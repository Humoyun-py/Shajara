import rateLimit from 'express-rate-limit';
import type { Request } from 'express';

const isTest = process.env.NODE_ENV === 'test';
const message = {
  error: {
    code: 'TOO_MANY_REQUESTS',
    message: "Juda ko'p urinish. Birozdan so'ng qayta urinib ko'ring.",
  },
};

/** Per-IP brute-force guard for credential endpoints (per-account lockout lives in the auth service). */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: isTest ? 1000 : 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message,
});

export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: isTest ? 1000 : 120,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: (req: Request) => req.user?.id ?? req.ip ?? 'anon',
  message,
});

export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: isTest ? 10_000 : 600,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message,
});
