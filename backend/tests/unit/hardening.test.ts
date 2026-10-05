/**
 * feat-015: Hardening tests
 *
 * Covers:
 *  - helmet security headers present on all responses
 *  - CORS: allowed origin receives credentials header; foreign origin blocked
 *  - Rate limit: POST /auth/register returns 429 after limit exhausted
 *  - Rate limit: POST /auth/login returns 429 after limit exhausted
 *  - Rate limit: GET /health is NOT rate-limited (public, no limiter)
 *  - Rate limit response matches D3 error envelope
 */

import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { Application, RequestHandler } from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import request from 'supertest';
import { errorHandler } from '../../src/middlewares/errorHandler.js';
import { createAuthRouter } from '../../src/modules/auth/auth.routes.js';
import { AuthController } from '../../src/modules/auth/auth.controller.js';
import { AuthService } from '../../src/modules/auth/auth.service.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a minimal app identical to createApp() but with injectable limiters. */
function buildHardenedApp(options: {
  origin: string;
  registerMax?: number;
  loginMax?: number;
}): Application {
  const { origin, registerMax = 100, loginMax = 100 } = options;

  const mockService = {
    register: jest.fn().mockResolvedValue({
      user: { id: 'u1', name: 'A', email: 'a@b.com', avatarUrl: null, createdAt: new Date() },
      accessToken: 'tok',
    }),
    login: jest.fn().mockResolvedValue({
      user: { id: 'u1', name: 'A', email: 'a@b.com', avatarUrl: null, createdAt: new Date() },
      accessToken: 'tok',
    }),
  } as unknown as jest.Mocked<AuthService>;

  const controller = new AuthController(mockService);

  const makeLimit = (max: number): RequestHandler =>
    rateLimit({
      windowMs: 60_000,
      max,
      standardHeaders: true,
      legacyHeaders: false,
      handler: (_req, res) => {
        res.status(429).json({
          error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many requests, please try again later.' },
        });
      },
    });

  const app = express();
  app.use(helmet());
  app.use(cors({ origin, credentials: true }));
  app.use(express.json());
  app.use(cookieParser());

  app.get('/health', (_req, res) => res.status(200).json({ status: 'ok' }));

  app.use(
    '/auth',
    createAuthRouter({
      controller,
      registerRateLimiter: makeLimit(registerMax),
      loginRateLimiter: makeLimit(loginMax),
    })
  );

  app.use(errorHandler);
  return app;
}

// ---------------------------------------------------------------------------
// Helmet headers
// ---------------------------------------------------------------------------

describe('feat-015: helmet security headers', () => {
  const app = buildHardenedApp({ origin: 'http://localhost:3000' });

  it('sets X-Content-Type-Options: nosniff', async () => {
    const res = await request(app).get('/health');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
  });

  it('sets X-Frame-Options', async () => {
    const res = await request(app).get('/health');
    // helmet sets DENY or SAMEORIGIN — just ensure the header is present
    expect(res.headers['x-frame-options']).toBeDefined();
  });

  it('sets X-DNS-Prefetch-Control', async () => {
    const res = await request(app).get('/health');
    expect(res.headers['x-dns-prefetch-control']).toBe('off');
  });
});

// ---------------------------------------------------------------------------
// CORS
// ---------------------------------------------------------------------------

describe('feat-015: CORS configuration (Decision D10)', () => {
  const ALLOWED_ORIGIN = 'http://localhost:3000';
  const app = buildHardenedApp({ origin: ALLOWED_ORIGIN });

  it('responds with correct Access-Control-Allow-Origin for allowed origin', async () => {
    const res = await request(app)
      .get('/health')
      .set('Origin', ALLOWED_ORIGIN);

    expect(res.headers['access-control-allow-origin']).toBe(ALLOWED_ORIGIN);
  });

  it('includes Access-Control-Allow-Credentials: true for allowed origin', async () => {
    const res = await request(app)
      .get('/health')
      .set('Origin', ALLOWED_ORIGIN);

    expect(res.headers['access-control-allow-credentials']).toBe('true');
  });

  it('does NOT reflect a foreign origin in Access-Control-Allow-Origin', async () => {
    const res = await request(app)
      .get('/health')
      .set('Origin', 'http://attacker.com');

    // cors() must NOT echo the attacker's origin back.
    // It may omit the header entirely, or keep the allowed origin — but must never
    // return the foreign origin, which would enable credential-bearing cross-site requests.
    const acao = res.headers['access-control-allow-origin'];
    expect(acao).not.toBe('http://attacker.com');
  });
});

// ---------------------------------------------------------------------------
// Rate limiter — POST /auth/register (Decision D10)
// ---------------------------------------------------------------------------

describe('feat-015: rate limit on POST /auth/register', () => {
  it('returns 429 RATE_LIMIT_EXCEEDED after exceeding the limit', async () => {
    // Set max=1 so the 2nd request is rate-limited
    const app = buildHardenedApp({ origin: 'http://localhost:3000', registerMax: 1 });

    const payload = { name: 'Test', email: 'test@example.com', password: 'password123' };

    // First request should succeed (201)
    const first = await request(app).post('/auth/register').send(payload);
    expect(first.status).toBe(201);

    // Second request must be rate-limited (429)
    const second = await request(app).post('/auth/register').send(payload);
    expect(second.status).toBe(429);
    expect(second.body).toEqual({
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests, please try again later.',
      },
    });
  });

  it('rate limit response includes RateLimit-* standard headers', async () => {
    const app = buildHardenedApp({ origin: 'http://localhost:3000', registerMax: 1 });
    const payload = { name: 'Test', email: 'test@example.com', password: 'password123' };

    // exhaust the limit
    await request(app).post('/auth/register').send(payload);
    const res = await request(app).post('/auth/register').send(payload);

    expect(res.status).toBe(429);
    // Standard rate-limit headers should be present
    expect(res.headers['ratelimit-limit'] ?? res.headers['x-ratelimit-limit']).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// Rate limiter — POST /auth/login (Decision D10)
// ---------------------------------------------------------------------------

describe('feat-015: rate limit on POST /auth/login', () => {
  it('returns 429 RATE_LIMIT_EXCEEDED after exceeding the login limit', async () => {
    const app = buildHardenedApp({ origin: 'http://localhost:3000', loginMax: 1 });

    const payload = { email: 'test@example.com', password: 'password123' };

    const first = await request(app).post('/auth/login').send(payload);
    expect(first.status).toBe(200);

    const second = await request(app).post('/auth/login').send(payload);
    expect(second.status).toBe(429);
    expect(second.body.error.code).toBe('RATE_LIMIT_EXCEEDED');
  });
});

// ---------------------------------------------------------------------------
// Health check is NOT rate-limited
// ---------------------------------------------------------------------------

describe('feat-015: /health is not rate-limited', () => {
  it('always returns 200 regardless of request count', async () => {
    // registerMax=1, loginMax=1 — only auth routes are limited
    const app = buildHardenedApp({
      origin: 'http://localhost:3000',
      registerMax: 1,
      loginMax: 1,
    });

    for (let i = 0; i < 5; i++) {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
    }
  });
});
