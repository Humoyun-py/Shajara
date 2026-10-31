import { env } from './config/env';
import { createApp } from './app';
import { prisma } from './lib/prisma';
import { logger } from './lib/logger';

const server = createApp().listen(env.API_PORT, () => {
  logger.info(`AVLOD API listening on http://localhost:${env.API_PORT} (docs: /api/docs)`);
});

async function shutdown(signal: string) {
  logger.info(`received ${signal}, shutting down`);
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
