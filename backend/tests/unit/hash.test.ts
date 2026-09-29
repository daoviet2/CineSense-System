import { hashPassword, verifyPassword } from '../../src/utils/hash.js';
import { AppError } from '../../src/middlewares/errorHandler.js';

describe('hash.ts password hashing utilities', () => {
  const samplePassword = 'my-secure-password-123';

  it('produces different hash outputs for the same password due to random salt', async () => {
    const hash1 = await hashPassword(samplePassword);
    const hash2 = await hashPassword(samplePassword);

    expect(hash1).not.toBe(hash2);
    expect(hash1).toMatch(/^\$2[aby]\$12\$/); // bcrypt cost 12 prefix
    expect(hash2).toMatch(/^\$2[aby]\$12\$/);
  });

  it('verifies correct password against hash successfully', async () => {
    const hash = await hashPassword(samplePassword);
    const isValid = await verifyPassword(samplePassword, hash);
    expect(isValid).toBe(true);
  });

  it('fails verification for incorrect password', async () => {
    const hash = await hashPassword(samplePassword);
    const isValid = await verifyPassword('wrong-password', hash);
    expect(isValid).toBe(false);
  });

  it('rejects passwords exceeding 72 bytes with AppError 400', async () => {
    // 73 ASCII characters = 73 bytes
    const longPassword = 'a'.repeat(73);
    await expect(hashPassword(longPassword)).rejects.toThrow(AppError);
    await expect(hashPassword(longPassword)).rejects.toMatchObject({
      statusCode: 400,
      code: 'INVALID_PASSWORD_LENGTH',
    });
  });

  it('handles multi-byte UTF-8 characters exceeding 72 bytes correctly', async () => {
    // '🚀' is 4 bytes in UTF-8. 19 emojis = 76 bytes > 72 bytes
    const multiByteLong = '🚀'.repeat(19);
    expect(Buffer.byteLength(multiByteLong, 'utf8')).toBe(76);

    await expect(hashPassword(multiByteLong)).rejects.toThrow(AppError);
    await expect(hashPassword(multiByteLong)).rejects.toMatchObject({
      statusCode: 400,
      code: 'INVALID_PASSWORD_LENGTH',
    });
  });

  it('allows passwords with exactly 72 bytes', async () => {
    const exact72Password = 'b'.repeat(72);
    expect(Buffer.byteLength(exact72Password, 'utf8')).toBe(72);

    const hash = await hashPassword(exact72Password);
    expect(hash).toBeDefined();
    const isValid = await verifyPassword(exact72Password, hash);
    expect(isValid).toBe(true);
  });

  it('verifyPassword returns false when given password > 72 bytes', async () => {
    const hash = await hashPassword(samplePassword);
    const longPassword = 'c'.repeat(73);
    const isValid = await verifyPassword(longPassword, hash);
    expect(isValid).toBe(false);
  });
});
