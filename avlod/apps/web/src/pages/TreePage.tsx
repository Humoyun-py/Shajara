import { useCallback, useDeferredValue, useMemo, useState } from 'react';
import { useOutletContext, useSearchParams } from 'react-router-dom';
import { GitFork, LayoutList, Network, Plus, RotateCcw, Search, Smartphone } from 'lucide-react';
import { formatLifespan, hasRole } from '@avlod/shared';
import type { FamilyOutletContext } from '../layouts/FamilyLayout';
import { useSearch, useTree } from '../services/queries';
import { useMediaQuery } from '../hooks/useReducedMotion';
import { TreeCanvas } from '../features/tree/TreeCanvas';
import { FocusView } from '../features/tree/FocusView';
import { PersonPanel } from '../features/people/PersonPanel';
import { PersonFormDialog } from '../features/people/PersonForm';
import { Drawer } from '../components/ui/Dialog';
import { Button } from '../components/ui/Button';
import { Portrait } from '../components/ui/Brand';
import { EmptyState, ErrorState, Spinner } from '../components/ui/States';
import { cn } from '../lib/utils';

type View = 'graph' | 'focus' | 'list';

export function TreePage() {
  const { family } = useOutletContext<FamilyOutletContext>();
  const [params, setParams] = useSearchParams();
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const [viewChoice, setView] = useState<View | null>(null);
  const view: View = viewChoice ?? (isDesktop ? 'graph' : 'focus');
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const [branch, setBranch] = useState('');
  const [adding, setAdding] = useState(false);

  // Selection and the loaded window live in the URL, so closing the panel or reloading keeps context.
  const rootId = params.get('root') ?? undefined;
  const selectedId = params.get('person');
  const tree = useTree(family.id, { rootId, up: 4, down: 6 });
  const update = useCallback(
    (patch: Record<string, string | null>) =>
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          for (const [k, v] of Object.entries(patch)) {
            if (v) next.set(k, v);
            else next.delete(k);
          }
          return next;
        },
        { replace: true },
      ),
    [setParams],
  );
  const select = useCallback((id: string | null) => update({ person: id }), [update]);
  const expand = useCallback((id: string) => update({ root: id, person: id }), [update]);

  const data = tree.data;
  const branches = useMemo(
    () =>
      [
        ...new Set((data?.persons ?? []).map((p) => p.branchLabel).filter(Boolean) as string[]),
      ].sort(),
    [data],
  );
  const matches = useMemo(() => {
    const q = deferredQuery.trim().toLowerCase();
    if (!q || !data) return new Set<string>();
    return new Set(
      data.persons.filter((p) => p.fullName.toLowerCase().includes(q)).map((p) => p.id),
    );
  }, [deferredQuery, data]);
  const dimmed = useMemo(() => {
    if (!data || !branch) return undefined;
    return new Set(data.persons.filter((p) => p.branchLabel !== branch).map((p) => p.id));
  }, [data, branch]);
  const remote = useSearch(family.id, matches.size === 0 ? deferredQuery : '');
  const firstMatch = matches.size ? [...matches][0]! : null;
  const canEdit = hasRole(family.role, 'EDITOR');

  if (tree.isLoading) return <Spinner label="Shajara chizilmoqda…" />;
  if (tree.error || !data) return <ErrorState error={tree.error} onRetry={() => tree.refetch()} />;

  if (data.totalPersons === 0) {
    return (
      <>
        <EmptyState
          icon={<GitFork className="h-6 w-6" />}
          title="Shajara hali bo‘sh"
          action={
            canEdit && (
              <Button icon={<Plus className="h-4 w-4" />} onClick={() => setAdding(true)}>
                Birinchi qarindoshni qo‘shish
              </Button>
            )
          }
        >
          Eng uzoq eslagan ajdodingizdan yoki o‘zingizdan boshlang. Noma’lum sanalarni keyin
          to‘ldirish mumkin.
        </EmptyState>
        <PersonFormDialog
          familyId={family.id}
          open={adding}
          onClose={() => setAdding(false)}
          onSaved={(id) => select(id)}
        />
      </>
    );
  }

  return (
    <div className="relative flex h-[calc(100vh-64px-118px)] min-h-[560px] flex-col">
      <div className="z-10 flex flex-wrap items-center gap-2 border-b border-white/[0.06] bg-ink-900/80 px-4 py-3 backdrop-blur sm:px-6">
        <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-sage-500"
            aria-hidden
          />
          <label htmlFor="tree-search" className="sr-only">
            Ism bo‘yicha qidirish
          </label>
          <input
            id="tree-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && firstMatch && select(firstMatch)}
            placeholder="Ism bo‘yicha qidirish…"
            className="h-10 w-full rounded-full border border-white/10 bg-ink-950/60 pl-10 pr-4 text-sm text-parchment placeholder:text-sage-600 focus:border-gold-400/60 focus:outline-none"
          />
          {query.trim().length >= 2 &&
            matches.size === 0 &&
            (remote.data?.people.length ?? 0) > 0 && (
              <ul className="absolute left-0 right-0 top-12 z-20 overflow-hidden rounded-2xl border border-white/10 bg-ink-800 p-1 shadow-lift">
                <li className="px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] text-sage-500">
                  Butun oila bo‘yicha
                </li>
                {remote.data!.people.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => {
                        expand(p.id);
                        setQuery('');
                      }}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm hover:bg-white/[0.05]"
                    >
                      <Portrait name={p.fullName} media={p.portrait} sex={p.sex} size={28} />
                      {p.fullName}
                    </button>
                  </li>
                ))}
              </ul>
            )}
        </div>
        {query && (
          <span className="text-xs text-sage-500" aria-live="polite">
            {matches.size} ta moslik
          </span>
        )}
        {branches.length > 0 && (
          <>
            <label htmlFor="branch" className="sr-only">
              Tarmoq
            </label>
            <select
              id="branch"
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              className="h-10 rounded-full border border-white/10 bg-ink-950/60 px-4 text-sm text-parchment focus:border-gold-400/60 focus:outline-none"
            >
              <option value="">Barcha tarmoqlar</option>
              {branches.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </>
        )}
        {rootId && (
          <Button
            size="sm"
            variant="ghost"
            icon={<RotateCcw className="h-4 w-4" />}
            onClick={() => update({ root: null })}
          >
            Butun shajara
          </Button>
        )}
        <div className="ml-auto flex items-center gap-2">
          <div
            role="tablist"
            aria-label="Ko‘rinish"
            className="flex rounded-full border border-white/10 p-0.5"
          >
            {(
              [
                ['graph', Network, 'Daraxt'],
                ['focus', Smartphone, 'Fokus'],
                ['list', LayoutList, 'Ro‘yxat'],
              ] as const
            ).map(([v, Icon, label]) => (
              <button
                key={v}
                role="tab"
                type="button"
                aria-selected={view === v}
                onClick={() => setView(v)}
                className={cn(
                  'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs',
                  view === v ? 'bg-gold-400 text-ink-900' : 'text-sage-400 hover:text-parchment',
                )}
              >
                <Icon className="h-3.5 w-3.5" aria-hidden />
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>
          {canEdit && (
            <Button size="sm" icon={<Plus className="h-4 w-4" />} onClick={() => setAdding(true)}>
              <span className="hidden sm:inline">Qo‘shish</span>
            </Button>
          )}
        </div>
      </div>

      {data.truncated && (
        <p className="border-b border-white/[0.05] bg-gold-400/[0.04] px-6 py-2 text-xs text-sage-400">
          Katta shajara: {data.persons.length} / {data.totalPersons} kishi ko‘rsatilmoqda. Boshqa
          qismlarni ochish uchun tugunlardagi ↑ ↓ tugmalaridan yoki qidiruvdan foydalaning.
        </p>
      )}

      <div className="relative flex-1 overflow-hidden">
        {view === 'graph' && (
          <TreeCanvas
            tree={data}
            selectedId={selectedId}
            onSelect={select}
            onExpand={expand}
            dimmedIds={dimmed}
            highlightIds={matches}
            focusId={firstMatch ?? null}
            showMiniMap={isDesktop}
          />
        )}
        {view === 'focus' && (
          <div className="h-full overflow-y-auto">
            <FocusView
              tree={data}
              focusId={selectedId ?? params.get('focus')}
              onFocus={(id) => update({ focus: id, person: null })}
              onOpen={select}
            />
          </div>
        )}
        {view === 'list' && (
          <TreeList data={data} onSelect={select} matches={matches} dimmed={dimmed} />
        )}
      </div>

      <Drawer open={Boolean(selectedId)} onClose={() => select(null)} title="Profil">
        {selectedId && (
          <PersonPanel
            familyId={family.id}
            personId={selectedId}
            role={family.role}
            onSelect={(id) => (data.persons.some((p) => p.id === id) ? select(id) : expand(id))}
            onDeleted={() => select(null)}
          />
        )}
      </Drawer>
      <PersonFormDialog
        familyId={family.id}
        open={adding}
        onClose={() => setAdding(false)}
        onSaved={(id) => select(id)}
      />
    </div>
  );
}

function TreeList({
  data,
  onSelect,
  matches,
  dimmed,
}: {
  data: NonNullable<ReturnType<typeof useTree>['data']>;
  onSelect: (id: string) => void;
  matches: Set<string>;
  dimmed?: Set<string>;
}) {
  const groups = useMemo(() => {
    const m = new Map<number, typeof data.persons>();
    for (const p of data.persons) m.set(p.generation, [...(m.get(p.generation) ?? []), p]);
    return [...m.entries()].sort((a, b) => a[0] - b[0]);
  }, [data]);
  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-4xl space-y-10 px-4 py-8 sm:px-6">
        {groups.map(([gen, people]) => (
          <section key={gen} aria-labelledby={`gen-${gen}`}>
            <h2
              id={`gen-${gen}`}
              className="mb-3 flex items-baseline gap-3 font-serif text-2xl text-parchment"
            >
              {gen + 1}-avlod <span className="text-sm text-sage-500">{people.length} kishi</span>
            </h2>
            <ul className="grid gap-2 sm:grid-cols-2">
              {people
                .sort((a, b) => (a.birth.year ?? 9999) - (b.birth.year ?? 9999))
                .map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => onSelect(p.id)}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-2xl border border-white/[0.07] bg-ink-800/60 px-3 py-3 text-left transition-colors hover:border-gold-400/40',
                        matches.has(p.id) && 'border-gold-400/70',
                        dimmed?.has(p.id) && 'opacity-40',
                      )}
                    >
                      <Portrait
                        name={p.fullName}
                        media={p.portrait}
                        sex={p.sex}
                        size={44}
                        deceased={p.isLiving === false || p.death.year !== null}
                      />
                      <span className="min-w-0">
                        <span className="block truncate text-[15px] text-parchment">
                          {p.fullName}
                        </span>
                        <span className="block text-xs text-sage-500">
                          {formatLifespan(p.birth, p.death, p.isLiving)}
                          {p.branchLabel ? ` · ${p.branchLabel}` : ''}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
