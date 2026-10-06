import { execSync } from 'node:child_process';
import dotenv from 'dotenv';
import pg from 'pg';
import { adminConnectionUrl, applyTestDatabaseUrl, databaseNameFromUrl } from './testEnv';

/**
 * Creates the dedicated *_test database if needed, then applies Prisma migrations.
 * Runs in a separate Jest process before any test file loads.
 */
export default async function globalSetup(): Promise<void> {
  dotenv.config({ quiet: true });
  const testUrl = applyTestDatabaseUrl();
  const dbName = databaseNameFromUrl(testUrl);

  const client = new pg.Client({ connectionString: adminConnectionUrl(testUrl) });
  await client.connect();
  try {
    const existing = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName]);
    if (existing.rowCount === 0) {
      await client.query(`CREATE DATABASE ${dbName}`);
    }
  } finally {
    await client.end();
  }

  execSync('npx prisma migrate deploy', {
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: testUrl },
    cwd: process.cwd(),
  });
}
