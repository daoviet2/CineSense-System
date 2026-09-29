import jwt, { SignOptions } from 'jsonwebtoken';
import { env } from '../config/env.js';
import { JWT_ALGORITHM } from '../config/security.js';
import { AppError } from '../middlewares/errorHandler.js';

export interface AccessTokenPayload {
  sub: string;
  iat?: number;
  exp?: number;
  [key: string]: unknown;
}

/**
 * Signs an access token for a user with algorithm HS256 and payload { sub: userId } (Decision D1).
 */
export function signAccessToken(
  userId: string,
  expiresIn: string | number = env.JWT_EXPIRES_IN
): string {
  const options: SignOptions = {
    algorithm: JWT_ALGORITHM,
    expiresIn: expiresIn as SignOptions['expiresIn'],
  };

  return jwt.sign({ sub: userId }, env.JWT_SECRET, options);
}

/**
 * Verifies an access token strictly enforcing HS256 algorithm (Decision D1).
 * Rejects expired tokens, invalid signatures, malformed tokens, and alg: none.
 */
export function verifyAccessToken(token: string): AccessTokenPayload {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET, {
      algorithms: [JWT_ALGORITHM],
    });

    if (typeof decoded !== 'object' || decoded === null || !('sub' in decoded)) {
      throw new AppError('Invalid token payload', 401, 'INVALID_TOKEN');
    }

    return decoded as AccessTokenPayload;
  } catch (err: unknown) {
    if (err instanceof AppError) {
      throw err;
    }
    if (err instanceof jwt.TokenExpiredError) {
      throw new AppError('Token has expired', 401, 'TOKEN_EXPIRED');
    }
    if (err instanceof jwt.JsonWebTokenError) {
      throw new AppError('Invalid token', 401, 'INVALID_TOKEN');
    }
    throw new AppError('Authentication failed', 401, 'UNAUTHORIZED');
  }
}
