import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

if (existsSync('.env')) {
  try {
    process.loadEnvFile('.env');
  } catch {
    // A malformed .env should not crash the process silently. The checks below
    // will fail loudly if a required value is missing.
  }
}

const isProduction = process.env.NODE_ENV === 'production';
const isTest = process.env.NODE_ENV === 'test';

const sessionSecret = process.env.SESSION_SECRET ?? '';

if (isProduction && sessionSecret.length < 32) {
  throw new Error(
    'SESSION_SECRET must be set to at least 32 characters in production. Generate one with: openssl rand -base64 48',
  );
}

if (!isProduction && !isTest && sessionSecret.length === 0) {
  console.warn('[config] SESSION_SECRET is not set. Using an insecure development value.');
}

const databasePath = resolve(process.env.DATABASE_PATH ?? './data/clientroom.db');

export const config = {
  env: process.env.NODE_ENV ?? 'development',
  isProduction,
  isTest,
  port: Number(process.env.PORT ?? 3000),
  databasePath,
  databaseDir: dirname(databasePath),
  sessionSecret: sessionSecret.length > 0 ? sessionSecret : 'dev-only-secret-do-not-use-in-production',
  appOrigin: (process.env.APP_ORIGIN ?? 'http://localhost:5173').replace(/\/$/, ''),
  sessionCookieName: 'cr_session',
  sessionTtlSeconds: 60 * 60 * 24 * 7,
  seedDemo: process.env.SEED_DEMO === '1',
  seedEmail: process.env.SEED_EMAIL ?? 'demo@clientroom.app',
  seedPassword: process.env.SEED_PASSWORD ?? '',
} as const;

if (!Number.isFinite(config.port) || config.port <= 0) {
  throw new Error(`PORT is not a valid number: ${process.env.PORT}`);
}
