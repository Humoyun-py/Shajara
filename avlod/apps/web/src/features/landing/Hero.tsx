import { useLayoutEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  animate,
  motion,
  useInView,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from 'framer-motion';
import { ArrowDown } from 'lucide-react';
import type { StatsDTO } from '@avlod/shared';
import { buttonClass } from '../../components/ui/Button';
import { gsap, prefersReducedMotion } from './gsap';
import { HeroArt } from './HeroArt';

const lines = ['Har bir avlod —', 'yangi hikoya.', 'Har bir ildiz —', 'unutilmas tarix.'];

export function Hero({
  stats,
  statsLabel,
  primaryTo,
  secondaryTo,
}: {
  stats: StatsDTO | null;
  statsLabel: string;
  primaryTo: string;
  secondaryTo: string;
}) {
  const root = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();

  // Subtle depth parallax: each SVG layer drifts by its data-depth while the hero scrolls away.
  useLayoutEffect(() => {
    if (!root.current || prefersReducedMotion()) return;
    const ctx = gsap.context(() => {
      gsap.utils.toArray<SVGGElement>('[data-depth]').forEach((layer) => {
        const depth = Number(layer.dataset.depth ?? 0);
        gsap.to(layer, {
          yPercent: depth * 40,
          ease: 'none',
          scrollTrigger: {
            trigger: root.current,
            start: 'top top',
            end: 'bottom top',
            scrub: true,
          },
        });
      });
      gsap.to('[data-hero-copy]', {
        yPercent: -18,
        opacity: 0.2,
        ease: 'none',
        scrollTrigger: { trigger: root.current, start: 'top top', end: 'bottom top', scrub: true },
      });
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={root}
      className="grain relative flex min-h-[100svh] items-end overflow-hidden"
      aria-labelledby="hero-title"
    >
      <div className="absolute inset-0 will-change-transform">
        <HeroArt className="h-full w-full" />
      </div>
      <div
        className="absolute inset-0 bg-gradient-to-b from-ink-900/70 via-ink-900/20 to-ink-900"
        aria-hidden
      />
      <div
        className="absolute inset-0 bg-gradient-to-r from-ink-900/85 via-ink-900/30 to-transparent"
        aria-hidden
      />
      {!reduce && <Dust />}

      <div data-hero-copy className="container-x relative z-10 pb-28 pt-40 sm:pb-36">
        <motion.p
          className="eyebrow"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1 }}
        >
          Bizdan boshlangan tarix
        </motion.p>
        <h1
          id="hero-title"
          className="mt-6 max-w-4xl font-serif text-[clamp(2.6rem,7vw,6.2rem)] font-medium leading-[0.98] tracking-tight text-parchment"
        >
          {lines.map((l, i) => (
            <span key={l} className="block overflow-hidden pb-[0.08em]">
              <motion.span
                className={`block ${i % 2 === 1 ? 'italic text-gold-200/95' : ''}`}
                initial={reduce ? { opacity: 0 } : { y: '105%' }}
                animate={reduce ? { opacity: 1 } : { y: '0%' }}
                transition={{ duration: 1.1, delay: 0.25 + i * 0.12, ease: [0.22, 1, 0.36, 1] }}
              >
                {l}
              </motion.span>
            </span>
          ))}
        </h1>
        <motion.p
          className="mt-8 max-w-xl text-[17px] leading-relaxed text-sage-300"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.85 }}
        >
          AVLOD — ota-bobolarimiz ismlari, hikoyalari va suratlarini bir joyda jamlab, ularni
          farzandlarimiz va nevaralarimizga yetkazadigan oilaviy meros makoni.
        </motion.p>
        <motion.div
          className="mt-10 flex flex-col gap-3 sm:flex-row"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 1 }}
        >
          <Link to={primaryTo} className={buttonClass('primary', 'lg')}>
            Shajaramizni ko‘rish
          </Link>
          <Link to={secondaryTo} className={buttonClass('secondary', 'lg')}>
            Oila tarixini yaratish
          </Link>
        </motion.div>

        {stats && (
          <motion.dl
            className="mt-14 flex flex-wrap gap-x-10 gap-y-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.3, duration: 1 }}
          >
            <Indicator value={stats.familyMembers} label="oila a’zosi" />
            <Indicator value={stats.generations} label="avlod" />
            <Indicator value={stats.memories} label="saqlangan xotira" />
            <div className="self-end text-[11px] uppercase tracking-[0.2em] text-sage-500">
              {statsLabel}
            </div>
          </motion.dl>
        )}
      </div>

      <a
        href="#shajara"
        className="absolute bottom-8 left-1/2 z-10 flex -translate-x-1/2 flex-col items-center gap-2 text-[11px] uppercase tracking-[0.3em] text-sage-400 hover:text-parchment"
      >
        Pastga
        <motion.span
          animate={reduce ? undefined : { y: [0, 6, 0] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
        >
          <ArrowDown className="h-4 w-4" aria-hidden />
        </motion.span>
      </a>
    </section>
  );
}

export function CountUp({ value, className }: { value: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-10% 0px' });
  const mv = useMotionValue(0);
  const rounded = useTransform(mv, (v) => Math.round(v).toLocaleString('uz-UZ'));
  const reduce = useReducedMotion();
  useLayoutEffect(() => {
    if (!inView) return;
    if (reduce) {
      mv.set(value);
      return;
    }
    const controls = animate(mv, value, { duration: 1.6, ease: [0.22, 1, 0.36, 1] });
    return () => controls.stop();
  }, [inView, value, mv, reduce]);
  return (
    <motion.span ref={ref} className={className}>
      {rounded}
    </motion.span>
  );
}

function Indicator({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex items-baseline gap-2">
      <dd className="font-serif text-4xl text-parchment">
        <CountUp value={value} />
      </dd>
      <dt className="text-sm text-sage-400">{label}</dt>
    </div>
  );
}

/** A few slow-drifting motes of light. Pure CSS transforms, disabled for reduced motion. */
function Dust() {
  const motes = Array.from({ length: 14 }, (_, i) => ({
    left: `${(i * 37) % 100}%`,
    top: `${30 + ((i * 53) % 60)}%`,
    delay: `${(i % 7) * 1.6}s`,
    duration: `${14 + (i % 5) * 4}s`,
    size: 2 + (i % 3),
  }));
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden>
      {motes.map((m, i) => (
        <span
          key={i}
          className="absolute rounded-full bg-gold-300/60 shadow-[0_0_8px_rgba(227,200,142,0.8)] animate-[drift_linear_infinite]"
          style={{
            left: m.left,
            top: m.top,
            width: m.size,
            height: m.size,
            animationDelay: m.delay,
            animationDuration: m.duration,
          }}
        />
      ))}
    </div>
  );
}
