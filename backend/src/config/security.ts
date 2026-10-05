export const BCRYPT_SALT_ROUNDS = 12;
export const MIN_PASSWORD_LENGTH = 8;
export const MAX_PASSWORD_BYTES = 72;
export const JWT_ALGORITHM = 'HS256' as const;

/**
 * Pre-computed bcrypt hash used as a dummy target when a login email is not found.
 * This ensures bcrypt.compare always runs, making response time identical for
 * "wrong email" and "wrong password" — preventing user enumeration (Decision D3).
 *
 * Generated once with cost 12: bcrypt.hashSync('__dummy__', 12)
 * Value intentionally hardcoded; it is not a real credential.
 */
export const DUMMY_HASH =
  '$2b$12$invalidusernameX.invalidpasswordhashXXXXXXXXXXXXXXXXXX';

// ---------------------------------------------------------------------------
// Rate limiting (Decision D10)
// Applied only to /auth/login and /auth/register.
// In-memory store — correct only for single-instance deployment.
// TODO (Phase 4): switch to Redis store for multi-instance correctness.
// ---------------------------------------------------------------------------

/** Window length in milliseconds for auth rate limiting (15 minutes). */
export const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;

/** Maximum requests per window for /auth/register. */
export const RATE_LIMIT_REGISTER_MAX = 10;

/** Maximum requests per window for /auth/login. */
export const RATE_LIMIT_LOGIN_MAX = 20;

/** Cookie name for the access token. */
export const ACCESS_TOKEN_COOKIE_NAME = 'access_token';
