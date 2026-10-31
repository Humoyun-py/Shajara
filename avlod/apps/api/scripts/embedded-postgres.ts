/**
 * Local PostgreSQL without Docker. Binaries come from the `@embedded-postgres/*` npm
 * package; data lives in ~/.avlod/pg by default.
 *
 *   npm run db:embedded     # starts PostgreSQL on port 54329; Ctrl+C stops it
 *
 * Matching DATABASE_URL: postgresql://postgres:postgres@localhost:54329/avlod?schema=public
 */
import os from 'node:os';
import path from 'node:path';
import { startCluster } from './pg-cluster';

const dataDir = process.env.EMBEDDED_PG_DIR ?? path.join(os.homedir(), '.avlod', 'pg');
const port = Number(process.env.EMBEDDED_PG_PORT ?? 54329);

const cluster = await startCluster({ dataDir, port, database: 'avlod' });
console.log(`[embedded-pg] ready: ${cluster.url}`);
console.log(`[embedded-pg] data: ${dataDir} — press Ctrl+C to stop`);

const stop = () => {
  cluster.stop();
  process.exit(0);
};
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
// Keep the process alive so Ctrl+C stops the server cleanly.
setInterval(() => undefined, 1 << 30);
