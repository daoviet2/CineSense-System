import { NextFunction, Request, Response } from 'express';
import { AppError } from './errorHandler.js';
import { ACCESS_TOKEN_COOKIE_NAME } from '../utils/cookie.js';
import { verifyAccessToken } from '../utils/jwt.js';

/**
 * requireAuth middleware (Decision D14 / feat-014).
 *
 * Reads the httpOnly access_token cookie set by login/register,
 * verifies the JWT signature with algorithm HS256 (pinned),
 * and attaches `req.user = { id }` for downstream route handlers.
 *
 * Security properties:
 * - Never queries the database — stateless, fast (Decision D1).
 * - On missing token  → 401 UNAUTHORIZED
 * - On expired token  → 401 TOKEN_EXPIRED   (from verifyAccessToken)
 * - On invalid token  → 401 INVALID_TOKEN   (from verifyAccessToken)
 * - Error always forwarded to errorHandler via next(err) — format D3.
 */
export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const token: string | undefined = req.cookies?.[ACCESS_TOKEN_COOKIE_NAME];

  if (!token) {
    return next(new AppError('Authentication required', 401, 'UNAUTHORIZED'));
  }

  try {
    const payload = verifyAccessToken(token);

    // Attach minimal identity — only userId from sub claim (Decision D1).
    req.user = { id: String(payload.sub) };

    next();
  } catch (err) {
    // verifyAccessToken throws AppError with appropriate codes:
    // TOKEN_EXPIRED | INVALID_TOKEN | UNAUTHORIZED — pass through.
    next(err);
  }
}
