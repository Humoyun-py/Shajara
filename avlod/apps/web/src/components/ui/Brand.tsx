import { useState } from 'react';
import type { MediaDTO, Sex } from '@avlod/shared';
import { cn, initials } from '../../lib/utils';

/** Custom tree mark: a trunk splitting into three generations of branches, roots below. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={cn('h-8 w-8', className)} aria-hidden>
      <g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
        <path d="M20 33V18" />
        <path d="M20 24c-4.5-1.2-7.5-4.6-8.3-9M20 21c4.5-1.2 7.5-4.6 8.3-9M20 18c-1.3-3.8-.8-7.6 0-10" />
        <path d="M20 33c-2.8 0-5.6 1.4-7.6 3M20 33c2.8 0 5.6 1.4 7.6 3M20 33v3.5" opacity=".55" />
      </g>
      <circle cx="11.7" cy="15" r="2.1" fill="currentColor" />
      <circle cx="28.3" cy="12" r="2.1" fill="currentColor" />
      <circle cx="20" cy="7.6" r="2.1" fill="currentColor" />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2.5 text-gold-400', className)}>
      <LogoMark />
      <span className="font-serif text-[22px] font-semibold tracking-[0.28em] text-parchment">
        AVLOD
      </span>
    </span>
  );
}

const tone: Record<Sex, string> = {
  MALE: 'from-[#22392E] to-[#14231C]',
  FEMALE: 'from-[#3A3226] to-[#1E1B15]',
  OTHER: 'from-[#2B3333] to-[#161D1C]',
  UNKNOWN: 'from-[#262E29] to-[#151C18]',
};

/** Portrait photo, or an engraved-style monogram when no photo exists. */
export function Portrait({
  name,
  media,
  sex = 'UNKNOWN',
  size = 56,
  className,
  deceased,
}: {
  name: string;
  media?: MediaDTO | null;
  sex?: Sex;
  size?: number;
  className?: string;
  deceased?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const showImg = media && media.kind === 'IMAGE' && !failed;
  return (
    <span
      className={cn(
        'relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border bg-gradient-to-br',
        deceased ? 'border-sage-500/40' : 'border-gold-400/40',
        tone[sex],
        className,
      )}
      style={{ width: size, height: size }}
    >
      {showImg ? (
        <img
          src={media.url}
          alt=""
          loading="lazy"
          onError={() => setFailed(true)}
          className={cn('h-full w-full object-cover', deceased && 'grayscale-[35%]')}
        />
      ) : (
        <span
          className="font-serif font-medium text-gold-200/90"
          style={{ fontSize: size * 0.36 }}
          aria-hidden
        >
          {initials(name) || '?'}
        </span>
      )}
    </span>
  );
}
