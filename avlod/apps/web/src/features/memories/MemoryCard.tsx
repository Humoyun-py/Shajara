import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ChevronLeft, ChevronRight, MapPin, Play, ScrollText, X } from 'lucide-react';
import { formatPartialDate, LABELS, type MemoryDTO, type MemoryEventType } from '@avlod/shared';
import { Badge } from '../../components/ui/States';
import { cn } from '../../lib/utils';

/** Text-only memories get a tonal plate instead of a photo, so stories read as first-class items. */
const plates: Record<MemoryEventType, string> = {
  BIRTH: 'from-[#2C3A2E] via-[#1A261F] to-[#0F1814]',
  WEDDING: 'from-[#3B3022] via-[#231D16] to-[#120F0B]',
  GRADUATION: 'from-[#243641] via-[#17232A] to-[#0D1418]',
  MIGRATION: 'from-[#33322A] via-[#1F1E19] to-[#11110E]',
  CELEBRATION: 'from-[#3A2C24] via-[#231A15] to-[#120E0B]',
  WORK: 'from-[#2A3330] via-[#1A211F] to-[#0E1312]',
  EVERYDAY: 'from-[#28352B] via-[#18221B] to-[#0E1510]',
  HISTORIC: 'from-[#3A3424] via-[#232016] to-[#12100B]',
  OTHER: 'from-[#2A302C] via-[#191E1B] to-[#0E1210]',
};

