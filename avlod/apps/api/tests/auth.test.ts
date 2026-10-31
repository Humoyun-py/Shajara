import { describe, expect, it } from 'vitest';
import { api, registerUser } from './helpers';
import { sentMail } from '../src/lib/mailer';

describe('authentication', () => {
  it('registers, rejects duplicates and weak passwords', async () => {
    const u = await registerUser('reg');
    const dup = await api()
      .post('/api/v1/auth/register')
      .send({ email: u.email, password: 'AnotherPass123', displayName: 'X Y' });
    expect(dup.status).toBe(409);
    const weak = await api()
      .post('/api/v1/auth/register')
      .send({ email: 'weak@example.test', password: 'short', displayName: 'Weak' });
    expect(weak.status).toBe(400);
    expect(weak.body.error.code).toBe('INVALID_BODY');
  });

  it('sets the refresh token as an HttpOnly, SameSite=Strict cookie scoped to /api/v1/auth', async () => {
    const res = await api()
      .post('/api/v1/auth/register')
      .send({
        email: `ck-${Date.now()}@example.test`,
        password: 'CookiePass123',
        displayName: 'Cookie',
      });
    const cookie = [res.headers['set-cookie']].flat()[0] as string;
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Strict/i);
    expect(cookie).toMatch(/Path=\/api\/v1\/auth/);
    expect(res.body.data).not.toHaveProperty('refreshToken');
  });

  it('logs in with valid credentials and returns a generic error otherwise', async () => {
    const u = await registerUser('login');
    const good = await api()
      .post('/api/v1/auth/login')
      .send({ email: u.email, password: registerUser.password });
    expect(good.status).toBe(200);
    expect(good.body.data.accessToken).toBeTypeOf('string');
    const bad = await api()
      .post('/api/v1/auth/login')
      .send({ email: u.email, password: 'wrong-password-1' });
    const unknown = await api()
      .post('/api/v1/auth/login')
      .send({ email: 'nobody@example.test', password: 'whatever123' });
    expect(bad.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(bad.body.error.message).toBe(unknown.body.error.message);
  });

  it('locks the account after repeated failures', async () => {
    const u = await registerUser('lock');
    for (let i = 0; i < 5; i++) {
      await api()
        .post('/api/v1/auth/login')
        .send({ email: u.email, password: `bad-password-${i}` });
    }
    const locked = await api()
      .post('/api/v1/auth/login')
      .send({ email: u.email, password: registerUser.password });
    expect(locked.status).toBe(429);
  });

  it('requires a valid access token for protected routes', async () => {
    expect((await api().get('/api/v1/users/me')).status).toBe(401);
    expect(
      (await api().get('/api/v1/users/me').set('Authorization', 'Bearer not-a-token')).status,
    ).toBe(401);
    const u = await registerUser('me');
    const me = await api().get('/api/v1/users/me').set(u.auth);
    expect(me.status).toBe(200);
    expect(me.body.data.email).toBe(u.email);
    expect(me.body.data).not.toHaveProperty('passwordHash');
  });

  it('rotates refresh tokens and revokes all sessions when an old token is reused', async () => {
    const u = await registerUser('rotate');
    const first = await api().post('/api/v1/auth/refresh').set('Cookie', u.cookie);
    expect(first.status).toBe(200);
    const newCookie = ([first.headers['set-cookie']].flat()[0] as string).split(';')[0]!;
    expect(newCookie).not.toBe(u.cookie);

    const reuse = await api().post('/api/v1/auth/refresh').set('Cookie', u.cookie);
    expect(reuse.status).toBe(401);
    // Reuse detection revoked the legitimate successor too.
    const after = await api().post('/api/v1/auth/refresh').set('Cookie', newCookie);
    expect(after.status).toBe(401);
  });

  it('rejects cookie endpoints from foreign origins', async () => {
    const u = await registerUser('csrf');
    const res = await api()
      .post('/api/v1/auth/refresh')
      .set('Cookie', u.cookie)
      .set('Origin', 'https://evil.example');
    expect(res.status).toBe(403);
  });

  it('logs out by revoking the refresh session', async () => {
    const u = await registerUser('logout');
    expect((await api().post('/api/v1/auth/logout').set('Cookie', u.cookie)).status).toBe(204);
    expect((await api().post('/api/v1/auth/refresh').set('Cookie', u.cookie)).status).toBe(401);
  });

  it('resets a password with a single-use emailed token', async () => {
    const u = await registerUser('reset');
    const req1 = await api().post('/api/v1/auth/password-reset/request').send({ email: u.email });
    expect(req1.status).toBe(202);
    const unknown = await api()
      .post('/api/v1/auth/password-reset/request')
      .send({ email: 'ghost@example.test' });
    expect(unknown.status).toBe(202);
    const mail = sentMail.filter((m) => m.to === u.email).at(-1)!;
    const token = decodeURIComponent(mail.text.match(/token=([^\s]+)/)![1]!);

    const confirm = await api()
      .post('/api/v1/auth/password-reset/confirm')
      .send({ token, password: 'BrandNewPass99' });
    expect(confirm.status).toBe(200);
    const again = await api()
      .post('/api/v1/auth/password-reset/confirm')
      .send({ token, password: 'OtherNewPass99' });
    expect(again.status).toBe(400);
    // Old sessions are revoked, old access token rejected, new password works.
    expect((await api().post('/api/v1/auth/refresh').set('Cookie', u.cookie)).status).toBe(401);
    expect((await api().get('/api/v1/users/me').set(u.auth)).status).toBe(401);
    const login = await api()
      .post('/api/v1/auth/login')
      .send({ email: u.email, password: 'BrandNewPass99' });
    expect(login.status).toBe(200);
  });
});

describe('system', () => {
  it('reports health and serves OpenAPI', async () => {
    const h = await api().get('/api/v1/health');
    expect(h.status).toBe(200);
    expect(h.body.data.database).toBe('up');
    const doc = await api().get('/api/openapi.json');
    expect(doc.body.openapi).toBe('3.1.0');
    expect(Object.keys(doc.body.paths).length).toBeGreaterThan(40);
  });

  it('returns JSON 404 without leaking internals', async () => {
    const r = await api().get('/api/v1/does-not-exist');
    expect(r.status).toBe(404);
    expect(r.body.error.code).toBe('NOT_FOUND');
    expect(JSON.stringify(r.body)).not.toMatch(/stack|at .*\.ts/);
  });
});
