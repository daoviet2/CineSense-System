import bcrypt from 'bcrypt';
import { BCRYPT_SALT_ROUNDS, MAX_PASSWORD_BYTES } from '../config/security.js';
import { AppError } from '../middlewares/errorHandler.js';

/**
 * Hashes a plaintext password using bcrypt with cost 12.
 * Rejects passwords exceeding 72 bytes to avoid silent truncation by bcrypt (Decision D2).
 */
export async function hashPassword(password: string): Promise<string> {
  const byteLength = Buffer.byteLength(password, 'utf8');
  if (byteLength > MAX_PASSWORD_BYTES) {
    throw new AppError(
      `Password must not exceed ${MAX_PASSWORD_BYTES} bytes`,
      400,
      'INVALID_PASSWORD_LENGTH'
    );
  }
  return bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
}

/**
 * Verifies a plaintext password against a bcrypt hash.
 * Returns false immediately if password exceeds 72 bytes.
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const byteLength = Buffer.byteLength(password, 'utf8');
  if (byteLength > MAX_PASSWORD_BYTES) {
    return false;
  }
  return bcrypt.compare(password, hash);
}
