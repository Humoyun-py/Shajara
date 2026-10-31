export const FAMILY_ROLES = ['OWNER', 'ADMIN', 'EDITOR', 'VIEWER'] as const;
export type FamilyRole = (typeof FAMILY_ROLES)[number];

const ROLE_RANK: Record<FamilyRole, number> = { VIEWER: 0, EDITOR: 1, ADMIN: 2, OWNER: 3 };

/** True when `role` grants at least the privileges of `minimum`. */
export function hasRole(role: FamilyRole | null | undefined, minimum: FamilyRole): boolean {
  if (!role) return false;
  return ROLE_RANK[role] >= ROLE_RANK[minimum];
}

/** Roles an actor with `actorRole` may assign to others. Only the owner may create admins. */
export function assignableRoles(actorRole: FamilyRole): FamilyRole[] {
  if (actorRole === 'OWNER') return ['ADMIN', 'EDITOR', 'VIEWER'];
  if (actorRole === 'ADMIN') return ['EDITOR', 'VIEWER'];
  return [];
}

export const SEXES = ['MALE', 'FEMALE', 'OTHER', 'UNKNOWN'] as const;
export type Sex = (typeof SEXES)[number];

export const PARENT_TYPES = [
  'BIOLOGICAL',
  'ADOPTIVE',
  'STEP',
  'FOSTER',
  'GUARDIAN',
  'OTHER',
] as const;
export type ParentType = (typeof PARENT_TYPES)[number];

export const UNION_TYPES = ['MARRIAGE', 'PARTNERSHIP', 'ENGAGEMENT', 'OTHER'] as const;
export type UnionType = (typeof UNION_TYPES)[number];

export const UNION_STATUSES = [
  'ACTIVE',
  'DIVORCED',
  'SEPARATED',
  'WIDOWED',
  'ENDED',
  'UNKNOWN',
] as const;
export type UnionStatus = (typeof UNION_STATUSES)[number];

export const VERIFICATION_STATUSES = ['VERIFIED', 'UNVERIFIED', 'DISPUTED'] as const;
export type VerificationStatus = (typeof VERIFICATION_STATUSES)[number];

export const MEMORY_EVENT_TYPES = [
  'BIRTH',
  'WEDDING',
  'GRADUATION',
  'MIGRATION',
  'CELEBRATION',
  'WORK',
  'EVERYDAY',
  'HISTORIC',
  'OTHER',
] as const;
export type MemoryEventType = (typeof MEMORY_EVENT_TYPES)[number];

export const TIMELINE_EVENT_TYPES = [
  'BIRTH',
  'DEATH',
  'MARRIAGE',
  'MIGRATION',
  'EDUCATION',
  'CAREER',
  'ACHIEVEMENT',
  'FAMILY',
  'HISTORIC',
  'OTHER',
] as const;
export type TimelineEventType = (typeof TIMELINE_EVENT_TYPES)[number];

export const INVITATION_STATUSES = [
  'PENDING',
  'ACCEPTED',
  'DECLINED',
  'REVOKED',
  'EXPIRED',
] as const;
export type InvitationStatus = (typeof INVITATION_STATUSES)[number];

export const MEDIA_KINDS = ['IMAGE', 'VIDEO'] as const;
export type MediaKind = (typeof MEDIA_KINDS)[number];

export const ALLOWED_IMAGE_MIME = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
  'image/gif',
] as const;
export const ALLOWED_VIDEO_MIME = ['video/mp4', 'video/webm', 'video/quicktime'] as const;

/** Uzbek interface labels. */
export const LABELS = {
  role: { OWNER: 'Egasi', ADMIN: 'Administrator', EDITOR: 'Muharrir', VIEWER: 'Kuzatuvchi' },
  sex: { MALE: 'Erkak', FEMALE: 'Ayol', OTHER: 'Boshqa', UNKNOWN: "Noma'lum" },
  parentType: {
    BIOLOGICAL: 'Biologik',
    ADOPTIVE: 'Asrab olingan',
    STEP: "O'gay",
    FOSTER: 'Tarbiyaga olingan',
    GUARDIAN: 'Vasiy',
    OTHER: 'Boshqa',
  },
  unionType: {
    MARRIAGE: 'Nikoh',
    PARTNERSHIP: 'Hamkorlik',
    ENGAGEMENT: 'Unashtirilgan',
    OTHER: 'Boshqa',
  },
  unionStatus: {
    ACTIVE: 'Davom etmoqda',
    DIVORCED: 'Ajrashgan',
    SEPARATED: 'Alohida',
    WIDOWED: 'Beva',
    ENDED: 'Tugagan',
    UNKNOWN: "Noma'lum",
  },
  verification: { VERIFIED: 'Tasdiqlangan', UNVERIFIED: 'Tasdiqlanmagan', DISPUTED: 'Bahsli' },
  memoryEvent: {
    BIRTH: "Tug'ilish",
    WEDDING: "To'y",
    GRADUATION: 'Bitiruv',
    MIGRATION: "Ko'chish",
    CELEBRATION: 'Bayram',
    WORK: 'Mehnat',
    EVERYDAY: 'Kundalik hayot',
    HISTORIC: 'Tarixiy',
    OTHER: 'Boshqa',
  },
  timelineEvent: {
    BIRTH: "Tug'ilish",
    DEATH: 'Vafot',
    MARRIAGE: 'Nikoh',
    MIGRATION: "Ko'chish",
    EDUCATION: "Ta'lim",
    CAREER: 'Kasb',
    ACHIEVEMENT: 'Yutuq',
    FAMILY: 'Oila',
    HISTORIC: 'Tarixiy voqea',
    OTHER: 'Boshqa',
  },
} as const;
