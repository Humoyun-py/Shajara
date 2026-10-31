import { useMemo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import type { TreeDTO } from '@avlod/shared';
import { initials } from '../../lib/utils';
import { layoutTree, PERSON_H, PERSON_W, type PersonNode } from '../tree/layout';

/**
 * Picks one lineage for display: the deepest descendant, all of their ancestors, the children
 * of each ancestor (siblings, aunts, uncles) and everyone's partners. Every generation is shown
 * while the drawing stays readable.
 */
export function lineageSubset(tree: TreeDTO): TreeDTO {
  if (!tree.persons.length) return tree;
  const deepest = [...tree.persons].sort(
    (a, b) => b.generation - a.generation || (a.birth.year ?? 9999) - (b.birth.year ?? 9999),
  )[0]!;
  const parentsOf = new Map<string, string[]>();
  const childrenOf = new Map<string, string[]>();
  for (const l of tree.parentLinks) {
    parentsOf.set(l.childId, [...(parentsOf.get(l.childId) ?? []), l.parentId]);
    childrenOf.set(l.parentId, [...(childrenOf.get(l.parentId) ?? []), l.childId]);
  }
  const ancestors = new Set<string>([deepest.id]);
  const queue = [deepest.id];
  while (queue.length) {
    for (const p of parentsOf.get(queue.shift()!) ?? []) {
      if (!ancestors.has(p)) {
        ancestors.add(p);
        queue.push(p);
      }
    }
  }
  const keep = new Set(ancestors);
  for (const a of ancestors) for (const c of childrenOf.get(a) ?? []) keep.add(c);
  for (const u of tree.unions) {
    if (keep.has(u.partnerAId)) keep.add(u.partnerBId);
    else if (keep.has(u.partnerBId)) keep.add(u.partnerAId);
  }
  return {
    ...tree,
    persons: tree.persons.filter((p) => keep.has(p.id)),
    parentLinks: tree.parentLinks.filter((l) => keep.has(l.parentId) && keep.has(l.childId)),
    unions: tree.unions.filter((u) => keep.has(u.partnerAId) && keep.has(u.partnerBId)),
    expandable: [],
  };
}

/**
 * Editorial, read-only rendering of the demo tree. Uses the same automatic layout as the app,
 * draws connections as curves that animate into view, and opens a profile on selection.
 */
export function Showcase({ tree, onSelect }: { tree: TreeDTO; onSelect: (id: string) => void }) {
  const reduce = useReducedMotion();
  const { nodes, edges, box } = useMemo(() => {
    const { nodes, edges } = layoutTree(lineageSubset(tree));
    const pos = new Map(nodes.map((n) => [n.id, n]));
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const n of nodes) {
      const w = n.type === 'person' ? PERSON_W : 14;
      const h = n.type === 'person' ? PERSON_H : 14;
      minX = Math.min(minX, n.position.x);
      minY = Math.min(minY, n.position.y);
      maxX = Math.max(maxX, n.position.x + w);
      maxY = Math.max(maxY, n.position.y + h);
    }
    const anchor = (id: string, side: 'top' | 'bottom') => {
      const n = pos.get(id)!;
      const w = n.type === 'person' ? PERSON_W : 14;
      const h = n.type === 'person' ? PERSON_H : 14;
      return { x: n.position.x + w / 2, y: n.position.y + (side === 'top' ? 0 : h) };
    };
    const paths = edges.map((e) => {
      const a = anchor(e.source, 'bottom');
      const b = anchor(e.target, 'top');
      const my = (a.y + b.y) / 2;
      const gen =
        pos.get(e.target)?.type === 'person'
          ? (pos.get(e.target) as PersonNode).data.person.generation
          : 0;
      return {
        id: e.id,
        d: `M${a.x},${a.y} C${a.x},${my} ${b.x},${my} ${b.x},${b.y}`,
        dashed: Boolean(e.style?.strokeDasharray),
        gen,
      };
    });
    return {
      nodes,
      edges: paths,
      box: { x: minX - 30, y: minY - 30, w: maxX - minX + 60, h: maxY - minY + 60 },
    };
  }, [tree]);

  return (
    <div className="-mx-5 overflow-x-auto px-5 pb-4 sm:mx-0 sm:px-0">
      <svg
        viewBox={`${box.x} ${box.y} ${box.w} ${box.h}`}
        className="h-auto max-h-[880px] min-w-[760px] w-full"
        role="group"
        aria-label="Namuna oila shajarasi"
      >
        <defs>
          <linearGradient id="edgeGold" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#D5B16B" stopOpacity="0.7" />
            <stop offset="1" stopColor="#D5B16B" stopOpacity="0.25" />
          </linearGradient>
        </defs>
        {edges.map((e) => (
          <motion.path
            key={e.id}
            d={e.d}
            fill="none"
            stroke="url(#edgeGold)"
            strokeWidth={2}
            strokeDasharray={e.dashed ? '8 7' : undefined}
            initial={reduce ? { opacity: 0 } : { pathLength: 0, opacity: 0 }}
            whileInView={reduce ? { opacity: 1 } : { pathLength: 1, opacity: 1 }}
            viewport={{ once: true, margin: '-10%' }}
            transition={{ duration: 1.2, delay: 0.3 + e.gen * 0.35, ease: [0.22, 1, 0.36, 1] }}
          />
        ))}
        {nodes.map((n) =>
          n.type === 'union' ? (
            <motion.rect
              key={n.id}
              x={n.position.x + 2}
              y={n.position.y + 2}
              width={10}
              height={10}
              transform={`rotate(45 ${n.position.x + 7} ${n.position.y + 7})`}
              fill="#07110E"
              stroke="#D5B16B"
              strokeWidth={1.5}
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.6 }}
            />
          ) : (
            <ShowcaseNode
              key={n.id}
              node={n as PersonNode}
              onSelect={onSelect}
              reduce={Boolean(reduce)}
            />
          ),
        )}
      </svg>
    </div>
  );
}

