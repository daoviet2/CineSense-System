import { CookieOptions, Response } from 'express';
import { env } from '../config/env.js';

export const ACCESS_TOKEN_COOKIE_NAME = 'access_token';
export const ACCESS_TOKEN_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export function getCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.NODE_ENV === 'production',
    path: '/',
    maxAge: ACCESS_TOKEN_MAX_AGE_MS,
  };
}

/**
 * Sets the httpOnly access_token cookie on the response (Decision D1).
 */
export function setAccessTokenCookie(res: Response, token: string): void {
  res.cookie(ACCESS_TOKEN_COOKIE_NAME, token, getCookieOptions());
}

/**
 * Clears the access_token cookie from the response.
 */
export function clearAccessTokenCookie(res: Response): void {
  res.clearCookie(ACCESS_TOKEN_COOKIE_NAME, {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.NODE_ENV === 'production',
    path: '/',
  });
}
