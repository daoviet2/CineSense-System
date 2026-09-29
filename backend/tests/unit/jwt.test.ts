import jwt from 'jsonwebtoken';
import { signAccessToken, verifyAccessToken } from '../../src/utils/jwt.js';
import { AppError } from '../../src/middlewares/errorHandler.js';

describe('jwt.ts access token utilities', () => {
  const userId = '123e4567-e89b-12d3-a456-426614174000';

  it('signs and verifies an access token successfully', () => {
    const token = signAccessToken(userId);
    expect(typeof token).toBe('string');

    const decoded = verifyAccessToken(token);
    expect(decoded.sub).toBe(userId);
    expect(decoded.iat).toBeDefined();
    expect(decoded.exp).toBeDefined();
  });

  it('rejects an expired token with AppError 401 TOKEN_EXPIRED', () => {
    // Generate an already expired token
    const expiredToken = signAccessToken(userId, '-1s');

    expect(() => verifyAccessToken(expiredToken)).toThrow(AppError);
    try {
      verifyAccessToken(expiredToken);
    } catch (err) {
      const appErr = err as AppError;
      expect(appErr.statusCode).toBe(401);
      expect(appErr.code).toBe('TOKEN_EXPIRED');
    }
  });

  it('rejects a token signed with a different secret with AppError 401 INVALID_TOKEN', () => {
    const rogueSecret = 'this-is-another-secret-key-32-chars-long!';
    const rogueToken = jwt.sign({ sub: userId }, rogueSecret, { algorithm: 'HS256' });

    expect(() => verifyAccessToken(rogueToken)).toThrow(AppError);
    try {
      verifyAccessToken(rogueToken);
    } catch (err) {
      const appErr = err as AppError;
      expect(appErr.statusCode).toBe(401);
      expect(appErr.code).toBe('INVALID_TOKEN');
    }
  });

  it('rejects an unsigned / alg: none token with AppError 401 INVALID_TOKEN', () => {
    // Header with alg: "none"
    const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify({ sub: userId })).toString('base64url');
    const noneToken = `${header}.${payload}.`;

    expect(() => verifyAccessToken(noneToken)).toThrow(AppError);
    try {
      verifyAccessToken(noneToken);
    } catch (err) {
      const appErr = err as AppError;
      expect(appErr.statusCode).toBe(401);
      expect(appErr.code).toBe('INVALID_TOKEN');
    }
  });

  it('rejects a tampered payload or signature with AppError 401 INVALID_TOKEN', () => {
    const validToken = signAccessToken(userId);
    const parts = validToken.split('.');
    // Tamper with the payload part
    const tamperedPayload = Buffer.from(JSON.stringify({ sub: 'attacker-id' })).toString('base64url');
    const tamperedToken = `${parts[0]}.${tamperedPayload}.${parts[2]}`;

    expect(() => verifyAccessToken(tamperedToken)).toThrow(AppError);
    try {
      verifyAccessToken(tamperedToken);
    } catch (err) {
      const appErr = err as AppError;
      expect(appErr.statusCode).toBe(401);
      expect(appErr.code).toBe('INVALID_TOKEN');
    }
  });

  it('rejects a completely malformed token string', () => {
    expect(() => verifyAccessToken('not.a.valid.jwt.string')).toThrow(AppError);
    try {
      verifyAccessToken('not.a.valid.jwt.string');
    } catch (err) {
      const appErr = err as AppError;
      expect(appErr.statusCode).toBe(401);
      expect(appErr.code).toBe('INVALID_TOKEN');
    }
  });
});
