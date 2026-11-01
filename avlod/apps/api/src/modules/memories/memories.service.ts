import type {
  Album,
  MediaAsset,
  Memory,
  MemoryPerson,
  Person,
  TimelineEvent,
} from '../../generated/prisma/client';
import { fullName, type AlbumDTO, type MemoryDTO, type TimelineEventDTO } from '@avlod/shared';
import { prisma, type Tx } from '../../lib/prisma';
import { badRequest } from '../../lib/errors';
import { mediaDto, memoryDate } from '../../lib/mappers';

export const memoryInclude = {
  media: true,
  people: {
    include: {
      person: {
        select: { id: true, givenName: true, familyName: true, patronymic: true, deletedAt: true },
      },
    },
  },
} as const;

type MemoryRow = Memory & {
  media: MediaAsset | null;
  people: (MemoryPerson & {
    person: Pick<Person, 'id' | 'givenName' | 'familyName' | 'patronymic' | 'deletedAt'>;
  })[];
};

export async function memoryDto(m: MemoryRow): Promise<MemoryDTO> {
  return {
    id: m.id,
    title: m.title,
    description: m.description,
    eventType: m.eventType,
    date: memoryDate(m),
    location: m.location,
    caption: m.caption,
    provenance: m.provenance,
    albumId: m.albumId,
    media: await mediaDto(m.media),
    people: m.people
      .filter((p) => !p.person.deletedAt)
      .map((p) => ({ id: p.person.id, fullName: fullName(p.person) })),
    isDemo: m.isDemo,
    createdAt: m.createdAt.toISOString(),
    createdById: m.createdById,
  };
}

/** Guards references from a memory/event to people and albums of the same family. */
export async function assertFamilyRefs(
  tx: Tx,
  familyId: string,
  refs: { personIds?: string[]; albumId?: string | null; memoryId?: string | null },
) {
  if (refs.personIds?.length) {
    const unique = [...new Set(refs.personIds)];
    const count = await tx.person.count({
      where: { id: { in: unique }, familyId, deletedAt: null },
    });
    if (count !== unique.length)
      throw badRequest(
        "Tanlangan shaxslardan ba'zilari bu oilaga tegishli emas.",
        undefined,
        'INVALID_PERSON_REF',
      );
  }
  if (refs.albumId) {
    const album = await tx.album.findFirst({ where: { id: refs.albumId, familyId } });
    if (!album) throw badRequest('Albom topilmadi.', undefined, 'INVALID_ALBUM_REF');
  }
  if (refs.memoryId) {
    const memory = await tx.memory.findFirst({ where: { id: refs.memoryId, familyId } });
    if (!memory) throw badRequest('Xotira topilmadi.', undefined, 'INVALID_MEMORY_REF');
  }
}

export async function albumDto(a: Album & { _count: { memories: number } }): Promise<AlbumDTO> {
  const cover = await prisma.memory.findFirst({
    where: { albumId: a.id, media: { kind: 'IMAGE' } },
    orderBy: [{ year: { sort: 'asc', nulls: 'last' } }],
    include: { media: true },
  });
  return {
    id: a.id,
    title: a.title,
    description: a.description,
    memoryCount: a._count.memories,
    cover: await mediaDto(cover?.media),
    createdAt: a.createdAt.toISOString(),
  };
}

export const timelineInclude = {
  person: {
    select: { id: true, givenName: true, familyName: true, patronymic: true, deletedAt: true },
  },
  memory: { select: { id: true, title: true, media: true } },
} as const;

type TimelineRow = TimelineEvent & {
  person: Pick<Person, 'id' | 'givenName' | 'familyName' | 'patronymic' | 'deletedAt'> | null;
  memory: { id: string; title: string; media: MediaAsset | null } | null;
};

export async function timelineDto(e: TimelineRow): Promise<TimelineEventDTO> {
  return {
    id: e.id,
    title: e.title,
    description: e.description,
    type: e.type,
    date: memoryDate(e),
    location: e.location,
    person:
      e.person && !e.person.deletedAt ? { id: e.person.id, fullName: fullName(e.person) } : null,
    memory: e.memory
      ? { id: e.memory.id, title: e.memory.title, media: await mediaDto(e.memory.media) }
      : null,
    isDemo: e.isDemo,
  };
}
