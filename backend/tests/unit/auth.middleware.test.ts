import cookieParser from 'cookie-parser';
import express, { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { errorHandler } from '../../src/middlewares/errorHandler.js';
import { requireAuth } from '../../src/middlewares/auth.middleware.js';
import { signAccessToken } from '../../src/utils/jwt.js';
import { ACCESS_TOKEN_COOKIE_NAME } from '../../src/utils/cookie.js';

// ---------------------------------------------------------------------------
// Test app factory — mounts requireAuth in front of a probe route
// ---------------------------------------------------------------------------

function buildApp(): express.Application {
  const app = express();
  app.use(cookieParser());

  // Protected probe route: returns the req.user attached by requireAuth
  app.get('/protected', requireAuth, (req: Request, res: Response) => {
    res.status(200).json({ user: req.user });
  });

  app.use(errorHandler);
  return app;
}

// ---------------------------------------------------------------------------
// requireAuth middleware unit tests
// ---------------------------------------------------------------------------

describe('requireAuth middleware', () => {
  const userId = 'test-user-uuid-1234';
  let app: express.Application;

  beforeEach(() => {
    app = buildApp();
  });

  // ── Happy path ────────────────────────────────────────────────────────────

  it('passes and attaches req.user.id when a valid access_token cookie is present', async () => {
    const token = signAccessToken(userId);

    const res = await request(app)
      .get('/protected')
      .set('Cookie', `${ACCESS_TOKEN_COOKIE_NAME}=${token}`);

    expect(res.status).toBe(200);
    expect(res.body.user).toEqual({ id: userId });
  });

  // ── Missing token ─────────────────────────────────────────────────────────

  it('returns 401 UNAUTHORIZED when no access_token cookie is present', async () => {
    const res = await request(app).get('/protected');

    expect(res.status).toBe(401);
    expect(res.body).toEqual({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
      },
    });
  });

  it('returns 401 UNAUTHORIZED when cookie header exists but access_token is absent', async () => {
    const res = await request(app)
      .get('/protected')
      .set('Cookie', 'other_cookie=somevalue');

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  // ── Expired token ─────────────────────────────────────────────────────────

  it('returns 401 TOKEN_EXPIRED when token has already expired', async () => {
    const expiredToken = signAccessToken(userId, '-1s');

    const res = await request(app)
      .get('/protected')
      .set('Cookie', `${ACCESS_TOKEN_COOKIE_NAME}=${expiredToken}`);

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('TOKEN_EXPIRED');
  });

  // ── Invalid token ─────────────────────────────────────────────────────────

  it('returns 401 INVALID_TOKEN when token is signed with a different secret', async () => {
    const rogueSecret = 'another-secret-key-that-is-32-chars-long!';
    const rogueToken = jwt.sign({ sub: userId }, rogueSecret, { algorithm: 'HS256' });

    const res = await request(app)
      .get('/protected')
      .set('Cookie', `${ACCESS_TOKEN_COOKIE_NAME}=${rogueToken}`);

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_TOKEN');
  });

  it('returns 401 INVALID_TOKEN when token has a tampered payload', async () => {
    const token = signAccessToken(userId);
    const parts = token.split('.');
    const tamperedPayload = Buffer.from(
      JSON.stringify({ sub: 'attacker-id' })
    ).toString('base64url');
    const tamperedToken = `${parts[0]}.${tamperedPayload}.${parts[2]}`;

    const res = await request(app)
      .get('/protected')
      .set('Cookie', `${ACCESS_TOKEN_COOKIE_NAME}=${tamperedToken}`);

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_TOKEN');
  });

  it('returns 401 INVALID_TOKEN when token uses alg: none', async () => {
    const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify({ sub: userId })).toString('base64url');
    const noneToken = `${header}.${payload}.`;

    const res = await request(app)
      .get('/protected')
      .set('Cookie', `${ACCESS_TOKEN_COOKIE_NAME}=${noneToken}`);

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_TOKEN');
  });

  it('returns 401 INVALID_TOKEN for a completely malformed token string', async () => {
    const res = await request(app)
      .get('/protected')
      .set('Cookie', `${ACCESS_TOKEN_COOKIE_NAME}=not.a.valid.jwt`);

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_TOKEN');
  });

  // ── Type augmentation verification ────────────────────────────────────────

  it('does NOT expose passwordHash or any other sensitive field on req.user', async () => {
    const token = signAccessToken(userId);

    const res = await request(app)
      .get('/protected')
      .set('Cookie', `${ACCESS_TOKEN_COOKIE_NAME}=${token}`);

    expect(res.status).toBe(200);
    expect(res.body.user.passwordHash).toBeUndefined();
    expect(res.body.user.password_hash).toBeUndefined();
    expect(res.body.user.email).toBeUndefined();
    // Only id is present
    expect(Object.keys(res.body.user)).toEqual(['id']);
  });
});
