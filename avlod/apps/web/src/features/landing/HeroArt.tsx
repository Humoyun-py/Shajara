import { memo } from 'react';

/** Deterministic pseudo-random generator so the artwork is identical on every render. */
function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

const W = 1600;
const H = 1000;
const GROUND = 812;

// Canopy clusters of an ancient chinor (plane tree): broad, layered, slightly asymmetric.
const clusters: [number, number, number][] = [
  [800, 300, 150],
  [610, 360, 130],
  [990, 350, 140],
  [470, 440, 105],
  [1135, 430, 115],
  [700, 230, 110],
  [900, 220, 115],
  [560, 280, 90],
  [1050, 270, 95],
  [800, 400, 120],
  [380, 510, 70],
  [1240, 500, 80],
];

const canopy = (() => {
  const r = rng(7);
  const out: { x: number; y: number; r: number; lit: boolean }[] = [];
  for (const [cx, cy, cr] of clusters) {
    const count = Math.round(cr / 4);
    for (let i = 0; i < count; i++) {
      const a = r() * Math.PI * 2;
      // Bias towards the rim so the silhouette is leafy rather than round.
      const d = Math.pow(r(), 0.45) * cr * 0.85;
      const x = cx + Math.cos(a) * d * 1.3;
      const y = cy + Math.sin(a) * d * 0.66;
      // Leaves facing the warm afterglow (right, upper) catch a rim of light.
      out.push({
        x,
        y,
        r: 14 + r() * 30,
        lit: Math.cos(a) > 0.2 && Math.sin(a) < 0.1 && d > cr * 0.55,
      });
    }
  }
  return out.sort((a, b) => a.y - b.y);
})();

const stars = (() => {
  const r = rng(42);
  return Array.from({ length: 90 }, () => ({
    x: r() * W,
    y: r() * 420,
    r: 0.4 + r() * 1.3,
    o: 0.2 + r() * 0.6,
    tw: r() > 0.85,
  }));
})();

// Branches: from trunk top outwards to cluster centres.
const branches: [string, number][] = [
  ['M790 560 C 760 470 700 420 610 370', 18],
  ['M805 560 C 840 470 920 410 990 360', 18],
  ['M780 600 C 700 540 580 500 470 445', 14],
  ['M820 600 C 920 540 1040 500 1135 440', 14],
  ['M795 520 C 790 420 760 320 700 240', 12],
  ['M808 520 C 830 420 860 320 900 230', 12],
  ['M785 640 C 640 600 480 560 380 515', 9],
  ['M815 640 C 980 600 1140 560 1240 505', 9],
  ['M800 500 C 800 420 800 360 800 300', 14],
];

/**
 * Layered illustration used behind the hero. Each layer carries `data-depth` so the hero can
 * apply subtle GSAP parallax (transform only).
 */
