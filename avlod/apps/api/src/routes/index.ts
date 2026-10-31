import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/auth';
import { authRouter } from '../modules/auth/auth.routes';
import { usersRouter } from '../modules/users/users.routes';
import { familiesRouter } from '../modules/families/families.routes';
import {
  familyInvitationsRouter,
  invitationsRouter,
} from '../modules/invitations/invitations.routes';
import { peopleRouter } from '../modules/people/people.routes';
import { memoriesRouter } from '../modules/memories/memories.routes';
import { timelineRouter } from '../modules/timeline/timeline.routes';
import { familyMediaRouter, localMediaRouter } from '../modules/media/media.routes';
import { publicRouter } from '../modules/public/public.routes';

export const v1 = Router();

v1.get('/health', async (_req, res) => {
  let database: 'up' | 'down' = 'up';
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    database = 'down';
  }
  res.status(database === 'up' ? 200 : 503).json({
    data: {
      status: database === 'up' ? 'ok' : 'degraded',
      database,
      time: new Date().toISOString(),
    },
  });
});

v1.use('/auth', authRouter);
v1.use('/users', usersRouter);
v1.use('/invitations', invitationsRouter);
v1.use('/public', publicRouter);
v1.use('/media', localMediaRouter);
v1.use('/families/:familyId/invitations', familyInvitationsRouter);
v1.use('/families', familiesRouter);
v1.use(
  '/families/:familyId',
  requireAuth,
  peopleRouter,
  memoriesRouter,
  timelineRouter,
  familyMediaRouter,
);
