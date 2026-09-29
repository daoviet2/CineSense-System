import { env } from '../../src/config/env.js';

describe('Environment configuration', () => {
  it('loads valid environment variables', () => {
    expect(env).toBeDefined();
    expect(typeof env.PORT).toBe('number');
    expect(env.DATABASE_URL).toBeDefined();
    expect(typeof env.DATABASE_URL).toBe('string');
    expect(env.JWT_SECRET).toBeDefined();
    expect(typeof env.JWT_SECRET).toBe('string');
    expect(['development', 'production', 'test']).toContain(env.NODE_ENV);
  });
});