function ShowcaseNode({
  node,
  onSelect,
  reduce,
}: {
  node: PersonNode;
  onSelect: (id: string) => void;
  reduce: boolean;
}) {
  const p = node.data.person;
  const { x, y } = node.position;
  const deceased = p.isLiving === false || p.death.year !== null;
  const years = `${p.birth.year ? (p.birth.approximate ? '~' : '') + p.birth.year : '?'}${deceased ? ` – ${p.death.year ?? '?'}` : ''}`;
  return (
    <motion.g
      role="button"
      tabIndex={0}
      aria-label={`${p.fullName}, ${years}. Profilni ochish`}
      onClick={() => onSelect(p.id)}
      onKeyDown={(e) =>
        (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onSelect(p.id))
      }
      className="cursor-pointer outline-none [&:focus-visible>rect]:stroke-gold-300 [&:hover>rect]:stroke-gold-400/70"
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-10%' }}
      transition={{ duration: 0.7, delay: 0.1 + p.generation * 0.35, ease: [0.22, 1, 0.36, 1] }}
    >
      <rect
        x={x}
        y={y}
        width={PERSON_W}
        height={PERSON_H}
        rx={18}
        fill="#101C17"
        stroke="rgba(244,240,231,0.1)"
        strokeWidth={1.2}
        className="transition-[stroke] duration-300"
      />
      <circle
        cx={x + 46}
        cy={y + PERSON_H / 2}
        r={28}
        fill={p.sex === 'FEMALE' ? '#2A251C' : '#1A2C23'}
        stroke={deceased ? 'rgba(168,180,170,0.4)' : 'rgba(213,177,107,0.55)'}
      />
      <text
        x={x + 46}
        y={y + PERSON_H / 2 + 7}
        textAnchor="middle"
        className="fill-gold-200 font-serif text-[20px]"
      >
        {initials(p.fullName)}
      </text>
      <text x={x + 88} y={y + 38} className="fill-parchment font-serif text-[19px]">
        {`${p.givenName} ${p.familyName ?? ''}`.slice(0, 18)}
      </text>
      <text x={x + 88} y={y + 58} className="fill-sage-400 font-sans text-[12.5px]">
        {years}
      </text>
      <text
        x={x + 88}
        y={y + 76}
        className="fill-gold-400 font-sans text-[10px] font-semibold uppercase tracking-[0.18em]"
      >
        {p.generation + 1}-avlod
      </text>
    </motion.g>
  );
}