export function MemoryCard({
  memory,
  onOpen,
  tall,
}: {
  memory: MemoryDTO;
  onOpen: () => void;
  tall?: boolean;
}) {
  const m = memory;
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group relative block w-full overflow-hidden rounded-2xl border border-white/[0.07] bg-ink-800 text-left shadow-soft transition-[border-color,transform] duration-500 hover:-translate-y-0.5 hover:border-gold-400/40"
    >
      <div className={cn('relative overflow-hidden', tall ? 'aspect-[3/4]' : 'aspect-[4/3]')}>
        {m.media?.kind === 'IMAGE' ? (
          <img
            src={m.media.url}
            alt={m.caption ?? m.title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-[1.2s] ease-out group-hover:scale-[1.04]"
          />
        ) : m.media?.kind === 'VIDEO' ? (
          <div className="relative h-full w-full bg-ink-950">
            <video
              src={m.media.url}
              preload="metadata"
              muted
              className="h-full w-full object-cover opacity-80"
            />
            <span className="absolute inset-0 flex items-center justify-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-full border border-gold-400/60 bg-ink-900/70 text-gold-300">
                <Play className="h-5 w-5" />
              </span>
            </span>
          </div>
        ) : (
          <div
            className={cn(
              'flex h-full w-full flex-col bg-gradient-to-br p-6 pb-28',
              plates[m.eventType],
            )}
          >
            <ScrollText className="h-6 w-6 shrink-0 text-gold-400/50" aria-hidden />
            {/* Leave the lower band free for the title overlay. */}
            <p className="mt-5 line-clamp-3 max-w-md font-serif text-lg italic leading-snug text-sage-300/90 sm:text-xl">
              “{m.description ?? m.title}”
            </p>
          </div>
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink-950/90 via-ink-950/10 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gold-400">
            {formatPartialDate(m.date)} · {LABELS.memoryEvent[m.eventType]}
          </p>
          <h3 className="mt-1 font-serif text-2xl leading-tight text-parchment">{m.title}</h3>
        </div>
      </div>
    </button>
  );
}

/** Accessible lightbox: Esc closes, arrow keys navigate, focus returns to the gallery. */
export function Lightbox({
  memories,
  index,
  onIndex,
}: {
  memories: MemoryDTO[];
  index: number | null;
  onIndex: (i: number | null) => void;
}) {
  const reduce = useReducedMotion();
  const m = index !== null ? memories[index] : undefined;
  useEffect(() => {
    if (index === null) return;
    const opener = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onIndex(null);
      if (e.key === 'ArrowRight') onIndex((index + 1) % memories.length);
      if (e.key === 'ArrowLeft') onIndex((index - 1 + memories.length) % memories.length);
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
      opener?.focus?.();
    };
  }, [index, memories.length, onIndex]);

  return createPortal(
    <AnimatePresence>
      {m && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label={m.title}
          className="fixed inset-0 z-[70] flex flex-col bg-ink-950/95 backdrop-blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="flex items-center justify-between px-4 py-3 sm:px-8">
            <span className="text-xs text-sage-500">
              {index! + 1} / {memories.length}
            </span>
            <button
              type="button"
              autoFocus
              onClick={() => onIndex(null)}
              aria-label="Yopish"
              className="flex h-11 w-11 items-center justify-center rounded-full text-parchment hover:bg-white/10"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
          <div className="relative flex min-h-0 flex-1 flex-col items-center gap-6 overflow-y-auto px-4 pb-8 lg:flex-row lg:items-stretch lg:px-16">
            <motion.div
              key={m.id}
              className="flex min-h-[40vh] flex-1 items-center justify-center"
              initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
            >
              {m.media?.kind === 'IMAGE' ? (
                <img
                  src={m.media.url}
                  alt={m.caption ?? m.title}
                  className="max-h-[75vh] max-w-full rounded-xl object-contain shadow-lift"
                />
              ) : m.media?.kind === 'VIDEO' ? (
                <video src={m.media.url} controls className="max-h-[75vh] max-w-full rounded-xl" />
              ) : (
                <blockquote
                  className={cn(
                    'max-w-2xl rounded-3xl bg-gradient-to-br p-10 font-serif text-3xl italic leading-snug text-sage-300',
                    plates[m.eventType],
                  )}
                >
                  “{m.description ?? m.title}”
                </blockquote>
              )}
            </motion.div>
            <aside className="w-full max-w-md shrink-0 space-y-4 lg:pt-10">
              <p className="eyebrow">{formatPartialDate(m.date)}</p>
              <h2 className="font-serif text-4xl leading-tight text-parchment">{m.title}</h2>
              {m.location && (
                <p className="flex items-center gap-2 text-sm text-sage-400">
                  <MapPin className="h-4 w-4" /> {m.location}
                </p>
              )}
              {m.caption && <p className="text-sm italic text-sage-300">{m.caption}</p>}
              {m.media && m.description && (
                <p className="leading-relaxed text-sage-300">{m.description}</p>
              )}
              {m.provenance && (
                <p className="rounded-xl border border-white/10 px-4 py-3 text-xs text-sage-400">
                  <span className="block font-semibold uppercase tracking-[0.18em] text-sage-500">
                    Manba
                  </span>
                  {m.provenance}
                </p>
              )}
              {m.people.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {m.people.map((p) => (
                    <Badge key={p.id}>{p.fullName}</Badge>
                  ))}
                </div>
              )}
              {m.isDemo && <Badge tone="warn">Namuna ma’lumot</Badge>}
            </aside>
            {memories.length > 1 && (
              <>
                <button
                  type="button"
                  aria-label="Oldingi"
                  onClick={() => onIndex((index! - 1 + memories.length) % memories.length)}
                  className="fixed bottom-4 left-4 flex h-12 w-12 items-center sm:bottom-auto sm:left-3 sm:top-1/2 sm:-translate-y-1/2 justify-center rounded-full border border-white/10 bg-ink-900/70 text-parchment hover:border-gold-400/60 sm:flex"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  aria-label="Keyingi"
                  onClick={() => onIndex((index! + 1) % memories.length)}
                  className="fixed bottom-4 right-4 flex h-12 w-12 items-center sm:bottom-auto sm:right-3 sm:top-1/2 sm:-translate-y-1/2 justify-center rounded-full border border-white/10 bg-ink-900/70 text-parchment hover:border-gold-400/60 sm:flex"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
