import crypto from 'node:crypto';
import fsp from 'node:fs/promises';
import os from 'node:os';
import type { Request } from 'express';
import multer from 'multer';
import { fileTypeFromBuffer } from 'file-type';
import { ALLOWED_IMAGE_MIME, ALLOWED_VIDEO_MIME, type MediaKind } from '@avlod/shared';
import { env } from '../../config/env';
import { prisma } from '../../lib/prisma';
import { AppError, badRequest } from '../../lib/errors';
import { storage } from '../../lib/storage';

/** Multer writes to a temp file; the real type is verified from file content, not the client's claim. */
export const uploadMiddleware = multer({
  storage: multer.diskStorage({ destination: os.tmpdir() }),
  limits: { fileSize: Math.max(env.MAX_IMAGE_BYTES, env.MAX_VIDEO_BYTES), files: 1, fields: 30 },
}).single('file');

const EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif',
  'image/gif': 'gif',
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'video/quicktime': 'mov',
};

/** First bytes of a file — enough for magic-number detection. */
async function readHead(filePath: string): Promise<Uint8Array> {
  const handle = await fsp.open(filePath, 'r');
  try {
    const buf = Buffer.alloc(4100);
    const { bytesRead } = await handle.read(buf, 0, buf.length, 0);
    return buf.subarray(0, bytesRead);
  } finally {
    await handle.close();
  }
}

export interface StoredMedia {
  id: string;
  storageKey: string;
}

/**
 * Validates the uploaded temp file (magic bytes + per-kind size limit), moves it into object
 * storage and records a MediaAsset. `allowVideo=false` restricts to images (portraits).
 */
export async function storeUpload(
  req: Request,
  familyId: string,
  userId: string,
  allowVideo = true,
) {
  const file = req.file;
  if (!file) throw badRequest('Fayl tanlanmagan.', undefined, 'FILE_REQUIRED');
  try {
    const detected = await fileTypeFromBuffer(await readHead(file.path));
    const mime = detected?.mime ?? '';
    const isImage = (ALLOWED_IMAGE_MIME as readonly string[]).includes(mime);
    const isVideo = (ALLOWED_VIDEO_MIME as readonly string[]).includes(mime);
    if (!isImage && !(allowVideo && isVideo)) {
      throw badRequest(
        allowVideo
          ? 'Faqat JPEG, PNG, WebP, AVIF, GIF rasmlar yoki MP4, WebM, MOV videolar qabul qilinadi.'
          : 'Faqat rasm fayllari qabul qilinadi.',
        undefined,
        'UNSUPPORTED_MEDIA_TYPE',
      );
    }
    const kind: MediaKind = isImage ? 'IMAGE' : 'VIDEO';
    const limit = kind === 'IMAGE' ? env.MAX_IMAGE_BYTES : env.MAX_VIDEO_BYTES;
    if (file.size > limit) {
      throw new AppError(
        413,
        'FILE_TOO_LARGE',
        `Fayl hajmi ${Math.round(limit / 1024 / 1024)} MB dan oshmasligi kerak.`,
      );
    }
    const key = `families/${familyId}/${kind === 'IMAGE' ? 'images' : 'videos'}/${crypto.randomUUID()}.${EXT[mime]}`;
    await storage.put(key, file.path, mime);
    try {
      return await prisma.mediaAsset.create({
        data: {
          familyId,
          storageKey: key,
          kind,
          mimeType: mime,
          sizeBytes: file.size,
          originalName: file.originalname.slice(0, 200),
          uploadedById: userId,
        },
      });
    } catch (e) {
      await storage.remove(key).catch(() => undefined);
      throw e;
    }
  } finally {
    await fsp.rm(file.path, { force: true }).catch(() => undefined);
  }
}

/** Removes a media asset from storage and the database once nothing references it. */
export async function removeMediaIfOrphaned(mediaId: string | null) {
  if (!mediaId) return;
  const asset = await prisma.mediaAsset.findUnique({
    where: { id: mediaId },
    include: { _count: { select: { memories: true, personPhoto: true, portraitOf: true } } },
  });
  if (!asset) return;
  const c = asset._count;
  if (c.memories + c.personPhoto + c.portraitOf > 0) return;
  await prisma.mediaAsset.delete({ where: { id: asset.id } });
  await storage.remove(asset.storageKey).catch(() => undefined);
}
