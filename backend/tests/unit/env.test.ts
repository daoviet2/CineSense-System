import { env, envSchema } from '../../src/config/env.js';

const baseValidEnv = {
  NODE_ENV: 'test',
  PORT: '4000',
  DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
  JWT_SECRET: 'a'.repeat(32),
  TMDB_API_KEY: 'test-tmdb-api-key',
};

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
    expect(env.TMDB_API_KEY).toBe('test-tmdb-api-key');
    expect(env.TMDB_BASE_URL).toBe('https://api.themoviedb.org/3');
    expect(env.TMDB_IMAGE_BASE_URL).toBe('https://image.tmdb.org/t/p');
    expect(env.TMDB_LANGUAGE).toBe('vi-VN');
    expect(env.TMDB_TIMEOUT_MS).toBe(5000);
    expect(env.FRONTEND_ORIGIN).toBeDefined();
    expect(['development', 'production', 'test']).toContain(env.NODE_ENV);
  });

  describe('JWT_SECRET fail-fast validation', () => {
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

  describe('TMDB configuration validation', () => {
    it('requires a non-empty TMDB_API_KEY', () => {
      const missingKeyEnv = Object.fromEntries(
        Object.entries(baseValidEnv).filter(([key]) => key !== 'TMDB_API_KEY')
      );

      const parsed = envSchema.safeParse(missingKeyEnv);
      expect(parsed.success).toBe(false);
      if (!parsed.success) {
        expect(parsed.error.issues.some((issue) => issue.path.includes('TMDB_API_KEY'))).toBe(true);
      }

      expect(envSchema.safeParse({ ...baseValidEnv, TMDB_API_KEY: '   ' }).success).toBe(false);
    });

    it('provides the approved defaults and coerces timeout strings to integers', () => {
      const parsed = envSchema.safeParse(baseValidEnv);
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.TMDB_BASE_URL).toBe('https://api.themoviedb.org/3');
        expect(parsed.data.TMDB_IMAGE_BASE_URL).toBe('https://image.tmdb.org/t/p');
        expect(parsed.data.TMDB_LANGUAGE).toBe('vi-VN');
        expect(parsed.data.TMDB_TIMEOUT_MS).toBe(5000);
      }

      const customTimeout = envSchema.safeParse({ ...baseValidEnv, TMDB_TIMEOUT_MS: '2500' });
      expect(customTimeout.success).toBe(true);
      if (customTimeout.success) {
        expect(customTimeout.data.TMDB_TIMEOUT_MS).toBe(2500);
      }
    });

    it('rejects invalid TMDB URLs and non-positive or non-integer timeouts', () => {
      for (const timeout of ['0', '-1', '1.5', 'not-a-number']) {
        expect(envSchema.safeParse({ ...baseValidEnv, TMDB_TIMEOUT_MS: timeout }).success).toBe(false);
      }

      expect(
        envSchema.safeParse({ ...baseValidEnv, TMDB_BASE_URL: 'not-a-url' }).success
      ).toBe(false);
      expect(
        envSchema.safeParse({ ...baseValidEnv, TMDB_IMAGE_BASE_URL: 'not-a-url' }).success
      ).toBe(false);
    });
  });
});
