import { useDeferredValue, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, Search, Users } from 'lucide-react';
import { formatLifespan, hasRole } from '@avlod/shared';
import type { FamilyOutletContext } from '../layouts/FamilyLayout';
import { useBranches, usePeople } from '../services/queries';
import { Portrait } from '../components/ui/Brand';
import { Button } from '../components/ui/Button';
import { Badge, EmptyState, ErrorState, Skeleton } from '../components/ui/States';
import { PersonFormDialog } from '../features/people/PersonForm';

export function PeoplePage() {
  const { family } = useOutletContext<FamilyOutletContext>();
  const [q, setQ] = useState('');
  const [branch, setBranch] = useState('');
  const [sort, setSort] = useState<'name' | 'birth' | 'recent'>('name');
  const [page, setPage] = useState(1);
  const [adding, setAdding] = useState(false);
  const deferred = useDeferredValue(q);
  const people = usePeople(family.id, {
    q: deferred || undefined,
    branch: branch || undefined,
    sort,
    page,
    pageSize: 24,
  });
  const branches = useBranches(family.id);
  const canEdit = hasRole(family.role, 'EDITOR');
  const meta = people.data?.meta;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-end gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search
            className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-sage-500"
            aria-hidden
          />
          <label htmlFor="people-q" className="sr-only">
            Qidirish
          </label>
          <input
            id="people-q"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            placeholder="Ism, familiya yoki otasining ismi…"
            className="h-12 w-full rounded-full border border-white/10 bg-ink-950/60 pl-11 pr-4 text-[15px] text-parchment placeholder:text-sage-600 focus:border-gold-400/60 focus:outline-none"
          />
        </div>
        <label className="sr-only" htmlFor="people-branch">
          Tarmoq
        </label>
        <select
          id="people-branch"
          value={branch}
          onChange={(e) => {
            setBranch(e.target.value);
            setPage(1);
          }}
          className="h-12 rounded-full border border-white/10 bg-ink-950/60 px-4 text-sm text-parchment"
        >
          <option value="">Barcha tarmoqlar</option>
          {branches.data?.map((b) => (
            <option key={b.label} value={b.label}>
              {b.label} ({b.count})
            </option>
          ))}
        </select>
        <label className="sr-only" htmlFor="people-sort">
          Saralash
        </label>
        <select
          id="people-sort"
          value={sort}
          onChange={(e) => setSort(e.target.value as typeof sort)}
          className="h-12 rounded-full border border-white/10 bg-ink-950/60 px-4 text-sm text-parchment"
        >
          <option value="name">Familiya bo‘yicha</option>
          <option value="birth">Tug‘ilgan yili bo‘yicha</option>
          <option value="recent">Yangi qo‘shilganlar</option>
        </select>
        {canEdit && (
          <Button icon={<Plus className="h-4 w-4" />} onClick={() => setAdding(true)}>
            Qarindosh qo‘shish
          </Button>
        )}
      </div>

      <div className="mt-8">
        {people.isLoading ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 9 }, (_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        ) : people.error ? (
          <ErrorState error={people.error} onRetry={() => people.refetch()} />
        ) : !people.data?.data.length ? (
          <EmptyState
            icon={<Users className="h-6 w-6" />}
            title={q || branch ? 'Hech kim topilmadi' : 'Hali qarindoshlar yo‘q'}
          >
            {q || branch ? 'Boshqa so‘z bilan qidirib ko‘ring.' : 'Birinchi qarindoshni qo‘shing.'}
          </EmptyState>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {people.data.data.map((p, i) => (
              <motion.li
                key={p.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i, 12) * 0.025 }}
              >
                <Link
                  to={p.id}
                  className="group flex items-center gap-4 rounded-2xl border border-white/[0.07] bg-ink-800/60 p-4 transition-colors hover:border-gold-400/40 hover:bg-ink-800"
                >
                  <Portrait
                    name={p.fullName}
                    media={p.portrait}
                    sex={p.sex}
                    size={56}
                    deceased={p.isLiving === false || p.death.year !== null}
                  />
                  <span className="min-w-0">
                    <span className="block truncate font-serif text-xl text-parchment group-hover:text-gold-200">
                      {p.fullName}
                    </span>
                    <span className="block text-sm text-sage-500">
                      {formatLifespan(p.birth, p.death, p.isLiving)}
                    </span>
                    {p.branchLabel && <Badge className="mt-1.5">{p.branchLabel}</Badge>}
                  </span>
                </Link>
              </motion.li>
            ))}
          </ul>
        )}
      </div>

      {meta && meta.totalPages > 1 && (
        <nav
          aria-label="Sahifalar"
          className="mt-10 flex items-center justify-center gap-3 text-sm text-sage-400"
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
            {meta.page} / {meta.totalPages} · jami {meta.total}
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
      <PersonFormDialog familyId={family.id} open={adding} onClose={() => setAdding(false)} />
    </div>
  );
}
