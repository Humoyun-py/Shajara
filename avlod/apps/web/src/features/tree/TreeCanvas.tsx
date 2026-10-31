import { useEffect, useMemo, useRef } from 'react';
import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type NodeMouseHandler,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import type { TreeDTO } from '@avlod/shared';
import { usePrefersReducedMotion } from '../../hooks/useReducedMotion';
import { layoutTree, PERSON_H, PERSON_W, type PersonNode } from './layout';
import { nodeTypes, TreeActionsContext } from './nodes';

interface Props {
  tree: TreeDTO;
  selectedId: string | null;
  onSelect: (personId: string) => void;
  onExpand: (personId: string) => void;
  dimmedIds?: Set<string>;
  highlightIds?: Set<string>;
  /** Person to centre on when it changes (search result, restored selection). */
  focusId?: string | null;
  showMiniMap?: boolean;
}

function Canvas({
  tree,
  selectedId,
  onSelect,
  onExpand,
  dimmedIds,
  highlightIds,
  focusId,
  showMiniMap = true,
}: Props) {
  const reduce = usePrefersReducedMotion();
  const flow = useReactFlow();
  const { nodes, edges } = useMemo(
    () => layoutTree(tree, { dimmedIds, highlightIds }),
    [tree, dimmedIds, highlightIds],
  );
  const withSelection = useMemo(
    () => nodes.map((n) => (n.id === selectedId ? { ...n, selected: true } : n)),
    [nodes, selectedId],
  );

  const fittedFor = useRef<string | null>(null);
  useEffect(() => {
    // Refit when a different window of the tree arrives, not on every selection.
    const key = `${tree.rootId}:${tree.persons.length}`;
    if (fittedFor.current === key) return;
    fittedFor.current = key;
    const id = requestAnimationFrame(
      () => void flow.fitView({ padding: 0.15, duration: reduce ? 0 : 600, maxZoom: 1.1 }),
    );
    return () => cancelAnimationFrame(id);
  }, [tree, flow, reduce]);

  useEffect(() => {
    if (!focusId) return;
    const node = nodes.find((n) => n.id === focusId);
    if (!node) return;
    void flow.setCenter(node.position.x + PERSON_W / 2, node.position.y + PERSON_H / 2, {
      zoom: 1,
      duration: reduce ? 0 : 700,
    });
  }, [focusId, nodes, flow, reduce]);

  const onNodeClick: NodeMouseHandler = (_e, node) => {
    if (node.type === 'person') onSelect(node.id);
  };

  const actions = useMemo(() => ({ expand: onExpand }), [onExpand]);

  return (
    <TreeActionsContext.Provider value={actions}>
      <ReactFlow
        nodes={withSelection}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodeClick={onNodeClick}
        onNodesChange={undefined}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable
        onlyRenderVisibleElements
        minZoom={0.15}
        maxZoom={1.8}
        proOptions={{ hideAttribution: false }}
        aria-label="Oila shajarasi"
        onNodeDoubleClick={onNodeClick}
        // Keyboard: Tab to a person, Enter to open their profile.
        onKeyDown={(e) => {
          const target = e.target as HTMLElement;
          const id = target.closest('[data-id]')?.getAttribute('data-id');
          if (e.key === 'Enter' && id && !id.startsWith('u:')) onSelect(id);
        }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={28}
          size={1}
          color="rgba(213,177,107,0.12)"
        />
        <Controls
          showInteractive={false}
          position="bottom-right"
          aria-label="Masshtab boshqaruvi"
        />
        {showMiniMap && (
          <MiniMap
            pannable
            zoomable
            position="bottom-left"
            nodeColor={(n) =>
              n.type === 'union'
                ? 'transparent'
                : (n as PersonNode).data.dimmed
                  ? '#1c2f26'
                  : '#d5b16b'
            }
            nodeStrokeWidth={0}
            maskColor="rgba(7,17,14,0.75)"
          />
        )}
      </ReactFlow>
    </TreeActionsContext.Provider>
  );
}

export function TreeCanvas(props: Props) {
  return (
    <ReactFlowProvider>
      <Canvas {...props} />
    </ReactFlowProvider>
  );
}
