import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';

export interface AccessClaims {
  sub: string;
  /** Unix seconds of the last password change; tokens issued before it are rejected. */
  pwd: number;
}

export function signAccessToken(userId: string, passwordChangedAt: Date | null) {
  const expiresAt = new Date(Date.now() + env.ACCESS_TOKEN_TTL_SECONDS * 1000);
  const claims: AccessClaims = {
    sub: userId,
    pwd: passwordChangedAt ? Math.floor(passwordChangedAt.getTime() / 1000) : 0,
  };
  const token = jwt.sign(claims, env.JWT_ACCESS_SECRET, {
    algorithm: 'HS256',
    expiresIn: env.ACCESS_TOKEN_TTL_SECONDS,
    issuer: 'avlod',
    audience: 'avlod-web',
  });
  return { token, expiresAt };
}

export function verifyAccessToken(token: string): AccessClaims | null {
  try {
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET, {
      algorithms: ['HS256'],
      issuer: 'avlod',
      audience: 'avlod-web',
    });
    if (typeof decoded === 'string' || typeof decoded.sub !== 'string') return null;
    return { sub: decoded.sub, pwd: typeof decoded.pwd === 'number' ? decoded.pwd : 0 };
  } catch {
    return null;
  }
}

/** Opaque random token (sent to the client) and its SHA-256 hash (stored). */
export function randomToken(bytes = 32) {
  const token = crypto.randomBytes(bytes).toString('base64url');
  return { token, hash: hashToken(token) };
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}
