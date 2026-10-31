import { useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { formatLifespan, type TreeDTO } from '@avlod/shared';
import { Portrait } from '../../components/ui/Brand';
import { cn } from '../../lib/utils';
import type { TreePerson } from './layout';

/**
 * Mobile-first tree navigation: one person in focus with parents above, partners beside and
 * children below. Tapping a relative moves the focus — no pinch-zooming tiny nodes.
 */
export function FocusView({
  tree,
  focusId,
  onFocus,
  onOpen,
}: {
  tree: TreeDTO;
  focusId: string | null;
  onFocus: (id: string) => void;
  onOpen: (id: string) => void;
}) {
  const byId = useMemo(() => new Map(tree.persons.map((p) => [p.id, p])), [tree]);
  const current =
    (focusId && byId.get(focusId)) ||
    tree.persons.find((p) => p.id === tree.rootId) ||
    tree.persons[0];
  if (!current) return null;

  const parents = tree.parentLinks
    .filter((l) => l.childId === current.id)
    .map((l) => byId.get(l.parentId))
    .filter(Boolean) as TreePerson[];
  const children = tree.parentLinks
    .filter((l) => l.parentId === current.id)
    .map((l) => byId.get(l.childId))
    .filter(Boolean) as TreePerson[];
  const partners = tree.unions
    .filter((u) => u.partnerAId === current.id || u.partnerBId === current.id)
    .map((u) => byId.get(u.partnerAId === current.id ? u.partnerBId : u.partnerAId))
    .filter(Boolean) as TreePerson[];
  const parentIds = new Set(parents.map((p) => p.id));
  const siblings = [
    ...new Set(
      tree.parentLinks
        .filter((l) => parentIds.has(l.parentId) && l.childId !== current.id)
        .map((l) => l.childId),
    ),
  ]
    .map((id) => byId.get(id))
    .filter(Boolean) as TreePerson[];

  return (
    <div className="mx-auto max-w-lg space-y-6 px-4 py-6">
      <Row label="Ota-onasi" people={parents} onFocus={onFocus} />
      <AnimatePresence mode="wait">
        <motion.div
          key={current.id}
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.97 }}
          transition={{ duration: 0.25 }}
          className="relative rounded-3xl border border-gold-400/50 bg-ink-800 p-5 shadow-lift"
        >
          <div className="flex items-center gap-4">
            <Portrait
              name={current.fullName}
              media={current.portrait}
              sex={current.sex}
              size={72}
              deceased={current.isLiving === false || current.death.year !== null}
            />
            <div className="min-w-0">
              <p className="eyebrow">{current.generation + 1}-avlod</p>
              <h3 className="mt-1 font-serif text-2xl leading-tight text-parchment">
                {current.fullName}
              </h3>
              <p className="text-sm text-sage-400">
                {formatLifespan(current.birth, current.death, current.isLiving)}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onOpen(current.id)}
            className="mt-4 w-full rounded-full border border-white/10 py-2.5 text-sm text-parchment hover:border-gold-400/50"
          >
            Profilni ochish
          </button>
        </motion.div>
      </AnimatePresence>
      <Row label="Turmush o‘rtog‘i" people={partners} onFocus={onFocus} />
      <Row label="Aka-uka, opa-singillari" people={siblings} onFocus={onFocus} />
      <Row label="Farzandlari" people={children} onFocus={onFocus} />
    </div>
  );
}

function Row({
  label,
  people,
  onFocus,
}: {
  label: string;
  people: TreePerson[];
  onFocus: (id: string) => void;
}) {
  if (!people.length) return null;
  return (
    <section>
      <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-sage-500">
        {label}
      </h4>
      <ul className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1">
        {people.map((p) => (
          <li key={p.id} className="snap-start">
            <button
              type="button"
              onClick={() => onFocus(p.id)}
              className={cn(
                'flex w-36 flex-col items-center gap-2 rounded-2xl border border-white/10 bg-ink-800/80 px-3 py-4 text-center active:scale-[0.98]',
              )}
            >
              <Portrait
                name={p.fullName}
                media={p.portrait}
                sex={p.sex}
                size={48}
                deceased={p.isLiving === false || p.death.year !== null}
              />
              <span className="line-clamp-2 text-sm leading-tight text-parchment">
                {p.givenName} {p.familyName}
              </span>
              <span className="text-xs text-sage-500">{p.birth.year ?? '?'}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
