import type {
  MediaAsset,
  Memory,
  ParentChildRelationship,
  Person,
  TimelineEvent,
  Union,
} from '../generated/prisma/client';
import {
  fullName,
  hasRole,
  type FamilyRole,
  type MediaDTO,
  type ParentLinkDTO,
  type PartialDate,
  type PersonDetailDTO,
  type PersonSummaryDTO,
  type UnionDTO,
} from '@avlod/shared';
import { storage } from './storage';

/** Who is looking: a family role, or null for anonymous visitors of the public demo. */
export type Viewer = { role: FamilyRole | null };

export async function mediaDto(m: MediaAsset | null | undefined): Promise<MediaDTO | null> {
  if (!m) return null;
  const { url, expiresAt } = await storage.signedUrl(m.storageKey);
  return {
    id: m.id,
    kind: m.kind,
    mimeType: m.mimeType,
    sizeBytes: m.sizeBytes,
    url,
    expiresAt: expiresAt.toISOString(),
  };
}

const date = (
  year: number | null,
  month: number | null,
  day: number | null,
  approximate: boolean,
): PartialDate => ({
  year,
  month,
  day,
  approximate,
});

/** Living (or possibly living) people get extra privacy. */
export function isPossiblyLiving(p: Pick<Person, 'isLiving' | 'deathYear' | 'birthYear'>): boolean {
  if (p.isLiving !== null) return p.isLiving;
  if (p.deathYear !== null) return false;
  return p.birthYear === null || p.birthYear > new Date().getFullYear() - 110;
}

/**
 * Editors see everything. For living relatives, viewers lose exact birth date and place,
 * and anonymous visitors (public demo) additionally lose biography, work and portrait.
 * Internal research notes are visible to editors only.
 */
function restrictionLevel(p: Person, viewer: Viewer): 'none' | 'member' | 'public' {
  if (hasRole(viewer.role, 'EDITOR')) return 'none';
  if (!isPossiblyLiving(p)) return 'none';
  return viewer.role ? 'member' : 'public';
}

type PersonWithPortrait = Person & { portrait?: MediaAsset | null };

export async function personSummary(
  p: PersonWithPortrait,
  viewer: Viewer,
): Promise<PersonSummaryDTO> {
  const level = restrictionLevel(p, viewer);
  const restricted = level !== 'none';
  return {
    id: p.id,
    givenName: p.givenName,
    familyName: p.familyName,
    patronymic: p.patronymic,
    fullName: fullName(p),
    sex: p.sex,
    birth: restricted
      ? date(p.birthYear, null, null, p.birthApproximate)
      : date(p.birthYear, p.birthMonth, p.birthDay, p.birthApproximate),
    death: date(p.deathYear, p.deathMonth, p.deathDay, p.deathApproximate),
    isLiving: p.isLiving,
    branchLabel: p.branchLabel,
    portrait: level === 'public' ? null : await mediaDto(p.portrait),
    isDemo: p.isDemo,
    redacted: restricted,
  };
}

export async function personDetail(
  p: PersonWithPortrait,
  viewer: Viewer,
): Promise<PersonDetailDTO> {
  const level = restrictionLevel(p, viewer);
  const summary = await personSummary(p, viewer);
  return {
    ...summary,
    maidenName: p.maidenName,
    birthPlace: level === 'none' ? p.birthPlace : null,
    deathPlace: p.deathPlace,
    biography: level === 'public' ? null : p.biography,
    occupation: level === 'public' ? null : p.occupation,
    achievements: level === 'public' ? [] : p.achievements,
    notes: hasRole(viewer.role, 'EDITOR') ? p.notes : null,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

export const parentLinkDto = (l: ParentChildRelationship): ParentLinkDTO => ({
  id: l.id,
  parentId: l.parentId,
  childId: l.childId,
  type: l.type,
  verification: l.verification,
  notes: l.notes,
});

export const unionDto = (u: Union): UnionDTO => ({
  id: u.id,
  partnerAId: u.partnerAId,
  partnerBId: u.partnerBId,
  type: u.type,
  status: u.status,
  startYear: u.startYear,
  endYear: u.endYear,
  verification: u.verification,
  notes: u.notes,
});

export const memoryDate = (
  m: Pick<Memory | TimelineEvent, 'year' | 'month' | 'day' | 'approximate'>,
) => date(m.year, m.month, m.day, m.approximate);

/** Flattens a PartialDate into prefixed DB columns. */
export function flattenDate<P extends string>(prefix: P, d: PartialDate | undefined) {
  if (!d) return {};
  return {
    [`${prefix}Year`]: d.year,
    [`${prefix}Month`]: d.month,
    [`${prefix}Day`]: d.day,
    [`${prefix}Approximate`]: d.approximate,
  } as Record<string, number | boolean | null>;
}

export const plainDate = (d: PartialDate | undefined) =>
  d ? { year: d.year, month: d.month, day: d.day, approximate: d.approximate } : {};
