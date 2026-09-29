import { env, envSchema } from '../../src/config/env.js';

describe('Environment configuration', () => {
  it('loads valid environment variables', () => {
    expect(env).toBeDefined();
    expect(typeof env.PORT).toBe('number');
    expect(env.DATABASE_URL).toBeDefined();
    expect(typeof env.DATABASE_URL).toBe('string');
    expect(env.JWT_SECRET).toBeDefined();
    expect(typeof env.JWT_SECRET).toBe('string');
    expect(env.JWT_SECRET.length).toBeGreaterThanOrEqual(32);
    expect(env.JWT_EXPIRES_IN).toBe('7d');
    expect(env.FRONTEND_ORIGIN).toBeDefined();
    expect(['development', 'production', 'test']).toContain(env.NODE_ENV);
  });

  describe('JWT_SECRET fail-fast validation', () => {
    const baseValidEnv = {
      NODE_ENV: 'test',
      PORT: '4000',
      DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
      JWT_SECRET: 'a'.repeat(32),
    };

    it('rejects JWT_SECRET shorter than 32 characters (fail-fast)', () => {
      const shortSecretEnv = {
        ...baseValidEnv,
        JWT_SECRET: 'short-secret-less-than-32-chars',
      };
      expect(shortSecretEnv.JWT_SECRET.length).toBeLessThan(32);

      const parsed = envSchema.safeParse(shortSecretEnv);
      expect(parsed.success).toBe(false);
      if (!parsed.success) {
        const secretError = parsed.error.issues.find((issue) => issue.path.includes('JWT_SECRET'));
        expect(secretError).toBeDefined();
        expect(secretError?.message).toContain('at least 32 characters long');
      }
    });

    it('accepts JWT_SECRET with exactly 32 characters', () => {
      const exact32SecretEnv = {
        ...baseValidEnv,
        JWT_SECRET: 'b'.repeat(32),
      };
      const parsed = envSchema.safeParse(exact32SecretEnv);
      expect(parsed.success).toBe(true);
    });
  });
});