export const HeroArt = memo(function HeroArt({ className }: { className?: string }) {
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid slice"
      className={className}
      role="img"
      aria-label="Oqshom yorug‘ida qadimiy chinor daraxti"
    >
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#06100D" />
          <stop offset="0.45" stopColor="#0C1C16" />
          <stop offset="0.72" stopColor="#1B2A1F" />
          <stop offset="0.86" stopColor="#3A3420" />
          <stop offset="1" stopColor="#1A1A12" />
        </linearGradient>
        <radialGradient id="glow" cx="0.62" cy="0.8" r="0.5">
          <stop offset="0" stopColor="#E9C784" stopOpacity="0.55" />
          <stop offset="0.35" stopColor="#D5B16B" stopOpacity="0.18" />
          <stop offset="1" stopColor="#D5B16B" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="farHill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#24372B" />
          <stop offset="1" stopColor="#101E17" />
        </linearGradient>
        <linearGradient id="nearHill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#14241C" />
          <stop offset="1" stopColor="#09130F" />
        </linearGradient>
        {/* One gradient across the whole canopy so leaf masses merge into a single crown. */}
        <linearGradient
          id="leaf"
          gradientUnits="userSpaceOnUse"
          x1="1250"
          y1="150"
          x2="350"
          y2="600"
        >
          <stop offset="0" stopColor="#1A2C21" />
          <stop offset="0.45" stopColor="#0E1B15" />
          <stop offset="1" stopColor="#08120E" />
        </linearGradient>
        <linearGradient id="trunk" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#060D0A" />
          <stop offset="0.7" stopColor="#0E1A14" />
          <stop offset="1" stopColor="#3B3322" />
        </linearGradient>
        <filter id="mist" x="-20%" y="-50%" width="140%" height="200%">
          <feGaussianBlur stdDeviation="28" />
        </filter>
        <filter id="soft">
          <feGaussianBlur stdDeviation="1.2" />
        </filter>
      </defs>

      <g data-depth="0.05">
        <rect width={W} height={H} fill="url(#sky)" />
        <rect width={W} height={H} fill="url(#glow)" />
        {stars.map((s, i) => (
          <circle
            key={i}
            cx={s.x}
            cy={s.y}
            r={s.r}
            fill="#F4F0E7"
            opacity={s.o}
            className={s.tw ? 'animate-[twinkle_5s_ease-in-out_infinite]' : undefined}
            style={s.tw ? { animationDelay: `${(i % 7) * 0.7}s` } : undefined}
          />
        ))}
      </g>

      <g data-depth="0.12">
        <path
          d="M0 640 C 160 590 300 610 430 575 C 560 540 650 585 780 560 C 930 530 1050 590 1190 560 C 1330 530 1460 575 1600 548 L1600 1000 L0 1000Z"
          fill="url(#farHill)"
          opacity="0.9"
        />
        <ellipse
          cx="520"
          cy="640"
          rx="520"
          ry="46"
          fill="#A8B4AA"
          opacity="0.07"
          filter="url(#mist)"
        />
      </g>

      <g data-depth="0.2">
        <path
          d="M0 720 C 200 680 360 700 520 690 C 700 678 820 712 1000 698 C 1180 684 1330 715 1600 690 L1600 1000 L0 1000Z"
          fill="url(#nearHill)"
        />
      </g>

      <g data-depth="0.32">
        {/* The tree sits right of centre so the headline keeps open sky on the left. */}
        <g transform="translate(230 0)">
          {/* roots and trunk */}
          <path
            d="M742 812 C 760 760 772 700 770 640 C 768 590 776 545 790 500 L 812 500 C 826 545 834 595 832 640 C 830 700 842 760 862 812 C 900 818 940 826 980 840 L 620 840 C 660 826 700 818 742 812 Z"
            fill="url(#trunk)"
          />
          <path
            d="M770 812 C 720 822 680 832 600 846 M836 812 C 890 822 930 834 1010 848"
            stroke="#0A1410"
            strokeWidth="10"
            strokeLinecap="round"
            fill="none"
          />
          {branches.map(([d, w]) => (
            <path
              key={d}
              d={d}
              stroke="#0A1511"
              strokeWidth={w}
              strokeLinecap="round"
              fill="none"
            />
          ))}
          {/* Rim light: a gold disc slightly offset behind each lit leaf mass leaves a thin crescent. */}
          {canopy.map((c, i) =>
            c.lit ? (
              <circle
                key={`rim-${i}`}
                cx={c.x + 3}
                cy={c.y - 3}
                r={c.r}
                fill="#D5B16B"
                opacity="0.16"
                filter="url(#soft)"
              />
            ) : null,
          )}
          {canopy.map((c, i) => (
            <circle key={i} cx={c.x} cy={c.y} r={c.r} fill="url(#leaf)" />
          ))}
        </g>
      </g>

      <g data-depth="0.45">
        <path
          d="M0 830 C 260 800 520 822 800 812 C 1080 802 1340 826 1600 806 L1600 1000 L0 1000Z"
          fill="#050C0A"
        />
        <ellipse
          cx="1000"
          cy="800"
          rx="700"
          ry="50"
          fill="#C4CEC5"
          opacity="0.06"
          filter="url(#mist)"
        />
      </g>
      <rect y={GROUND} width={W} height={H - GROUND} fill="#050C0A" opacity="0.4" />
    </svg>
  );
});
