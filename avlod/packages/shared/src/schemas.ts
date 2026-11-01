import { z } from 'zod';
import {
  FAMILY_ROLES,
  MEMORY_EVENT_TYPES,
  PARENT_TYPES,
  SEXES,
  TIMELINE_EVENT_TYPES,
  UNION_STATUSES,
  UNION_TYPES,
  VERIFICATION_STATUSES,
} from './enums';
import { isPartialDateValid } from './dates';

const trimmed = (max: number) => z.string().trim().max(max);
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((v) => (v ? v : null));

export const uuidSchema = z.string().uuid();

export const partialDateSchema = z
  .object({
    year: z.number().int().min(1).max(2200).nullable().default(null),
    month: z.number().int().min(1).max(12).nullable().default(null),
    day: z.number().int().min(1).max(31).nullable().default(null),
    approximate: z.boolean().default(false),
  })
  .refine(isPartialDateValid, { message: "Sana noto'g'ri yoki to'liq emas" });
export type PartialDateInput = z.input<typeof partialDateSchema>;

// ─── Auth & account ──────────────────────────────────────────────────────────

export const emailSchema = z.string().trim().toLowerCase().email("Email manzil noto'g'ri").max(254);
export const passwordSchema = z
  .string()
  .min(10, "Parol kamida 10 ta belgidan iborat bo'lishi kerak")
  .max(128)
  .refine((p) => /[A-Za-z]/.test(p) && /\d/.test(p), 'Parolda harf va raqam bo‘lishi kerak');

export const registerSchema = z.object({
  displayName: trimmed(80).min(2, 'Ism juda qisqa'),
  email: emailSchema,
  password: passwordSchema,
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Parolni kiriting').max(128),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const passwordResetRequestSchema = z.object({ email: emailSchema });
export const passwordResetConfirmSchema = z.object({
  token: z.string().min(20).max(200),
  password: passwordSchema,
});

export const updateProfileSchema = z.object({
  displayName: trimmed(80).min(2).optional(),
  locale: z.enum(['uz', 'ru', 'en']).optional(),
});
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: passwordSchema,
});

// ─── Families, members & invitations ─────────────────────────────────────────

export const familyCreateSchema = z.object({
  name: trimmed(120).min(2, 'Oila nomi juda qisqa'),
  description: optionalText(2000),
});
export const familyUpdateSchema = familyCreateSchema.partial();

export const memberRoleUpdateSchema = z.object({ role: z.enum(FAMILY_ROLES) });

export const invitationCreateSchema = z.object({
  email: emailSchema,
  role: z.enum(['ADMIN', 'EDITOR', 'VIEWER']),
  expiresInDays: z.number().int().min(1).max(30).default(7),
});

// ─── People & relationships ──────────────────────────────────────────────────

export const personBaseSchema = z.object({
  givenName: trimmed(80).min(1, 'Ismni kiriting'),
  familyName: optionalText(80),
  patronymic: optionalText(80),
  maidenName: optionalText(80),
  sex: z.enum(SEXES).default('UNKNOWN'),
  birth: partialDateSchema.prefault({}),
  birthPlace: optionalText(160),
  death: partialDateSchema.prefault({}),
  deathPlace: optionalText(160),
  isLiving: z.boolean().nullable().default(null),
  biography: optionalText(8000),
  occupation: optionalText(160),
  achievements: z.array(trimmed(240).min(1)).max(30).default([]),
  branchLabel: optionalText(80),
  notes: optionalText(4000),
});

const livingDeathRule = (p: { isLiving?: boolean | null; death?: { year: number | null } }) =>
  !(p.isLiving === true && p.death?.year != null);

export const personCreateSchema = personBaseSchema.refine(livingDeathRule, {
  message: 'Tirik deb belgilangan shaxsda vafot sanasi bo‘lmasligi kerak',
  path: ['isLiving'],
});
export type PersonCreateInput = z.input<typeof personCreateSchema>;

export const personUpdateSchema = personBaseSchema.partial().refine(livingDeathRule, {
  message: 'Tirik deb belgilangan shaxsda vafot sanasi bo‘lmasligi kerak',
  path: ['isLiving'],
});

