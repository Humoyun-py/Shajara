import { useLayoutEffect, useRef, type ReactNode } from 'react';
import { gsap, prefersReducedMotion } from './gsap';

/**
 * Scroll-linked reveal for timeline entries: the spine draws downward and each
 * `[data-reveal]` child fades up as it enters. No scroll hijacking — scrolling stays native.
 */
export function TimelineReveal({
  children,
  className,
  revealKey,
}: {
  children: ReactNode;
  className?: string;
  /** Re-run when the list changes. */ revealKey?: unknown;
}) {
  const root = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (!root.current || prefersReducedMotion()) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        '[data-spine]',
        { scaleY: 0 },
        {
          scaleY: 1,
          ease: 'none',
          transformOrigin: 'top center',
          scrollTrigger: { trigger: root.current, start: 'top 75%', end: 'bottom 70%', scrub: 0.6 },
        },
      );
      gsap.utils.toArray<HTMLElement>('[data-reveal]').forEach((el) => {
        gsap.from(el, {
          opacity: 0,
          y: 36,
          duration: 0.9,
          ease: 'power3.out',
          scrollTrigger: { trigger: el, start: 'top 85%', toggleActions: 'play none none reverse' },
        });
      });
    }, root);
    return () => ctx.revert();
  }, [revealKey]);
  return (
    <div ref={root} className={className}>
      {children}
    </div>
  );
}
