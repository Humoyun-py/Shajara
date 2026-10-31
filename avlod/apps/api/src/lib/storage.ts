import crypto from 'node:crypto';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env, mediaSecret } from '../config/env';

export const MEDIA_URL_TTL_SECONDS = 60 * 60;

export interface StorageDriver {
  put(key: string, sourcePath: string, mimeType: string): Promise<void>;
  remove(key: string): Promise<void>;
  signedUrl(key: string, ttlSeconds?: number): Promise<{ url: string; expiresAt: Date }>;
}

// ─── Local disk driver (development) ───────────────────────────────────────────
// Files are served by GET /api/v1/media/local/:key with an HMAC signature and expiry,
// so private media is never reachable through guessable URLs.

const localRoot = path.resolve(env.LOCAL_STORAGE_DIR);

function safeLocalPath(key: string): string {
  if (!/^[a-z0-9/_.-]+$/i.test(key) || key.includes('..')) throw new Error('invalid storage key');
  return path.join(localRoot, key);
}

export function signLocal(key: string, exp: number): string {
  return crypto.createHmac('sha256', mediaSecret).update(`${key}:${exp}`).digest('base64url');
}

export function verifyLocalSignature(key: string, exp: number, sig: string): boolean {
  if (!Number.isFinite(exp) || exp * 1000 < Date.now()) return false;
  const expected = Buffer.from(signLocal(key, exp));
  const given = Buffer.from(sig);
  return expected.length === given.length && crypto.timingSafeEqual(expected, given);
}

export const localPath = (key: string) => safeLocalPath(key);

const localDriver: StorageDriver = {
  async put(key, sourcePath) {
    const dest = safeLocalPath(key);
    await fsp.mkdir(path.dirname(dest), { recursive: true });
    await fsp.copyFile(sourcePath, dest);
  },
  async remove(key) {
    await fsp.rm(safeLocalPath(key), { force: true });
  },
  async signedUrl(key, ttl = MEDIA_URL_TTL_SECONDS) {
    const exp = Math.floor(Date.now() / 1000) + ttl;
    const url = `/api/v1/media/local/${key}?exp=${exp}&sig=${signLocal(key, exp)}`;
    return { url, expiresAt: new Date(exp * 1000) };
  },
};

// ─── S3-compatible driver ─────────────────────────────────────────────────────

function s3Driver(): StorageDriver {
  const client = new S3Client({
    region: env.S3_REGION,
    endpoint: env.S3_ENDPOINT || undefined,
    forcePathStyle: env.S3_FORCE_PATH_STYLE,
    credentials: { accessKeyId: env.S3_ACCESS_KEY_ID!, secretAccessKey: env.S3_SECRET_ACCESS_KEY! },
  });
  return {
    async put(key, sourcePath, mimeType) {
      const stat = await fsp.stat(sourcePath);
      await client.send(
        new PutObjectCommand({
          Bucket: env.S3_BUCKET,
          Key: key,
          Body: fs.createReadStream(sourcePath),
          ContentType: mimeType,
          ContentLength: stat.size,
        }),
      );
    },
    async remove(key) {
      await client.send(new DeleteObjectCommand({ Bucket: env.S3_BUCKET, Key: key }));
    },
    async signedUrl(key, ttl = MEDIA_URL_TTL_SECONDS) {
      const url = await getSignedUrl(
        client,
        new GetObjectCommand({ Bucket: env.S3_BUCKET, Key: key }),
        {
          expiresIn: ttl,
        },
      );
      return { url, expiresAt: new Date(Date.now() + ttl * 1000) };
    },
  };
}

export const storage: StorageDriver = env.STORAGE_DRIVER === 's3' ? s3Driver() : localDriver;
