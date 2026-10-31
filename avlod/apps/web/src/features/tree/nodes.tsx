import { createContext, memo, useContext } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { formatLifespan } from '@avlod/shared';
import { Portrait } from '../../components/ui/Brand';
import { cn } from '../../lib/utils';
import type { PersonNode, UnionNode } from './layout';

/** Actions available to nodes, provided by the canvas (nodes render inside its subtree). */
export const TreeActionsContext = createContext<{ expand?: (personId: string) => void }>({});

export const PersonNodeView = memo(function PersonNodeView({
  data,
  selected,
}: NodeProps<PersonNode>) {
  const actions = useContext(TreeActionsContext);
  const p = data.person;
  const deceased = p.isLiving === false || p.death.year !== null;
  return (
    <div
      className={cn(
        'group relative flex h-[92px] w-[236px] items-center gap-3 rounded-2xl border bg-ink-800/95 px-3.5 shadow-soft transition-[opacity,border-color,box-shadow,transform] duration-300',
        selected
          ? 'border-gold-400 shadow-[0_0_0_4px_rgba(213,177,107,0.15)]'
          : 'border-white/10 hover:border-gold-400/50',
        data.highlighted && !selected && 'border-gold-300/80',
        data.dimmed && 'opacity-30',
        data.isRoot && 'ring-1 ring-gold-400/30',
      )}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!h-1.5 !w-1.5 !border-0 !bg-gold-400/50"
        isConnectable={false}
      />
      <Portrait name={p.fullName} media={p.portrait} sex={p.sex} size={52} deceased={deceased} />
      <div className="min-w-0 flex-1">
        <p className="truncate font-serif text-[17px] leading-tight text-parchment">
          {p.givenName} {p.familyName}
        </p>
        <p className="mt-0.5 truncate text-xs text-sage-400">
          {formatLifespan(p.birth, p.death, p.isLiving)}
        </p>
        <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-gold-400/80">
          {p.generation + 1}-avlod
        </p>
      </div>
      {data.expandUp && (
        <button
          type="button"
          className="nodrag absolute -top-3 left-1/2 flex h-6 w-6 -translate-x-1/2 items-center justify-center rounded-full border border-gold-400/50 bg-ink-900 text-gold-300 hover:bg-gold-400 hover:text-ink-900"
          aria-label={`${p.fullName}: ajdodlarni yuklash`}
          onClick={(e) => {
            e.stopPropagation();
            actions.expand?.(p.id);
          }}
        >
          <ChevronUp className="h-3.5 w-3.5" />
        </button>
      )}
      {data.expandDown && (
        <button
          type="button"
          className="nodrag absolute -bottom-3 left-1/2 flex h-6 w-6 -translate-x-1/2 items-center justify-center rounded-full border border-gold-400/50 bg-ink-900 text-gold-300 hover:bg-gold-400 hover:text-ink-900"
          aria-label={`${p.fullName}: avlodlarni yuklash`}
          onClick={(e) => {
            e.stopPropagation();
            actions.expand?.(p.id);
          }}
        >
          <ChevronDown className="h-3.5 w-3.5" />
        </button>
      )}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!h-1.5 !w-1.5 !border-0 !bg-gold-400/50"
        isConnectable={false}
      />
    </div>
  );
});

export const UnionNodeView = memo(function UnionNodeView({ data }: NodeProps<UnionNode>) {
  const ended = ['DIVORCED', 'SEPARATED', 'ENDED'].includes(data.status);
  return (
    <div
      className={cn(
        'h-[14px] w-[14px] rotate-45 border bg-ink-900',
        ended ? 'border-sage-500/60' : 'border-gold-400/80',
      )}
      title="Juftlik"
    >
      <Handle type="target" position={Position.Top} className="!opacity-0" isConnectable={false} />
      <Handle
        type="source"
        position={Position.Bottom}
        className="!opacity-0"
        isConnectable={false}
      />
    </div>
  );
});

export const nodeTypes = { person: PersonNodeView, union: UnionNodeView };