/** Create a person and connect them to an existing relative in one transaction. */
export const personWithRelationSchema = z.object({
  person: personCreateSchema,
  relation: z
    .object({
      to: uuidSchema,
      kind: z.enum(['PARENT_OF', 'CHILD_OF', 'PARTNER_OF']),
      parentType: z.enum(PARENT_TYPES).default('BIOLOGICAL'),
      unionType: z.enum(UNION_TYPES).default('MARRIAGE'),
    })
    .optional(),
});

export const parentLinkCreateSchema = z.object({
  parentId: uuidSchema,
  childId: uuidSchema,
  type: z.enum(PARENT_TYPES).default('BIOLOGICAL'),
  verification: z.enum(VERIFICATION_STATUSES).default('UNVERIFIED'),
  notes: optionalText(1000),
});
export const parentLinkUpdateSchema = parentLinkCreateSchema
  .pick({ type: true, verification: true, notes: true })
  .partial();

export const unionCreateSchema = z.object({
  partnerAId: uuidSchema,
  partnerBId: uuidSchema,
  type: z.enum(UNION_TYPES).default('MARRIAGE'),
  status: z.enum(UNION_STATUSES).default('UNKNOWN'),
  startYear: z.number().int().min(1).max(2200).nullable().default(null),
  endYear: z.number().int().min(1).max(2200).nullable().default(null),
  verification: z.enum(VERIFICATION_STATUSES).default('UNVERIFIED'),
  notes: optionalText(1000),
});
export const unionUpdateSchema = unionCreateSchema
  .omit({ partnerAId: true, partnerBId: true })
  .partial();

// ─── Memories, albums, timeline ──────────────────────────────────────────────

export const memoryCreateSchema = z.object({
  title: trimmed(160).min(1, 'Sarlavhani kiriting'),
  description: optionalText(8000),
  eventType: z.enum(MEMORY_EVENT_TYPES).default('OTHER'),
  date: partialDateSchema.prefault({}),
  location: optionalText(160),
  caption: optionalText(500),
  provenance: optionalText(1000),
  albumId: uuidSchema.nullish().transform((v) => v ?? null),
  personIds: z.array(uuidSchema).max(100).default([]),
});
export const memoryUpdateSchema = memoryCreateSchema.partial();

export const albumCreateSchema = z.object({
  title: trimmed(120).min(1, 'Albom nomini kiriting'),
  description: optionalText(2000),
});
export const albumUpdateSchema = albumCreateSchema.partial();

export const timelineEventCreateSchema = z.object({
  title: trimmed(160).min(1, 'Sarlavhani kiriting'),
  description: optionalText(8000),
  type: z.enum(TIMELINE_EVENT_TYPES).default('OTHER'),
  date: partialDateSchema.prefault({}),
  location: optionalText(160),
  personId: uuidSchema.nullish().transform((v) => v ?? null),
  memoryId: uuidSchema.nullish().transform((v) => v ?? null),
});
export const timelineEventUpdateSchema = timelineEventCreateSchema.partial();

// ─── Query helpers ───────────────────────────────────────────────────────────

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(24),
});

export const peopleQuerySchema = paginationQuerySchema.extend({
  q: z.string().trim().max(120).optional(),
  branch: z.string().trim().max(80).optional(),
  sort: z.enum(['name', 'birth', 'recent']).default('name'),
});

export const memoriesQuerySchema = paginationQuerySchema.extend({
  year: z.coerce.number().int().min(1).max(2200).optional(),
  eventType: z.enum(MEMORY_EVENT_TYPES).optional(),
  personId: uuidSchema.optional(),
  albumId: uuidSchema.optional(),
  q: z.string().trim().max(120).optional(),
});

export const treeQuerySchema = z.object({
  rootId: uuidSchema.optional(),
  up: z.coerce.number().int().min(0).max(12).default(4),
  down: z.coerce.number().int().min(0).max(12).default(6),
});

export const searchQuerySchema = z.object({
  q: z.string().trim().min(1).max(120),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});
