import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { body, ok, param } from '../../lib/http';
import { forbidden, notFound } from '../../lib/errors';
import { audit } from '../../lib/audit';
import { mediaDto } from '../../lib/mappers';
import { localPath, verifyLocalSignature } from '../../lib/storage';
import { currentFamily, currentUser, familyAccess } from '../../middleware/family';
import { uploadLimiter } from '../../middleware/rateLimit';
import { requirePerson } from '../people/people.service';
import { removeMediaIfOrphaned, storeUpload, uploadMiddleware } from './upload';

/** Mounted at /families/:familyId (behind requireAuth). */
export const familyMediaRouter = Router({ mergeParams: true });

/** Fresh signed URL for a media asset in this family. */
familyMediaRouter.get('/media/:mediaId', familyAccess('VIEWER'), async (req, res) => {
  const asset = await prisma.mediaAsset.findFirst({
    where: { id: param(req, 'mediaId'), familyId: currentFamily(req).id },
  });
  if (!asset) throw notFound('Media');
  ok(res, await mediaDto(asset));
});

/** Upload a portrait; it also becomes one of the person's photos. */
familyMediaRouter.post(
  '/people/:personId/portrait',
  familyAccess('EDITOR'),
  uploadLimiter,
  uploadMiddleware,
  async (req, res) => {
    const familyId = currentFamily(req).id;
    const personId = param(req, 'personId');
    await requirePerson(prisma, familyId, personId);
    const asset = await storeUpload(req, familyId, currentUser(req).id, false);
    await prisma.$transaction(async (tx) => {
      await tx.person.update({ where: { id: personId }, data: { portraitMediaId: asset.id } });
      await tx.personPhoto.create({
        data: { familyId, personId, mediaId: asset.id, caption: null },
      });
      await audit(tx, {
        familyId,
        actorId: currentUser(req).id,
        action: 'person.portrait',
        entityType: 'Person',
        entityId: personId,
        after: { mediaId: asset.id },
      });
    });
    ok(res, await mediaDto(asset), 201);
  },
);

familyMediaRouter.post(
  '/people/:personId/photos',
  familyAccess('EDITOR'),
  uploadLimiter,
  uploadMiddleware,
  async (req, res) => {
    const familyId = currentFamily(req).id;
    const personId = param(req, 'personId');
    await requirePerson(prisma, familyId, personId);
    const { caption } = z
      .object({ caption: z.string().trim().max(500).optional() })
      .parse(req.body ?? {});
    const asset = await storeUpload(req, familyId, currentUser(req).id, false);
    const photo = await prisma.personPhoto.create({
      data: { familyId, personId, mediaId: asset.id, caption: caption || null },
    });
    ok(res, { id: photo.id, caption: photo.caption, media: await mediaDto(asset) }, 201);
  },
);

familyMediaRouter.patch(
  '/people/:personId/photos/:photoId',
  familyAccess('EDITOR'),
  async (req, res) => {
    const { caption, makePortrait } = body(
      req,
      z.object({
        caption: z.string().trim().max(500).nullish(),
        makePortrait: z.boolean().optional(),
      }),
    );
    const familyId = currentFamily(req).id;
    const photo = await prisma.personPhoto.findFirst({
      where: { id: param(req, 'photoId'), familyId, personId: param(req, 'personId') },
    });
    if (!photo) throw notFound('Rasm');
    await prisma.$transaction(async (tx) => {
      if (caption !== undefined)
        await tx.personPhoto.update({
          where: { id: photo.id },
          data: { caption: caption || null },
        });
      if (makePortrait)
        await tx.person.update({
          where: { id: photo.personId },
          data: { portraitMediaId: photo.mediaId },
        });
    });
    res.status(204).end();
  },
);

familyMediaRouter.delete(
  '/people/:personId/photos/:photoId',
  familyAccess('EDITOR'),
  async (req, res) => {
    const familyId = currentFamily(req).id;
    const photo = await prisma.personPhoto.findFirst({
      where: { id: param(req, 'photoId'), familyId, personId: param(req, 'personId') },
    });
    if (!photo) throw notFound('Rasm');
    await prisma.$transaction(async (tx) => {
      await tx.person.updateMany({
        where: { id: photo.personId, portraitMediaId: photo.mediaId },
        data: { portraitMediaId: null },
      });
      await tx.personPhoto.delete({ where: { id: photo.id } });
      await audit(tx, {
        familyId,
        actorId: currentUser(req).id,
        action: 'person.photo.delete',
        entityType: 'PersonPhoto',
        entityId: photo.id,
        before: photo,
      });
    });
    await removeMediaIfOrphaned(photo.mediaId);
    res.status(204).end();
  },
);

/** Mounted at /media — serves local-driver files to holders of a valid signed URL. */
export const localMediaRouter = Router();

localMediaRouter.get('/local/*key', async (req, res) => {
  const raw = (req.params as Record<string, string | string[]>).key;
  const key = Array.isArray(raw) ? raw.join('/') : String(raw);
  const exp = Number(req.query.exp);
  const sig = typeof req.query.sig === 'string' ? req.query.sig : '';
  if (!verifyLocalSignature(key, exp, sig))
    throw forbidden('Havola yaroqsiz yoki muddati tugagan.');
  const asset = await prisma.mediaAsset.findUnique({ where: { storageKey: key } });
  if (!asset) throw notFound('Media');
  // sendFile handles Range requests, so videos can seek.
  res.sendFile(localPath(key), {
    headers: {
      'Content-Type': asset.mimeType,
      'Cache-Control': 'private, max-age=3600',
      'X-Content-Type-Options': 'nosniff',
      'Content-Disposition': 'inline',
    },
  });
});
