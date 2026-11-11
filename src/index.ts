import { createApp } from './app.js';
import { config } from './config.js';
import { closeDb, getDb } from './db/index.js';
import { logger } from './lib/logger.js';
import { seedDemo } from './seed.js';

async function main(): Promise<void> {
  getDb();
  await seedDemo();

  const app = createApp();
  const server = app.listen(config.port, () => {
    logger.info('server listening', {
      port: config.port,
      env: config.env,
      database: config.databasePath,
      origin: config.appOrigin,
    });
  });

  const shutdown = (signal: string) => {
    logger.info('shutting down', { signal });
    server.close(() => {
      closeDb();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  process.on('unhandledRejection', (reason) => {
    logger.error('unhandled rejection', { reason: String(reason) });
    // Express 5 forwards route errors, so a rejection that reaches here means
    // something unexpected. Railway restarts the container on exit.
    process.exit(1);
  });
}

main().catch((error) => {
  logger.error('failed to start', { error: error instanceof Error ? error.stack : String(error) });
  process.exit(1);
});
