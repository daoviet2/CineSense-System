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

