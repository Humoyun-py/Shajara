/**
 * Minimal driver for a local PostgreSQL cluster using the binaries shipped in the
 * `@embedded-postgres/<platform>` npm package. Used by `npm run db:embedded` and by the
 * integration-test global setup, so tests run against real PostgreSQL without Docker.
 *
 * PostgreSQL's initdb fails under UTF-8 when its own install path contains non-ASCII
 * characters, so in that case the binaries are copied once to ~/.avlod/pgbin.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { PrismaClient } from '@prisma/client';

const require = createRequire(import.meta.url);

function binaryPackageDir(): string {
  const platform = process.platform === 'win32' ? 'windows' : process.platform;
  const pkg = `@embedded-postgres/${platform}-${process.arch}`;
  // The package's `exports` hides package.json from require.resolve, so walk up node_modules.
  let dir = path.dirname(require.resolve('embedded-postgres'));
  while (true) {
    const candidate = path.join(dir, 'node_modules', ...pkg.split('/'), 'native');
    if (fs.existsSync(candidate)) return candidate;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  throw new Error(
    `PostgreSQL binaries for this platform are missing (${pkg}). Run npm install, or use Docker (npm run db:up).`,
  );
}

function binDir(): string {
  const source = binaryPackageDir();
  // eslint-disable-next-line no-control-regex
  if (/^[\x00-\x7F]*$/.test(source)) return path.join(source, 'bin');
  const version = JSON.parse(fs.readFileSync(path.join(source, '..', 'package.json'), 'utf8'))
    .version as string;
  const target = path.join(os.homedir(), '.avlod', `pgbin-${version}`);
  if (!fs.existsSync(path.join(target, 'bin'))) {
    fs.cpSync(source, target, { recursive: true });
  }
  return path.join(target, 'bin');
}

const exe = (bin: string, name: string) =>
  path.join(bin, process.platform === 'win32' ? `${name}.exe` : name);

export interface Cluster {
  url: string;
  /** Server URL without a database name, e.g. postgresql://postgres:pw@localhost:5432 */
  serverUrl: string;
  stop(): void;
}

export async function startCluster(opts: {
  dataDir: string;
  port: number;
  database: string;
  password?: string;
}): Promise<Cluster> {
  const bin = binDir();
  const password = opts.password ?? 'postgres';
  if (!fs.existsSync(path.join(opts.dataDir, 'PG_VERSION'))) {
    fs.mkdirSync(path.dirname(opts.dataDir), { recursive: true });
    const pwfile = path.join(os.tmpdir(), `avlod-pw-${process.pid}`);
    fs.writeFileSync(pwfile, password);
    try {
      execFileSync(
        exe(bin, 'initdb'),
        [
          '-D',
          opts.dataDir,
          '-U',
          'postgres',
          '-A',
          'scram-sha-256',
          '--pwfile',
          pwfile,
          '-E',
          'UTF8',
          '--locale=C',
        ],
        { stdio: 'pipe' },
      );
    } finally {
      fs.rmSync(pwfile, { force: true });
    }
  }
  const logFile = path.join(opts.dataDir, 'server.log');
  let running = true;
  try {
    execFileSync(exe(bin, 'pg_ctl'), ['status', '-D', opts.dataDir], { stdio: 'ignore' });
  } catch {
    running = false; // exit code 3: not running (a stale postmaster.pid is handled by pg_ctl)
  }
  if (!running) {
    execFileSync(
      exe(bin, 'pg_ctl'),
      [
        'start',
        '-w',
        '-t',
        '60',
        '-D',
        opts.dataDir,
        '-l',
        logFile,
        '-o',
        `-p ${opts.port} -c listen_addresses=localhost`,
      ],
      // The server inherits stdio handles; piping them would block until it exits.
      { stdio: 'ignore' },
    );
  }
  const base = `postgresql://postgres:${encodeURIComponent(password)}@localhost:${opts.port}`;
  const admin = new PrismaClient({ datasourceUrl: `${base}/postgres` });
  try {
    const rows = await admin.$queryRaw<
      { n: number }[]
    >`SELECT count(*)::int AS n FROM pg_database WHERE datname = ${opts.database}`;
    if (!rows[0]?.n) {
      if (!/^[a-z_][a-z0-9_]*$/.test(opts.database)) throw new Error('invalid database name');
      await admin.$executeRawUnsafe(
        `CREATE DATABASE "${opts.database}" ENCODING 'UTF8' TEMPLATE template0`,
      );
    }
  } finally {
    await admin.$disconnect();
  }
  return {
    url: `${base}/${opts.database}?schema=public`,
    serverUrl: base,
    stop() {
      try {
        execFileSync(exe(bin, 'pg_ctl'), ['stop', '-D', opts.dataDir, '-m', 'fast', '-w'], {
          stdio: 'pipe',
        });
      } catch {
        // already stopped
      }
    },
  };
}

/** Runs one SQL statement against the maintenance database of a server. */
export async function adminQuery(serverUrl: string, sql: string): Promise<void> {
  const admin = new PrismaClient({ datasourceUrl: `${serverUrl}/postgres` });
  try {
    await admin.$executeRawUnsafe(sql);
  } finally {
    await admin.$disconnect();
  }
}
