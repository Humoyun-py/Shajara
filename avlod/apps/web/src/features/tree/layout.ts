import dagre from '@dagrejs/dagre';
import type { Edge, Node } from '@xyflow/react';
import type { TreeDTO } from '@avlod/shared';

export const PERSON_W = 236;
export const PERSON_H = 92;
const UNION_SIZE = 14;

export type TreePerson = TreeDTO['persons'][number];

export interface PersonNodeData extends Record<string, unknown> {
  person: TreePerson;
  dimmed: boolean;
  highlighted: boolean;
  expandUp: boolean;
  expandDown: boolean;
  isRoot: boolean;
}

export type PersonNode = Node<PersonNodeData, 'person'>;
export type UnionNode = Node<{ status: string }, 'union'>;

/**
 * Lays out the tree automatically. Each partnership becomes a small "union" node between
 * the partners; children shared by that couple hang from it. Children with only one known
 * parent (or extra adoptive/step parents) connect directly. Dagre ranks the result so the
 * layout stays readable for any family shape — nothing is positioned by hand.
 */
export function layoutTree(
  tree: TreeDTO,
  opts: { dimmedIds?: Set<string>; highlightIds?: Set<string>; direction?: 'TB' | 'LR' } = {},
): { nodes: (PersonNode | UnionNode)[]; edges: Edge[] } {
  const g = new dagre.graphlib.Graph();
  const direction = opts.direction ?? 'TB';
  g.setGraph({ rankdir: direction, nodesep: 36, ranksep: 44, marginx: 40, marginy: 40 });
  g.setDefaultEdgeLabel(() => ({}));

  const personIds = new Set(tree.persons.map((p) => p.id));
  const expandable = new Map(tree.expandable.map((e) => [e.personId, e]));
  for (const p of tree.persons) g.setNode(p.id, { width: PERSON_W, height: PERSON_H });

  const edges: Edge[] = [];
  const unionByPair = new Map<string, string>();
  const pairKey = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);

  for (const u of tree.unions) {
    if (!personIds.has(u.partnerAId) || !personIds.has(u.partnerBId)) continue;
    const id = `u:${u.id}`;
    unionByPair.set(pairKey(u.partnerAId, u.partnerBId), id);
    g.setNode(id, { width: UNION_SIZE, height: UNION_SIZE });
    for (const partner of [u.partnerAId, u.partnerBId]) {
      g.setEdge(partner, id, { weight: 4, minlen: 1 });
      edges.push({
        id: `${id}-${partner}`,
        source: partner,
        target: id,
        type: 'smoothstep',
        className: 'union-edge',
        style: { stroke: 'rgba(213,177,107,0.35)', strokeWidth: 1.25 },
        focusable: false,
      });
    }
  }

  const parentsByChild = new Map<string, TreeDTO['parentLinks']>();
  for (const l of tree.parentLinks) {
    if (!personIds.has(l.parentId) || !personIds.has(l.childId)) continue;
    const list = parentsByChild.get(l.childId) ?? [];
    list.push(l);
    parentsByChild.set(l.childId, list);
  }

  for (const [childId, links] of parentsByChild) {
    const used = new Set<string>();
    // Prefer hanging the child from a couple's union node.
    outer: for (let i = 0; i < links.length; i++) {
      for (let j = i + 1; j < links.length; j++) {
        const unionId = unionByPair.get(pairKey(links[i]!.parentId, links[j]!.parentId));
        if (unionId) {
          const nonBio = links[i]!.type !== 'BIOLOGICAL' || links[j]!.type !== 'BIOLOGICAL';
          g.setEdge(unionId, childId, { weight: 2, minlen: 1 });
          edges.push(
            parentEdge(
              `${unionId}-${childId}`,
              unionId,
              childId,
              nonBio,
              links[i]!.verification !== 'VERIFIED',
            ),
          );
          used.add(links[i]!.id).add(links[j]!.id);
          break outer;
        }
      }
    }
    for (const l of links) {
      if (used.has(l.id)) continue;
      g.setEdge(l.parentId, childId, { weight: 1, minlen: 2 });
      edges.push(
        parentEdge(
          l.id,
          l.parentId,
          childId,
          l.type !== 'BIOLOGICAL',
          l.verification !== 'VERIFIED',
        ),
      );
    }
  }

  dagre.layout(g);

  const nodes: (PersonNode | UnionNode)[] = [];
  for (const p of tree.persons) {
    const pos = g.node(p.id);
    const exp = expandable.get(p.id);
    nodes.push({
      id: p.id,
      type: 'person',
      position: { x: pos.x - PERSON_W / 2, y: pos.y - PERSON_H / 2 },
      data: {
        person: p,
        dimmed: opts.dimmedIds?.has(p.id) ?? false,
        highlighted: opts.highlightIds?.has(p.id) ?? false,
        expandUp: Boolean(exp?.up),
        expandDown: Boolean(exp?.down),
        isRoot: tree.rootId === p.id,
      },
      width: PERSON_W,
      height: PERSON_H,
    });
  }
  for (const u of tree.unions) {
    const id = `u:${u.id}`;
    const pos = g.hasNode(id) ? g.node(id) : null;
    if (!pos) continue;
    nodes.push({
      id,
      type: 'union',
      position: { x: pos.x - UNION_SIZE / 2, y: pos.y - UNION_SIZE / 2 },
      data: { status: u.status },
      selectable: false,
      draggable: false,
      focusable: false,
      width: UNION_SIZE,
      height: UNION_SIZE,
    });
  }
  return { nodes, edges };
}

function parentEdge(
  id: string,
  source: string,
  target: string,
  nonBiological: boolean,
  unverified: boolean,
): Edge {
  return {
    id,
    source,
    target,
    type: 'smoothstep',
    focusable: false,
    style: {
      stroke: unverified ? 'rgba(168,180,170,0.45)' : 'rgba(213,177,107,0.6)',
      strokeWidth: 1.4,
      strokeDasharray: nonBiological ? '6 5' : undefined,
    },
  };
}
