import { execSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { adminQuery, startCluster, type Cluster } from '../scripts/pg-cluster';

declare module 'vitest' {
  export interface ProvidedContext {
    databaseUrl: string;
  }
}

/**
 * Integration tests run against real PostgreSQL. Each run creates its own uniquely named,
 * empty database, applies the committed migrations (`prisma migrate deploy`) and drops
 * that database afterwards — no existing database is ever reset.
 *
 * TEST_DATABASE_SERVER_URL (e.g. postgresql://user:pw@localhost:5432) points at an existing
 * server such as a CI service container; otherwise a local cluster is started on port 54339.
 */
export default async function setup({
  provide,
}: {
  provide(key: 'databaseUrl', value: string): void;
}) {
  let cluster: Cluster | null = null;
  let serverUrl = process.env.TEST_DATABASE_SERVER_URL;
  if (!serverUrl) {
    cluster = await startCluster({
      // Not under %TEMP%: OS temp cleanup removes PostgreSQL's empty internal folders.
      dataDir: process.env.TEST_PG_DIR ?? path.join(os.homedir(), '.avlod', 'test-pg'),
      port: Number(process.env.TEST_PG_PORT ?? 54339),
      database: 'postgres',
    });
    serverUrl = cluster.serverUrl;
  }
  const dbName = `avlod_test_${Date.now()}_${process.pid}`;
  await adminQuery(serverUrl, `CREATE DATABASE "${dbName}" ENCODING 'UTF8' TEMPLATE template0`);
  const url = `${serverUrl}/${dbName}?schema=public`;
  execSync('npx prisma migrate deploy', {
    cwd: fileURLToPath(new URL('..', import.meta.url)),
    env: { ...process.env, DATABASE_URL: url },
    stdio: 'pipe',
  });
  provide('databaseUrl', url);
  return async () => {
    await adminQuery(serverUrl!, `DROP DATABASE IF EXISTS "${dbName}" WITH (FORCE)`);
    cluster?.stop();
  };
}
