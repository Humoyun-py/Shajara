import { describe, expect, it } from 'vitest';
import type { TreeDTO } from '@avlod/shared';
import { layoutTree, type PersonNode } from './layout';
import { lineageSubset } from '../landing/Showcase';

const person = (id: string, generation: number): TreeDTO['persons'][number] => ({
  id,
  givenName: id,
  familyName: null,
  patronymic: null,
  fullName: id,
  sex: 'UNKNOWN',
  birth: { year: 1900 + generation * 25, month: null, day: null, approximate: false },
  death: { year: null, month: null, day: null, approximate: false },
  isLiving: null,
  branchLabel: generation === 2 ? 'B' : null,
  portrait: null,
  isDemo: true,
  redacted: false,
  generation,
});

const link = (
  id: string,
  parentId: string,
  childId: string,
  type: 'BIOLOGICAL' | 'ADOPTIVE' = 'BIOLOGICAL',
) => ({
  id,
  parentId,
  childId,
  type,
  verification: 'VERIFIED' as const,
  notes: null,
});

// Grandparents G1+G2 → P (+ partner S) → C1, C2 ; A adopted by P only.
const tree: TreeDTO = {
  persons: [
    person('G1', 0),
    person('G2', 0),
    person('P', 1),
    person('S', 1),
    person('C1', 2),
    person('C2', 2),
    person('A', 2),
  ],
  parentLinks: [
    link('l1', 'G1', 'P'),
    link('l2', 'G2', 'P'),
    link('l3', 'P', 'C1'),
    link('l4', 'S', 'C1'),
    link('l5', 'P', 'C2'),
    link('l6', 'S', 'C2'),
    link('l7', 'P', 'A', 'ADOPTIVE'),
  ],
  unions: [
    {
      id: 'u1',
      partnerAId: 'G1',
      partnerBId: 'G2',
      type: 'MARRIAGE',
      status: 'WIDOWED',
      startYear: null,
      endYear: null,
      verification: 'VERIFIED',
      notes: null,
    },
    {
      id: 'u2',
      partnerAId: 'P',
      partnerBId: 'S',
      type: 'MARRIAGE',
      status: 'ACTIVE',
      startYear: null,
      endYear: null,
      verification: 'VERIFIED',
      notes: null,
    },
  ],
  rootId: 'G1',
  totalPersons: 7,
  truncated: false,
  expandable: [{ personId: 'C1', up: false, down: true }],
};

describe('layoutTree', () => {
  const { nodes, edges } = layoutTree(tree, { dimmedIds: new Set(['A']) });
  const pos = (id: string) => nodes.find((n) => n.id === id)!.position;

  it('creates a node per person plus a union node per couple', () => {
    expect(nodes.filter((n) => n.type === 'person')).toHaveLength(7);
    expect(
      nodes
        .filter((n) => n.type === 'union')
        .map((n) => n.id)
        .sort(),
    ).toEqual(['u:u1', 'u:u2']);
  });

  it('places each generation below its parents (automatic, not hand-positioned)', () => {
    expect(pos('P').y).toBeGreaterThan(pos('G1').y);
    expect(pos('C1').y).toBeGreaterThan(pos('P').y);
    expect(pos('G1').y).toBe(pos('G2').y);
    expect(pos('C1').y).toBe(pos('C2').y);
  });

  it('hangs shared children from the union and draws other parents directly, dashed when non-biological', () => {
    expect(edges.some((e) => e.source === 'u:u2' && e.target === 'C1')).toBe(true);
    expect(edges.some((e) => e.source === 'P' && e.target === 'C1')).toBe(false);
    const adoptive = edges.find((e) => e.source === 'P' && e.target === 'A');
    expect(adoptive?.style?.strokeDasharray).toBeTruthy();
  });

  it('carries display flags into node data', () => {
    const a = nodes.find((n) => n.id === 'A') as PersonNode;
    const c1 = nodes.find((n) => n.id === 'C1') as PersonNode;
    expect(a.data.dimmed).toBe(true);
    expect(c1.data.expandDown).toBe(true);
    expect((nodes.find((n) => n.id === 'G1') as PersonNode).data.isRoot).toBe(true);
  });
});

describe('lineageSubset', () => {
  it('keeps every generation of one lineage, with siblings and partners', () => {
    const sub = lineageSubset(tree);
    const ids = sub.persons.map((p) => p.id).sort();
    expect(ids).toEqual(['A', 'C1', 'C2', 'G1', 'G2', 'P', 'S']);
    expect(sub.expandable).toEqual([]);
  });
});
