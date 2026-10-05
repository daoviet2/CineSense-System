import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { Application, Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import { env } from './config/env.js';
import { AppError, errorHandler } from './middlewares/errorHandler.js';
import {
  loginRateLimiter,
  registerRateLimiter,
} from './middlewares/rateLimiter.js';
import { createAuthRouter } from './modules/auth/auth.routes.js';
import { createUserRouter } from './modules/user/user.routes.js';

export function createApp(): Application {
  const app = express();

  // ── Security headers (Decision D10) ──────────────────────────────────────
  // helmet sets X-Content-Type-Options, X-Frame-Options, HSTS, etc.
  app.use(helmet());

  // ── CORS (Decision D10) ───────────────────────────────────────────────────
  // Allow requests only from FRONTEND_ORIGIN; credentials required for
  // httpOnly cookie transport. Never use '*' with credentials.
  app.use(
    cors({
      origin: env.FRONTEND_ORIGIN,
      credentials: true,
    })
  );

  // ── Body / cookie parsing ─────────────────────────────────────────────────
  app.use(express.json());
  app.use(cookieParser());

  // ── Health check (public, no rate limit) ─────────────────────────────────
  app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({ status: 'ok' });
  });

  // ── Auth routes with per-route rate limiters (Decision D10) ──────────────
  // Rate limiters are mounted only on the two auth mutation endpoints.
  // /auth/logout has no limiter (stateless, cheap, idempotent).
  app.use('/auth', createAuthRouter({ loginRateLimiter, registerRateLimiter }));

  // ── User profile routes (feat-016, Decision D5) ───────────────────────────
  // All /users routes require authentication (requireAuth applied per-route).
  app.use('/users', createUserRouter());

  // ── 404 handler ───────────────────────────────────────────────────────────
  app.use((_req: Request, _res: Response, next: NextFunction) => {
    next(new AppError('Resource not found', 404, 'NOT_FOUND'));
  });

  app.use(errorHandler);

  return app;
}
