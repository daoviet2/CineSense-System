/**
 * feat-017: backend integration tests for the auth/profile flow.
 * Uses a dedicated Postgres database (DATABASE_URL_TEST). The development DB is never targeted.
 */

import request from 'supertest';
import { createApp } from '../../src/app.js';
import { RATE_LIMIT_REGISTER_MAX } from '../../src/config/security.js';
import { prisma } from '../../src/config/db.js';
import { ACCESS_TOKEN_COOKIE_NAME, ACCESS_TOKEN_MAX_AGE_MS } from '../../src/utils/cookie.js';

const PASSWORD = 'password12';
const ACCESS_TOKEN_MAX_AGE_SEC = ACCESS_TOKEN_MAX_AGE_MS / 1000;

function setCookieLines(res: request.Response): string[] {
  const raw = res.headers['set-cookie'];
  if (!raw) return [];
  return Array.isArray(raw) ? raw : [String(raw)];
}

function accessTokenCookie(res: request.Response): string {
  const line = setCookieLines(res).find((item) => item.startsWith(`${ACCESS_TOKEN_COOKIE_NAME}=`));
  if (!line) {
    throw new Error('Set-Cookie header for access_token was missing');
  }
  return line;
}

function assertPublicUserShape(user: Record<string, unknown>): void {
  expect(user).toEqual(
    expect.objectContaining({
      id: expect.any(String),
      name: expect.any(String),
      email: expect.any(String),
      createdAt: expect.any(String),
    })
  );
  expect(user).toHaveProperty('avatarUrl');
}

function assertNoPasswordLeak(payload: unknown): void {
  const serialized = JSON.stringify(payload);
  expect(serialized).not.toMatch(/password_hash/i);
  expect(serialized).not.toMatch(/passwordHash/);
}

