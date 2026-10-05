import rateLimit, { RateLimitRequestHandler } from 'express-rate-limit';
import {
  RATE_LIMIT_LOGIN_MAX,
  RATE_LIMIT_REGISTER_MAX,
  RATE_LIMIT_WINDOW_MS,
} from '../config/security.js';

/**
 * Shared rate-limit message factory that returns the standard D3 error envelope.
 * Using a function avoids a stale object reference across requests.
 */
function makeHandler(max: number): RateLimitRequestHandler {
  return rateLimit({
    windowMs: RATE_LIMIT_WINDOW_MS,
    max,
    standardHeaders: true,  // Return rate limit info in `RateLimit-*` headers
    legacyHeaders: false,    // Disable `X-RateLimit-*` legacy headers
    // NOTE: in-memory store — single-instance only.
    // Phase 4: replace with RedisStore for multi-instance correctness (D10).
    handler: (_req, res) => {
      res.status(429).json({
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests, please try again later.',
        },
      });
    },
  });
}

/**
 * Rate limiter for POST /auth/register.
 * Limit: RATE_LIMIT_REGISTER_MAX requests per RATE_LIMIT_WINDOW_MS.
 */
export const registerRateLimiter: RateLimitRequestHandler =
  makeHandler(RATE_LIMIT_REGISTER_MAX);

/**
 * Rate limiter for POST /auth/login.
 * Limit: RATE_LIMIT_LOGIN_MAX requests per RATE_LIMIT_WINDOW_MS.
 */
export const loginRateLimiter: RateLimitRequestHandler =
  makeHandler(RATE_LIMIT_LOGIN_MAX);
