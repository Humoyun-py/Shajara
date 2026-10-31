import { describe, expect, it } from 'vitest';
import {
  computeGenerations,
  countBranches,
  normalizePair,
  validateParentLink,
  wouldCreateCycle,
  type ParentEdge,
} from './relationships';
import { formatPartialDate, isPartialDateValid } from './dates';
import { hasRole, assignableRoles } from './enums';
import { personCreateSchema } from './schemas';

// A → B → C, A → D
const edges: ParentEdge[] = [
  { parentId: 'A', childId: 'B' },
  { parentId: 'B', childId: 'C' },
  { parentId: 'A', childId: 'D' },
];

describe('cycle detection', () => {
  it('rejects self links', () => expect(wouldCreateCycle(edges, 'A', 'A')).toBe(true));
  it('rejects making a descendant the parent of an ancestor', () => {
    expect(wouldCreateCycle(edges, 'C', 'A')).toBe(true);
    expect(wouldCreateCycle(edges, 'D', 'A')).toBe(true);
  });
  it('allows unrelated links', () => {
    expect(wouldCreateCycle(edges, 'D', 'C')).toBe(false);
    expect(wouldCreateCycle(edges, 'X', 'A')).toBe(false);
  });
});

describe('validateParentLink', () => {
  const base = { parentId: 'P', childId: 'C', type: 'BIOLOGICAL' as const, createsCycle: false };
  it('detects duplicates', () => {
    expect(
      validateParentLink({ ...base, existingParentsOfChild: [{ parentId: 'P', childId: 'C' }] }),
    ).toBe('DUPLICATE_RELATION');
  });
  it('limits biological parents to two but allows adoptive parents', () => {
    const existing: ParentEdge[] = [
      { parentId: 'M', childId: 'C', type: 'BIOLOGICAL' },
      { parentId: 'F', childId: 'C', type: 'BIOLOGICAL' },
    ];
    expect(validateParentLink({ ...base, existingParentsOfChild: existing })).toBe(
      'TOO_MANY_BIOLOGICAL_PARENTS',
    );
    expect(
      validateParentLink({ ...base, type: 'ADOPTIVE', existingParentsOfChild: existing }),
    ).toBeNull();
  });
  it('rejects partner as parent and reports cycles', () => {
    expect(
      validateParentLink({ ...base, existingParentsOfChild: [], childPartnerIds: ['P'] }),
    ).toBe('PARTNER_AS_PARENT');
    expect(validateParentLink({ ...base, existingParentsOfChild: [], createsCycle: true })).toBe(
      'CYCLE',
    );
    expect(validateParentLink({ ...base, childId: 'P', existingParentsOfChild: [] })).toBe(
      'SELF_RELATION',
    );
  });
});

describe('generations & branches', () => {
  it('assigns generations and aligns in-laws with partners', () => {
    const g = computeGenerations(['A', 'B', 'C', 'D', 'S'], edges, [
      { partnerAId: 'B', partnerBId: 'S' },
    ]);
    expect(g.get('A')).toBe(0);
    expect(g.get('B')).toBe(1);
    expect(g.get('C')).toBe(2);
    expect(g.get('S')).toBe(1);
    expect(countBranches(['A', 'B', 'C', 'D', 'S'], edges, g)).toBe(1);
  });
  it('normalizes partner pairs', () => {
    expect(normalizePair('b', 'a')).toEqual(['a', 'b']);
  });
});

describe('partial dates', () => {
  it('validates completeness and calendar', () => {
    expect(isPartialDateValid({ year: 1920, month: null, day: null, approximate: true })).toBe(
      true,
    );
    expect(isPartialDateValid({ year: null, month: 3, day: null, approximate: false })).toBe(false);
    expect(isPartialDateValid({ year: 1921, month: 2, day: 30, approximate: false })).toBe(false);
  });
  it('formats approximate dates', () => {
    expect(formatPartialDate({ year: 1920, month: null, day: null, approximate: true })).toBe(
      'taxm. 1920',
    );
    expect(formatPartialDate({ year: null, month: null, day: null, approximate: false })).toBe(
      "Noma'lum",
    );
  });
});

describe('roles', () => {
  it('ranks roles', () => {
    expect(hasRole('ADMIN', 'EDITOR')).toBe(true);
    expect(hasRole('VIEWER', 'EDITOR')).toBe(false);
    expect(hasRole(null, 'VIEWER')).toBe(false);
    expect(assignableRoles('ADMIN')).not.toContain('ADMIN');
  });
});

describe('person schema', () => {
  it('accepts minimal historical records', () => {
    const r = personCreateSchema.safeParse({ givenName: 'Ota' });
    expect(r.success).toBe(true);
  });
  it('rejects a living person with a death date', () => {
    const r = personCreateSchema.safeParse({
      givenName: 'X',
      isLiving: true,
      death: { year: 1990 },
    });
    expect(r.success).toBe(false);
  });
});