function assertAccessTokenCookieFlags(cookie: string): void {
  expect(cookie).toMatch(new RegExp(`${ACCESS_TOKEN_COOKIE_NAME}=[^;]+`));
  expect(cookie).toMatch(/HttpOnly/i);
  expect(cookie).toMatch(/Path=\//i);
  expect(cookie).toMatch(/SameSite=Lax/i);
  expect(cookie).toMatch(new RegExp(`Max-Age=${ACCESS_TOKEN_MAX_AGE_SEC}`, 'i'));
  expect(cookie).not.toMatch(/Secure/i);
}

describe('auth integration', () => {
  const app = createApp();

  it('runs register → me → patch → logout → me(401) → login, without leaking password hashes', async () => {
    const agent = request.agent(app);
    const email = 'flow.user@example.com';

    const registerRes = await agent.post('/auth/register').send({
      name: 'Flow User',
      email,
      password: PASSWORD,
    });

    expect(registerRes.status).toBe(201);
    assertPublicUserShape(registerRes.body.user);
    expect(registerRes.body.user.email).toBe(email);
    expect(registerRes.body.user.name).toBe('Flow User');
    assertNoPasswordLeak(registerRes.body);
    assertAccessTokenCookieFlags(accessTokenCookie(registerRes));

    const stored = await prisma.user.findUnique({
      where: { email },
      select: { passwordHash: true },
    });
    expect(stored?.passwordHash.startsWith('$2b$12$')).toBe(true);

    const profileCount = await prisma.userProfile.count();
    expect(profileCount).toBe(0);

    const meRes = await agent.get('/users/me');
    expect(meRes.status).toBe(200);
    expect(meRes.body.user.email).toBe(email);
    assertNoPasswordLeak(meRes.body);

    const patchRes = await agent.patch('/users/me').send({
      name: 'Updated Name',
      avatarUrl: 'https://cdn.example.com/avatar.png',
    });
    expect(patchRes.status).toBe(200);
    expect(patchRes.body.user.name).toBe('Updated Name');
    expect(patchRes.body.user.avatarUrl).toBe('https://cdn.example.com/avatar.png');
    assertNoPasswordLeak(patchRes.body);

    const logoutRes = await agent.post('/auth/logout');
    expect(logoutRes.status).toBe(204);
    const cleared = accessTokenCookie(logoutRes);
    expect(cleared).toMatch(new RegExp(`${ACCESS_TOKEN_COOKIE_NAME}=;`));
    expect(cleared).toMatch(/HttpOnly/i);

    const meAfterLogout = await agent.get('/users/me');
    expect(meAfterLogout.status).toBe(401);
    expect(meAfterLogout.body.error.code).toMatch(/UNAUTHORIZED|TOKEN_EXPIRED|INVALID_TOKEN/);
    assertNoPasswordLeak(meAfterLogout.body);

    const loginRes = await agent.post('/auth/login').send({ email, password: PASSWORD });
    expect(loginRes.status).toBe(200);
    expect(loginRes.body.user.name).toBe('Updated Name');
    assertNoPasswordLeak(loginRes.body);
    assertAccessTokenCookieFlags(accessTokenCookie(loginRes));

    const meAfterLogin = await agent.get('/users/me');
    expect(meAfterLogin.status).toBe(200);
    expect(meAfterLogin.body.user.name).toBe('Updated Name');
    assertNoPasswordLeak(meAfterLogin.body);
  });

  it('returns 409 EMAIL_ALREADY_EXISTS for a duplicate email regardless of case', async () => {
    const payload = { name: 'Ada', email: 'ada@example.com', password: PASSWORD };
    const first = await request(app).post('/auth/register').send(payload);
    expect(first.status).toBe(201);

    const duplicate = await request(app).post('/auth/register').send({
      ...payload,
      email: '  ADA@Example.COM  ',
    });
    expect(duplicate.status).toBe(409);
    expect(duplicate.body.error.code).toBe('EMAIL_ALREADY_EXISTS');
    assertNoPasswordLeak(duplicate.body);
  });

  it('returns 400 VALIDATION_ERROR for invalid register payloads', async () => {
    const res = await request(app).post('/auth/register').send({
      name: '',
      email: 'not-an-email',
      password: 'short',
    });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    assertNoPasswordLeak(res.body);
  });

  it('returns 401 for GET and PATCH /users/me without a session cookie', async () => {
    const getRes = await request(app).get('/users/me');
    expect(getRes.status).toBe(401);
    expect(getRes.body.error.code).toBe('UNAUTHORIZED');

    const patchRes = await request(app).patch('/users/me').send({ name: 'Nope' });
    expect(patchRes.status).toBe(401);
    expect(patchRes.body.error.code).toBe('UNAUTHORIZED');
  });

  it('rejects PATCH /users/me with a non-http(s) avatar and with an empty body', async () => {
    const agent = request.agent(app);
    await agent.post('/auth/register').send({
      name: 'Patch User',
      email: 'patch.user@example.com',
      password: PASSWORD,
    });

    const ftpAvatar = await agent.patch('/users/me').send({ avatarUrl: 'ftp://files.example.com/a.png' });
    expect(ftpAvatar.status).toBe(400);
    expect(ftpAvatar.body.error.code).toBe('VALIDATION_ERROR');

    const emptyBody = await agent.patch('/users/me').send({});
    expect(emptyBody.status).toBe(400);
    expect(emptyBody.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 409 when PATCH /users/me tries to take another user email', async () => {
    await request(app).post('/auth/register').send({
      name: 'Taken',
      email: 'taken@example.com',
      password: PASSWORD,
    });

    const agent = request.agent(app);
    await agent.post('/auth/register').send({
      name: 'Other',
      email: 'other@example.com',
      password: PASSWORD,
    });

    const res = await agent.patch('/users/me').send({ email: 'taken@example.com' });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('EMAIL_ALREADY_EXISTS');
    assertNoPasswordLeak(res.body);
  });

  it('returns 429 RATE_LIMIT_EXCEEDED after register threshold is exceeded', async () => {
    const isolatedApp = createApp();
    const invalidBody = { name: '', email: 'bad', password: 'x' };

    for (let i = 0; i < RATE_LIMIT_REGISTER_MAX; i += 1) {
      const res = await request(isolatedApp).post('/auth/register').send(invalidBody);
      expect(res.status).toBe(400);
    }

    const limited = await request(isolatedApp).post('/auth/register').send(invalidBody);
    expect(limited.status).toBe(429);
    expect(limited.body.error).toEqual({
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests, please try again later.',
    });
    assertNoPasswordLeak(limited.body);
  });
});
