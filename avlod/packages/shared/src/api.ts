import type { PartialDate } from './dates';
import type {
  FamilyRole,
  InvitationStatus,
  MediaKind,
  MemoryEventType,
  ParentType,
  Sex,
  TimelineEventType,
  UnionStatus,
  UnionType,
  VerificationStatus,
} from './enums';

/** Every successful API response: `{ data, meta? }`. Every error: `{ error: { code, message, details? } }`. */
export interface ApiSuccess<T> {
  data: T;
  meta?: PageMeta;
}
export interface ApiErrorBody {
  error: { code: string; message: string; details?: unknown };
}
export interface PageMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface UserDTO {
  id: string;
  email: string;
  displayName: string;
  locale: string;
  createdAt: string;
}

export interface AuthResultDTO {
  user: UserDTO;
  accessToken: string;
  accessTokenExpiresAt: string;
}

export interface FamilySummaryDTO {
  id: string;
  name: string;
  description: string | null;
  isDemo: boolean;
  role: FamilyRole | null;
  memberCount: number;
  personCount: number;
  createdAt: string;
}

export interface MediaDTO {
  id: string;
  kind: MediaKind;
  mimeType: string;
  sizeBytes: number;
  url: string;
  expiresAt: string;
}

export interface PersonSummaryDTO {
  id: string;
  givenName: string;
  familyName: string | null;
  patronymic: string | null;
  fullName: string;
  sex: Sex;
  birth: PartialDate;
  death: PartialDate;
  isLiving: boolean | null;
  branchLabel: string | null;
  portrait: MediaDTO | null;
  isDemo: boolean;
  /** True when some fields were withheld because the person is living and the viewer lacks rights. */
  redacted: boolean;
}

export interface PersonDetailDTO extends PersonSummaryDTO {
  maidenName: string | null;
  birthPlace: string | null;
  deathPlace: string | null;
  biography: string | null;
  occupation: string | null;
  achievements: string[];
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ParentLinkDTO {
  id: string;
  parentId: string;
  childId: string;
  type: ParentType;
  verification: VerificationStatus;
  notes: string | null;
}

export interface UnionDTO {
  id: string;
  partnerAId: string;
  partnerBId: string;
  type: UnionType;
  status: UnionStatus;
  startYear: number | null;
  endYear: number | null;
  verification: VerificationStatus;
  notes: string | null;
}

export interface RelativesDTO {
  parents: { person: PersonSummaryDTO; link: ParentLinkDTO }[];
  children: { person: PersonSummaryDTO; link: ParentLinkDTO }[];
  partners: { person: PersonSummaryDTO; union: UnionDTO }[];
  siblings: { person: PersonSummaryDTO; shared: 'FULL' | 'HALF' | 'OTHER' }[];
}

export interface PersonProfileDTO {
  person: PersonDetailDTO;
  relatives: RelativesDTO;
  generation: number | null;
  photos: { id: string; caption: string | null; media: MediaDTO }[];
}

export interface TreeDTO {
  persons: (PersonSummaryDTO & { generation: number })[];
  parentLinks: ParentLinkDTO[];
  unions: UnionDTO[];
  rootId: string | null;
  totalPersons: number;
  truncated: boolean;
  /** Ids of people with relatives outside the returned window (expand to load more). */
  expandable: { personId: string; up: boolean; down: boolean }[];
}

export interface MemoryDTO {
  id: string;
  title: string;
  description: string | null;
  eventType: MemoryEventType;
  date: PartialDate;
  location: string | null;
  caption: string | null;
  provenance: string | null;
  albumId: string | null;
  media: MediaDTO | null;
  people: { id: string; fullName: string }[];
  isDemo: boolean;
  createdAt: string;
  createdById: string | null;
}

export interface AlbumDTO {
  id: string;
  title: string;
  description: string | null;
  memoryCount: number;
  cover: MediaDTO | null;
  createdAt: string;
}

export interface TimelineEventDTO {
  id: string;
  title: string;
  description: string | null;
  type: TimelineEventType;
  date: PartialDate;
  location: string | null;
  person: { id: string; fullName: string } | null;
  memory: { id: string; title: string; media: MediaDTO | null } | null;
  isDemo: boolean;
}

export interface StatsDTO {
  familyMembers: number;
  generations: number;
  branches: number;
  memories: number;
}

export interface MemberDTO {
  id: string;
  userId: string;
  displayName: string;
  email: string;
  role: FamilyRole;
  joinedAt: string;
}

export interface InvitationDTO {
  id: string;
  email: string;
  role: FamilyRole;
  status: InvitationStatus;
  expiresAt: string;
  createdAt: string;
  invitedBy: string | null;
  /** Only present once, in the response to creation. */
  acceptUrl?: string;
}

export interface InvitationPreviewDTO {
  familyName: string;
  role: FamilyRole;
  email: string;
  status: InvitationStatus;
  expiresAt: string;
  invitedBy: string | null;
}

export interface SearchResultDTO {
  people: PersonSummaryDTO[];
  memories: { id: string; title: string; year: number | null }[];
  events: { id: string; title: string; year: number | null }[];
}

export interface PublicDemoDTO {
  family: { id: string; name: string; description: string | null };
  stats: StatsDTO;
}
