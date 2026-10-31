import { useDeferredValue, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FolderPlus, Images, Pencil, Plus, Trash2 } from 'lucide-react';
import { hasRole, LABELS, MEMORY_EVENT_TYPES, type MemoryDTO } from '@avlod/shared';
import type { FamilyOutletContext } from '../layouts/FamilyLayout';
import {
  useAlbums,
  useFamilyMutation,
  useMemories,
  useMemoryYears,
  usePeople,
} from '../services/queries';
import { useAuth } from '../features/auth/AuthProvider';
import { MemoryCard, Lightbox } from '../features/memories/MemoryCard';
import { AlbumFormDialog, MemoryFormDialog } from '../features/memories/MemoryForm';
import { Button, IconButton } from '../components/ui/Button';
import { ConfirmDialog } from '../components/ui/Dialog';
import { EmptyState, ErrorState, Skeleton } from '../components/ui/States';
import { api, errorMessage } from '../lib/api';
import { cn } from '../lib/utils';

export function MemoriesPage() {
  const { family } = useOutletContext<FamilyOutletContext>();
  const { user } = useAuth();
  const [year, setYear] = useState<number | undefined>();
  const [eventType, setEventType] = useState('');
  const [personId, setPersonId] = useState('');
  const [albumId, setAlbumId] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const deferredQ = useDeferredValue(q);
  const filters = {
    year,
    eventType: eventType || undefined,
    personId: personId || undefined,
    albumId: albumId || undefined,
    q: deferredQ || undefined,
    page,
  };
  const memories = useMemories(family.id, filters);
  const years = useMemoryYears(family.id);
  const albums = useAlbums(family.id);
  const people = usePeople(family.id, { pageSize: 100, sort: 'name' });
  const [lightbox, setLightbox] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const [creatingAlbum, setCreatingAlbum] = useState(false);
  const [editing, setEditing] = useState<MemoryDTO | null>(null);
  const [deleting, setDeleting] = useState<MemoryDTO | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const canEdit = hasRole(family.role, 'EDITOR');
  const canDeleteAny = hasRole(family.role, 'ADMIN');
  const del = useFamilyMutation(family.id, (id: string) =>
    api.delete(`/families/${family.id}/memories/${id}`),
  );
  const list = memories.data?.data ?? [];
  const meta = memories.data?.meta;
  const reset = (fn: () => void) => {
    fn();
    setPage(1);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-center gap-3">
        <label htmlFor="mem-q" className="sr-only">
          Qidirish
        </label>
        <input
          id="mem-q"
          value={q}
          onChange={(e) => reset(() => setQ(e.target.value))}
          placeholder="Xotiralardan qidirish…"
          className="h-11 min-w-[200px] flex-1 rounded-full border border-white/10 bg-ink-950/60 px-5 text-sm text-parchment placeholder:text-sage-600 focus:border-gold-400/60 focus:outline-none sm:max-w-xs"
        />
        <FilterSelect
          label="Voqea turi"
          value={eventType}
          onChange={(v) => reset(() => setEventType(v))}
          options={MEMORY_EVENT_TYPES.map((t) => [t, LABELS.memoryEvent[t]])}
          all="Barcha voqealar"
        />
        <FilterSelect
          label="Inson"
          value={personId}
          onChange={(v) => reset(() => setPersonId(v))}
          options={(people.data?.data ?? []).map((p) => [p.id, p.fullName])}
          all="Barcha insonlar"
        />
        <FilterSelect
          label="Albom"
          value={albumId}
          onChange={(v) => reset(() => setAlbumId(v))}
          options={(albums.data ?? []).map((a) => [a.id, `${a.title} (${a.memoryCount})`])}
          all="Barcha albomlar"
        />
        {canEdit && (
          <div className="ml-auto flex gap-2">
            <Button
              size="sm"
              variant="secondary"
              icon={<FolderPlus className="h-4 w-4" />}
              onClick={() => setCreatingAlbum(true)}
            >
              Albom
            </Button>
            <Button size="sm" icon={<Plus className="h-4 w-4" />} onClick={() => setCreating(true)}>
              Xotira qo‘shish
            </Button>
          </div>
        )}
      </div>

      {years.data && years.data.length > 0 && (
        <nav aria-label="Yillar" className="-mx-4 mt-5 overflow-x-auto px-4">
          <ul className="flex min-w-max gap-1.5">
            <li>
              <YearChip active={year === undefined} onClick={() => reset(() => setYear(undefined))}>
                Barchasi
              </YearChip>
            </li>
            {years.data.map((y) => (
              <li key={y.year}>
                <YearChip active={year === y.year} onClick={() => reset(() => setYear(y.year))}>
                  {y.year}
                </YearChip>
              </li>
            ))}
          </ul>
        </nav>
      )}

      <div className="mt-8">
        {memories.isLoading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="aspect-[4/3]" />
            ))}
          </div>
        ) : memories.error ? (
          <ErrorState error={memories.error} onRetry={() => memories.refetch()} />
        ) : list.length === 0 ? (
          <EmptyState
            icon={<Images className="h-6 w-6" />}
            title="Xotiralar topilmadi"
            action={
              canEdit && (
                <Button onClick={() => setCreating(true)}>Birinchi xotirani qo‘shish</Button>
              )
            }
          >
            Eski suratlar, to‘y videolari yoki bobongiz aytib bergan hikoya — hammasi shu yerda
            saqlanadi.
          </EmptyState>
        ) : (
          <ul className="columns-1 gap-5 sm:columns-2 lg:columns-3 [&>li]:mb-5">
            {list.map((m, i) => {
              const canDelete = canDeleteAny || (canEdit && m.createdById === user?.id);
              return (
                <motion.li
                  key={m.id}
                  className="relative break-inside-avoid"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i, 9) * 0.04, duration: 0.5 }}
                >
                  <MemoryCard memory={m} onOpen={() => setLightbox(i)} tall={i % 5 === 1} />
                  {(canEdit || canDelete) && (
                    <div className="absolute right-3 top-3 flex gap-1 rounded-full bg-ink-950/70 p-0.5 backdrop-blur">
                      {canEdit && (
                        <IconButton
                          label="Tahrirlash"
                          className="h-8 w-8"
                          onClick={() => setEditing(m)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </IconButton>
                      )}
                      {canDelete && (
                        <IconButton
                          label="O‘chirish"
                          className="h-8 w-8 hover:text-danger"
                          onClick={() => setDeleting(m)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </IconButton>
                      )}
                    </div>
                  )}
                </motion.li>
              );
            })}
          </ul>
        )}
      </div>

      {meta && meta.totalPages > 1 && (
        <nav
          aria-label="Sahifalar"
          className="mt-8 flex items-center justify-center gap-3 text-sm text-sage-400"
        >
          <Button
            size="sm"
            variant="secondary"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Oldingi
          </Button>
          <span>
            {meta.page} / {meta.totalPages}
          </span>
          <Button
            size="sm"
            variant="secondary"
            disabled={page >= meta.totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Keyingi
          </Button>
        </nav>
      )}

      <Lightbox memories={list} index={lightbox} onIndex={setLightbox} />
      <MemoryFormDialog
        familyId={family.id}
        open={creating}
        onClose={() => setCreating(false)}
        albums={albums.data ?? []}
      />
      {editing && (
        <MemoryFormDialog
          familyId={family.id}
          open
          onClose={() => setEditing(null)}
          albums={albums.data ?? []}
          memory={editing}
        />
      )}
      <AlbumFormDialog
        familyId={family.id}
        open={creatingAlbum}
        onClose={() => setCreatingAlbum(false)}
      />
      <ConfirmDialog
        open={deleting !== null}
        title="Xotirani o‘chirasizmi?"
        message={<p>“{deleting?.title}” va unga biriktirilgan fayl butunlay o‘chiriladi.</p>}
        confirmLabel="O‘chirish"
        loading={del.isPending}
        error={deleteError}
        onConfirm={async () => {
          try {
            await del.mutateAsync(deleting!.id);
            setDeleting(null);
          } catch (e) {
            setDeleteError(errorMessage(e));
          }
        }}
        onClose={() => {
          setDeleting(null);
          setDeleteError(null);
        }}
      />
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
  all,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: [string, string][];
  all: string;
}) {
  return (
    <>
      <label className="sr-only" htmlFor={`f-${label}`}>
        {label}
      </label>
      <select
        id={`f-${label}`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 max-w-[14rem] rounded-full border border-white/10 bg-ink-950/60 px-4 text-sm text-parchment focus:border-gold-400/60 focus:outline-none"
      >
        <option value="">{all}</option>
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </>
  );
}

function YearChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'rounded-full border px-4 py-1.5 text-xs transition-colors',
        active
          ? 'border-gold-400 bg-gold-400 text-ink-900'
          : 'border-white/10 text-sage-400 hover:border-gold-400/40 hover:text-parchment',
      )}
    >
      {children}
    </button>
  );
}
