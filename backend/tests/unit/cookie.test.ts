import { Response } from 'express';
import {
  ACCESS_TOKEN_COOKIE_NAME,
  ACCESS_TOKEN_MAX_AGE_MS,
  clearAccessTokenCookie,
  getCookieOptions,
  setAccessTokenCookie,
} from '../../src/utils/cookie.js';

describe('cookie.ts helper utilities', () => {
  it('returns valid cookie options adhering to Decision D1', () => {
    const options = getCookieOptions();
    expect(options.httpOnly).toBe(true);
    expect(options.sameSite).toBe('lax');
    expect(options.path).toBe('/');
    expect(options.maxAge).toBe(ACCESS_TOKEN_MAX_AGE_MS);
    expect(typeof options.secure).toBe('boolean');
  });

  it('sets access_token cookie on the response', () => {
    const mockRes = {
      cookie: jest.fn(),
    } as unknown as Response;

    setAccessTokenCookie(mockRes, 'test-access-token');

    expect(mockRes.cookie).toHaveBeenCalledWith(
      ACCESS_TOKEN_COOKIE_NAME,
      'test-access-token',
      expect.objectContaining({
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
      })
    );
  });

  it('clears access_token cookie on the response', () => {
    const mockRes = {
      clearCookie: jest.fn(),
    } as unknown as Response;

    clearAccessTokenCookie(mockRes);

    expect(mockRes.clearCookie).toHaveBeenCalledWith(
      ACCESS_TOKEN_COOKIE_NAME,
      expect.objectContaining({
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
      })
    );
  });
});
