import type { ParentType } from './enums';

export interface ParentEdge {
  parentId: string;
  childId: string;
  type?: ParentType;
}

export type ParentLinkError =
  | 'SELF_RELATION'
  | 'DUPLICATE_RELATION'
  | 'TOO_MANY_BIOLOGICAL_PARENTS'
  | 'CYCLE'
  | 'PARTNER_AS_PARENT';

export const RELATION_ERROR_MESSAGES: Record<ParentLinkError | 'DUPLICATE_UNION', string> = {
  SELF_RELATION: "Shaxs o'ziga ota-ona yoki farzand bo'la olmaydi.",
  DUPLICATE_RELATION: 'Bu bog‘lanish allaqachon mavjud.',
  TOO_MANY_BIOLOGICAL_PARENTS: 'Bir shaxsda ikkitadan ortiq biologik ota-ona bo‘lishi mumkin emas.',
  CYCLE:
    "Bu bog'lanish nasl zanjirida aylana hosil qiladi (shaxs o'z avlodiga ota-ona bo'lib qoladi).",
  PARTNER_AS_PARENT: 'Turmush o‘rtog‘i bir vaqtning o‘zida ota-ona sifatida bog‘lanmaydi.',
  DUPLICATE_UNION: 'Bu juftlik allaqachon qayd etilgan.',
};

function childrenIndex(edges: ParentEdge[]): Map<string, string[]> {
  const index = new Map<string, string[]>();
  for (const e of edges) {
    const list = index.get(e.parentId);
    if (list) list.push(e.childId);
    else index.set(e.parentId, [e.childId]);
  }
  return index;
}

/** All descendants of `personId` (excluding the person). Iterative to survive deep trees. */
export function descendantsOf(personId: string, edges: ParentEdge[]): Set<string> {
  const index = childrenIndex(edges);
  const seen = new Set<string>();
  const stack = [...(index.get(personId) ?? [])];
  while (stack.length) {
    const id = stack.pop()!;
    if (seen.has(id)) continue;
    seen.add(id);
    for (const c of index.get(id) ?? []) stack.push(c);
  }
  return seen;
}

/** Linking parent→child creates a cycle when the parent already descends from the child. */
export function wouldCreateCycle(edges: ParentEdge[], parentId: string, childId: string): boolean {
  if (parentId === childId) return true;
  return descendantsOf(childId, edges).has(parentId);
}

export interface ParentLinkCheck {
  parentId: string;
  childId: string;
  type: ParentType;
  /** Existing parent links of the child. */
  existingParentsOfChild: ParentEdge[];
  /** Whether the parent is the child's ancestor-descendant cycle source (computed separately for large graphs). */
  createsCycle: boolean;
  /** Partner ids of the child. */
  childPartnerIds?: string[];
}

export function validateParentLink(c: ParentLinkCheck): ParentLinkError | null {
  if (c.parentId === c.childId) return 'SELF_RELATION';
  if (c.existingParentsOfChild.some((e) => e.parentId === c.parentId)) return 'DUPLICATE_RELATION';
  if (c.childPartnerIds?.includes(c.parentId)) return 'PARTNER_AS_PARENT';
  if (c.type === 'BIOLOGICAL') {
    const bio = c.existingParentsOfChild.filter((e) => (e.type ?? 'BIOLOGICAL') === 'BIOLOGICAL');
    if (bio.length >= 2) return 'TOO_MANY_BIOLOGICAL_PARENTS';
  }
  if (c.createsCycle) return 'CYCLE';
  return null;
}

/** Stable ordering of an unordered partner pair, so a union is stored exactly once. */
export function normalizePair(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

/**
 * Assigns generation numbers (0 = earliest known). A person is one generation below
 * their deepest parent; people without parents inherit a partner's generation when known.
 */
export function computeGenerations(
  personIds: string[],
  edges: ParentEdge[],
  unions: { partnerAId: string; partnerBId: string }[] = [],
): Map<string, number> {
  const parents = new Map<string, string[]>();
  for (const e of edges) {
    const list = parents.get(e.childId);
    if (list) list.push(e.parentId);
    else parents.set(e.childId, [e.parentId]);
  }
  const ids = new Set(personIds);
  const gen = new Map<string, number>();
  const visiting = new Set<string>();

  const resolve = (id: string): number => {
    const known = gen.get(id);
    if (known !== undefined) return known;
    if (visiting.has(id)) return 0; // defensive: cycles are rejected on write
    visiting.add(id);
    const ps = (parents.get(id) ?? []).filter((p) => ids.has(p));
    const g = ps.length ? Math.max(...ps.map(resolve)) + 1 : 0;
    visiting.delete(id);
    gen.set(id, g);
    return g;
  };
  personIds.forEach(resolve);

  // Align parentless partners (e.g. someone who married into the family) with their partner.
  for (let pass = 0; pass < 3; pass++) {
    for (const u of unions) {
      const a = u.partnerAId;
      const b = u.partnerBId;
      if (!ids.has(a) || !ids.has(b)) continue;
      const aRoot = !(parents.get(a) ?? []).some((p) => ids.has(p));
      const bRoot = !(parents.get(b) ?? []).some((p) => ids.has(p));
      if (aRoot && !bRoot) gen.set(a, gen.get(b)!);
      else if (bRoot && !aRoot) gen.set(b, gen.get(a)!);
    }
  }
  // Re-derive descendants of shifted roots.
  const childIdx = childrenIndex(edges);
  const queue = personIds.filter((id) => !(parents.get(id) ?? []).some((p) => ids.has(p)));
  while (queue.length) {
    const id = queue.shift()!;
    for (const c of childIdx.get(id) ?? []) {
      if (!ids.has(c)) continue;
      const next = Math.max(gen.get(c) ?? 0, (gen.get(id) ?? 0) + 1);
      if (next !== gen.get(c)) {
        gen.set(c, next);
        queue.push(c);
      }
    }
  }
  return gen;
}

/**
 * Number of family branches: lines descending from a founding generation member
 * (children of generation-0 people) that themselves continue with descendants.
 */
export function countBranches(
  personIds: string[],
  edges: ParentEdge[],
  generations: Map<string, number>,
): number {
  const childIdx = childrenIndex(edges);
  const branchRoots = new Set<string>();
  for (const id of personIds) {
    if (generations.get(id) !== 0) continue;
    for (const c of childIdx.get(id) ?? []) {
      if ((childIdx.get(c) ?? []).length > 0) branchRoots.add(c);
    }
  }
  return branchRoots.size;
}
