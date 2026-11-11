import { defineConfig, devices } from '@playwright/test';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const PORT = Number(process.env.E2E_PORT ?? 4310);
const DB = process.env.E2E_DB ?? './.e2e/clientroom.db';

// A locally cached Chrome for Testing build can stand in when the exact
// headless shell for this Playwright version has not been downloaded.
const cachedChrome = join(
  homedir(),
  'Library/Caches/ms-playwright/chromium-1248/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing',
);
const executablePath =
  process.env.PW_CHROMIUM ?? (existsSync(cachedChrome) ? cachedChrome : undefined);


export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  timeout: 45_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    launchOptions: executablePath ? { executablePath } : {},
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'node dist/index.js',
    url: `http://localhost:${PORT}/healthz`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
    env: {
      NODE_ENV: 'production',
      PORT: String(PORT),
      DATABASE_PATH: DB,
      SESSION_SECRET: 'e2e-secret-that-is-long-enough-for-production-0123456789',
      APP_ORIGIN: `http://localhost:${PORT}`,
      SEED_DEMO: '0',
    },
  },
});
