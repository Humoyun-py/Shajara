import { Router, type NextFunction, type Request, type Response } from 'express';
import {
  loginSchema,
  passwordResetConfirmSchema,
  passwordResetRequestSchema,
  registerSchema,
} from '@avlod/shared';
import { env } from '../../config/env';
import { body, ok } from '../../lib/http';
import { forbidden } from '../../lib/errors';
import { requireAuth } from '../../middleware/auth';
import { authLimiter } from '../../middleware/rateLimit';
import { currentUser } from '../../middleware/family';
import { audit } from '../../lib/audit';
import { prisma } from '../../lib/prisma';
import * as auth from './auth.service';

export const authRouter = Router();

/** Cookie-authenticated endpoints only accept browser requests from the web origin (CSRF defence). */
function sameOrigin(req: Request, _res: Response, next: NextFunction) {
  const origin = req.get('origin');
  if (origin && origin !== env.WEB_ORIGIN && origin !== `${req.protocol}://${req.get('host')}`) {
    throw forbidden('Ruxsat etilmagan manba.');
  }
  next();
}

const refreshCookie = (req: Request): string | undefined => req.cookies?.[auth.REFRESH_COOKIE];

authRouter.post('/register', authLimiter, sameOrigin, async (req, res) => {
  const input = body(req, registerSchema);
  const user = await auth.register(input);
  await audit(prisma, {
    actorId: user.id,
    action: 'auth.register',
    entityType: 'User',
    entityId: user.id,
    ip: req.ip,
  });
  ok(res, await auth.issueSession(req, res, user), 201);
});

authRouter.post('/login', authLimiter, sameOrigin, async (req, res) => {
  const { email, password } = body(req, loginSchema);
  const user = await auth.login(email, password, req.ip);
  ok(res, await auth.issueSession(req, res, user));
});

authRouter.post('/refresh', sameOrigin, async (req, res) => {
  ok(res, await auth.rotate(req, res, refreshCookie(req)));
});

authRouter.post('/logout', sameOrigin, async (req, res) => {
  await auth.revoke(refreshCookie(req));
  auth.clearRefreshCookie(res);
  res.status(204).end();
});

authRouter.post('/logout-all', requireAuth, sameOrigin, async (req, res) => {
  await auth.revokeAll(currentUser(req).id);
  auth.clearRefreshCookie(res);
  res.status(204).end();
});

authRouter.post('/password-reset/request', authLimiter, async (req, res) => {
  const { email } = body(req, passwordResetRequestSchema);
  await auth.requestPasswordReset(email);
  ok(res, { message: "Agar bu email ro'yxatdan o'tgan bo'lsa, tiklash havolasi yuborildi." }, 202);
});

authRouter.post('/password-reset/confirm', authLimiter, async (req, res) => {
  const { token, password } = body(req, passwordResetConfirmSchema);
  await auth.confirmPasswordReset(token, password);
  ok(res, { message: 'Parol yangilandi. Endi tizimga kirishingiz mumkin.' });
});
