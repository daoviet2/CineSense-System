/**
 * Shared env helpers for integration tests.
 * Ensures Prisma and the app talk to DATABASE_URL_TEST, never the dev DB.
 */

export function databaseNameFromUrl(url: string): string {
  const parsed = new URL(url);
  return decodeURIComponent(parsed.pathname.replace(/^\//, '')).split('/')[0] ?? '';
}

export function adminConnectionUrl(url: string): string {
  const parsed = new URL(url);
  parsed.pathname = '/postgres';
  return parsed.toString();
}

/**
 * Remaps DATABASE_URL → DATABASE_URL_TEST and sets NODE_ENV=test.
 * Compares database names (not full URLs) so Docker vs host hosts cannot false-positive.
 */
export function applyTestDatabaseUrl(): string {
  const testUrl = process.env.DATABASE_URL_TEST?.trim();
  if (!testUrl) {
    throw new Error(
      'DATABASE_URL_TEST is required for integration tests. Use a dedicated database (e.g. cinesense_test), not the development database.'
    );
  }

  const testDb = databaseNameFromUrl(testUrl);
  if (!/^[A-Za-z0-9_]+$/.test(testDb)) {
    throw new Error('DATABASE_URL_TEST database name must be alphanumeric/underscore only.');
  }
  if (!testDb.endsWith('_test')) {
    throw new Error(
      `DATABASE_URL_TEST must use a *_test database name (got "${testDb}") so the development database is never targeted.`
    );
  }

  const originalUrl = process.env.DATABASE_URL?.trim();
  if (originalUrl) {
    const originalDb = databaseNameFromUrl(originalUrl);
    // Idempotent: globalSetup already remaps DATABASE_URL onto the test DB
    // in this process (Jest may reuse that env for workers).
    if (originalDb !== testDb && originalDb.endsWith('_test')) {
      throw new Error(
        'DATABASE_URL already points at a different *_test database than DATABASE_URL_TEST.'
      );
    }
    if (originalDb === testDb) {
      process.env.NODE_ENV = 'test';
      process.env.DATABASE_URL = testUrl;
      return testUrl;
    }
  }

  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL = testUrl;
  return testUrl;
}
