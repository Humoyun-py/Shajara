import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  AlbumDTO,
  FamilySummaryDTO,
  InvitationDTO,
  MemberDTO,
  MemoryDTO,
  PageMeta,
  PersonProfileDTO,
  PersonSummaryDTO,
  PublicDemoDTO,
  SearchResultDTO,
  StatsDTO,
  TimelineEventDTO,
  TreeDTO,
} from '@avlod/shared';
import { api } from '../lib/api';

export const qk = {
  families: ['families'] as const,
  family: (id: string) => ['family', id] as const,
  people: (id: string, q: object) => ['family', id, 'people', q] as const,
  person: (id: string, pid: string) => ['family', id, 'person', pid] as const,
  tree: (id: string, q: object) => ['family', id, 'tree', q] as const,
  memories: (id: string, q: object) => ['family', id, 'memories', q] as const,
  albums: (id: string) => ['family', id, 'albums'] as const,
  timeline: (id: string, q: object) => ['family', id, 'timeline', q] as const,
  stats: (id: string) => ['family', id, 'stats'] as const,
  members: (id: string) => ['family', id, 'members'] as const,
  invitations: (id: string) => ['family', id, 'invitations'] as const,
  branches: (id: string) => ['family', id, 'branches'] as const,
  years: (id: string) => ['family', id, 'years'] as const,
  search: (id: string, q: string) => ['family', id, 'search', q] as const,
  demo: ['demo'] as const,
};

/** Workspace-scoped data is invalidated wholesale after a write: simple and always consistent. */
export function useInvalidateFamily(familyId: string) {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ['family', familyId] });
}

export const useFamilies = (enabled = true) =>
  useQuery({
    queryKey: qk.families,
    queryFn: () => api.get<FamilySummaryDTO[]>('/families'),
    enabled,
  });

export const useFamily = (id: string) =>
  useQuery({
    queryKey: qk.family(id),
    queryFn: () => api.get<FamilySummaryDTO>(`/families/${id}`),
  });

export const useStats = (id: string) =>
  useQuery({
    queryKey: qk.stats(id),
    queryFn: () => api.get<StatsDTO>(`/families/${id}/stats`),
    enabled: Boolean(id),
  });

export interface PeopleQuery {
  q?: string;
  branch?: string;
  sort?: 'name' | 'birth' | 'recent';
  page?: number;
  pageSize?: number;
}
export const usePeople = (id: string, q: PeopleQuery) =>
  useQuery({
    queryKey: qk.people(id, q),
    queryFn: () =>
      api.page<PersonSummaryDTO[]>(`/families/${id}/people`, { ...q }) as Promise<{
        data: PersonSummaryDTO[];
        meta?: PageMeta;
      }>,
    placeholderData: keepPreviousData,
  });

export const useBranches = (id: string) =>
  useQuery({
    queryKey: qk.branches(id),
    queryFn: () => api.get<{ label: string; count: number }[]>(`/families/${id}/branches`),
  });

export const usePerson = (id: string, pid: string | null, demo = false) =>
  useQuery({
    queryKey: demo ? ['demo', 'person', pid] : qk.person(id, pid ?? ''),
    queryFn: () =>
      api.get<PersonProfileDTO>(
        demo ? `/public/demo/people/${pid}` : `/families/${id}/people/${pid}`,
      ),
    enabled: Boolean(pid),
  });

export const useTree = (
  id: string,
  q: { rootId?: string; up?: number; down?: number },
  demo = false,
) =>
  useQuery({
    queryKey: demo ? ['demo', 'tree', q] : qk.tree(id, q),
    queryFn: () => api.get<TreeDTO>(demo ? '/public/demo/tree' : `/families/${id}/tree`, q),
    placeholderData: keepPreviousData,
    retry: demo ? false : undefined,
  });

export interface MemoriesQuery {
  year?: number;
  eventType?: string;
  personId?: string;
  albumId?: string;
  q?: string;
  page?: number;
}
export const useMemories = (id: string, q: MemoriesQuery) =>
  useQuery({
    queryKey: qk.memories(id, q),
    queryFn: () => api.page<MemoryDTO[]>(`/families/${id}/memories`, { pageSize: 24, ...q }),
    placeholderData: keepPreviousData,
  });

export const useMemoryYears = (id: string) =>
  useQuery({
    queryKey: qk.years(id),
    queryFn: () => api.get<{ year: number; count: number }[]>(`/families/${id}/memories/years`),
  });

export const useAlbums = (id: string) =>
  useQuery({
    queryKey: qk.albums(id),
    queryFn: () => api.get<AlbumDTO[]>(`/families/${id}/albums`),
  });

export const useTimeline = (id: string, q: { personId?: string } = {}) =>
  useQuery({
    queryKey: qk.timeline(id, q),
    queryFn: () => api.get<TimelineEventDTO[]>(`/families/${id}/timeline`, q),
  });

export const useMembers = (id: string) =>
  useQuery({
    queryKey: qk.members(id),
    queryFn: () => api.get<MemberDTO[]>(`/families/${id}/members`),
  });

export const useInvitations = (id: string, enabled: boolean) =>
  useQuery({
    queryKey: qk.invitations(id),
    queryFn: () => api.get<InvitationDTO[]>(`/families/${id}/invitations`),
    enabled,
  });

export const useSearch = (id: string, q: string) =>
  useQuery({
    queryKey: qk.search(id, q),
    queryFn: ({ signal }) =>
      api.get<SearchResultDTO>(`/families/${id}/search`, { q, limit: 8 }, signal),
    enabled: q.trim().length >= 2,
    placeholderData: keepPreviousData,
  });

// ─── Public demo (landing page) ──────────────────────────────────────────────

export const useDemo = () =>
  useQuery({
    queryKey: qk.demo,
    queryFn: () => api.get<PublicDemoDTO>('/public/demo'),
    retry: false,
    staleTime: 5 * 60_000,
  });
export const useDemoTimeline = (enabled: boolean) =>
  useQuery({
    queryKey: ['demo', 'timeline'],
    queryFn: () => api.get<TimelineEventDTO[]>('/public/demo/timeline'),
    enabled,
    staleTime: 5 * 60_000,
  });
export const useDemoMemories = (enabled: boolean) =>
  useQuery({
    queryKey: ['demo', 'memories'],
    queryFn: () => api.get<MemoryDTO[]>('/public/demo/memories'),
    enabled,
    staleTime: 5 * 60_000,
  });

// ─── Mutations ───────────────────────────────────────────────────────────────

export function useFamilyMutation<TInput, TResult = unknown>(
  familyId: string,
  fn: (input: TInput) => Promise<TResult>,
) {
  const invalidate = useInvalidateFamily(familyId);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: async () => {
      await invalidate();
      await qc.invalidateQueries({ queryKey: qk.families });
    },
  });
}
