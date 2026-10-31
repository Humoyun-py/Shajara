import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Database, GitFork, Lock, Users } from 'lucide-react';
import { formatPartialDate, LABELS, type MemoryEventType } from '@avlod/shared';
import { SiteNav } from '../layouts/SiteNav';
import { SiteFooter } from '../layouts/SiteFooter';
import { Hero, CountUp } from '../features/landing/Hero';
import { Showcase } from '../features/landing/Showcase';
import { TimelineReveal } from '../features/landing/TimelineReveal';
import { MemoryCard, Lightbox } from '../features/memories/MemoryCard';
import { PersonPanel } from '../features/people/PersonPanel';
import { Drawer } from '../components/ui/Dialog';
import { buttonClass } from '../components/ui/Button';
import { Badge, Skeleton } from '../components/ui/States';
import { LogoMark } from '../components/ui/Brand';
import { useAuth } from '../features/auth/AuthProvider';
import {
  useDemo,
  useDemoMemories,
  useDemoTimeline,
  useFamilies,
  useStats,
  useTree,
} from '../services/queries';
import { cn } from '../lib/utils';

const reveal = {
  initial: { opacity: 0, y: 28 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-12%' },
  transition: { duration: 0.9, ease: [0.22, 1, 0.36, 1] },
} as const;

function SectionHeading({
  eyebrow,
  title,
  children,
  id,
}: {
  eyebrow: string;
  title: string;
  children?: React.ReactNode;
  id: string;
}) {
  return (
    <motion.div {...reveal} className="max-w-2xl">
      <p className="eyebrow">{eyebrow}</p>
      <h2
        id={id}
        className="mt-4 font-serif text-[clamp(2.2rem,4.5vw,3.8rem)] leading-[1.04] text-parchment"
      >
        {title}
      </h2>
      {children && <p className="mt-5 text-[17px] leading-relaxed text-sage-400">{children}</p>}
    </motion.div>
  );
}

export function LandingPage() {
  const { status } = useAuth();
  const demo = useDemo();
  const demoReady = Boolean(demo.data);
  const tree = useTree('demo', {}, true);
  const timeline = useDemoTimeline(demoReady);
  const memories = useDemoMemories(demoReady);
  const families = useFamilies(status === 'authenticated');
  const myFamily = status === 'authenticated' ? families.data?.[0] : undefined;
  const myStats = useStats(myFamily?.id ?? '');
  const [selected, setSelected] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<number | null>(null);
  const [filter, setFilter] = useState<MemoryEventType | 'ALL'>('ALL');

  // Real numbers only: the signed-in user's family, otherwise the clearly labelled demo family.
  const stats = myFamily && myStats.data ? myStats.data : (demo.data?.stats ?? null);
  const statsLabel = myFamily && myStats.data ? myFamily.name : 'Namuna oila (to‘qima)';
  const primaryTo = myFamily ? `/family/${myFamily.id}/tree` : '#shajara';
  const secondaryTo = status === 'authenticated' ? '/dashboard' : '/register';

  const memList = useMemo(() => memories.data ?? [], [memories.data]);
  const filtered = useMemo(
    () => (filter === 'ALL' ? memList : memList.filter((m) => m.eventType === filter)),
    [memList, filter],
  );
  const types = useMemo(() => [...new Set(memList.map((m) => m.eventType))], [memList]);

  return (
    <div className="bg-ink-900">
      <a
        href="#shajara"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[70] focus:rounded-full focus:bg-gold-400 focus:px-4 focus:py-2 focus:text-ink-900"
      >
        Asosiy mazmunga o‘tish
      </a>
      <SiteNav />
      <main>
        <Hero
          stats={stats}
          statsLabel={statsLabel}
          primaryTo={primaryTo.startsWith('#') ? '/#shajara' : primaryTo}
          secondaryTo={secondaryTo}
        />

        {/* C. Heritage showcase */}
        <section
          id="shajara"
          aria-labelledby="showcase-title"
          className="relative scroll-mt-20 py-28 sm:py-36"
        >
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold-400/30 to-transparent"
            aria-hidden
          />
          <div className="container-x">
            <div className="flex flex-wrap items-end justify-between gap-6">
              <SectionHeading
                id="showcase-title"
                eyebrow="Shajara"
                title="Besh avlod. Bitta ildiz."
              >
                Har bir inson — tugun, har bir chiziq — rishta. Istalgan ismni tanlang va uning
                hikoyasini oching.
              </SectionHeading>
              {demo.data && (
                <Badge tone="warn" className="mb-2">
                  {demo.data.family.name} — to‘qima namunaviy ma’lumotlar
                </Badge>
              )}
            </div>
            <div className="mt-14 rounded-[28px] border border-white/[0.06] bg-gradient-to-b from-ink-850 to-ink-900 p-4 sm:p-8">
              {tree.data ? (
                <Showcase tree={tree.data} onSelect={setSelected} />
              ) : tree.isLoading || demo.isLoading ? (
                <Skeleton className="h-[420px]" />
              ) : (
                <DemoUnavailable />
              )}
            </div>
            <div className="mt-6 flex flex-wrap items-center gap-6 text-xs text-sage-500">
              <span className="flex items-center gap-2">
                <span className="h-px w-8 bg-gold-400/70" /> Biologik
              </span>
              <span className="flex items-center gap-2">
                <span className="h-px w-8 border-t border-dashed border-gold-400/70" /> Asrab
                olingan / boshqa
              </span>
              <span className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rotate-45 border border-gold-400" /> Juftlik
              </span>
            </div>
          </div>
        </section>

        {/* D. Our story */}
        <section
          id="tarix"
          aria-labelledby="story-title"
          className="relative scroll-mt-20 overflow-hidden bg-ink-850 py-28 sm:py-36"
        >
          <div
            className="pointer-events-none absolute -left-40 top-20 h-96 w-96 rounded-full bg-gold-400/[0.05] blur-3xl"
            aria-hidden
          />
          <div className="container-x grid gap-16 lg:grid-cols-[0.8fr_1.2fr]">
            <div className="lg:sticky lg:top-28 lg:self-start">
              <SectionHeading
                id="story-title"
                eyebrow="Oila tarixi"
                title="Bir asrlik yo‘l — kun-ba-kun."
              >
                Marg‘ilondagi tut bog‘idan Toshkentdagi raqamli arxivgacha. Muhim sanalar,
                ko‘chishlar va yutuqlar bir xronikada.
              </SectionHeading>
            </div>
            {timeline.data?.length ? (
              <TimelineReveal revealKey={timeline.data.length} className="relative pl-10">
                <span
                  data-spine
                  className="absolute left-3 top-2 h-full w-px origin-top bg-gradient-to-b from-gold-400/80 via-gold-400/30 to-transparent"
                  aria-hidden
                />
                <ol className="space-y-12">
                  {timeline.data.map((e) => (
                    <li key={e.id} data-reveal className="relative">
                      <span
                        className="absolute -left-[34px] top-3 h-3 w-3 rounded-full border border-gold-400 bg-ink-850"
                        aria-hidden
                      />
                      <p className="font-serif text-5xl leading-none text-gold-300/90">
                        {e.date.year ? `${e.date.approximate ? '~' : ''}${e.date.year}` : '—'}
                      </p>
                      <h3 className="mt-3 font-serif text-2xl text-parchment">{e.title}</h3>
                      {e.description && (
                        <p className="mt-2 max-w-lg leading-relaxed text-sage-400">
                          {e.description}
                        </p>
                      )}
                      <p className="mt-2 text-xs uppercase tracking-[0.18em] text-sage-500">
                        {LABELS.timelineEvent[e.type]}
                        {e.location ? ` · ${e.location}` : ''}
                        {e.person ? ` · ${e.person.fullName}` : ''}
                      </p>
                    </li>
                  ))}
                </ol>
              </TimelineReveal>
            ) : demo.error ? (
              <DemoUnavailable />
            ) : (
              <Skeleton className="h-[480px]" />
            )}
          </div>
        </section>

        {/* E. Memories */}
        <section
          id="xotiralar"
          aria-labelledby="memories-title"
          className="scroll-mt-20 py-28 sm:py-36"
        >
          <div className="container-x">
            <SectionHeading
              id="memories-title"
              eyebrow="Xotiralar"
              title="Har bir surat ortida — hikoya."
            >
              Suratlar, videolar va og‘zaki rivoyatlar manbasi bilan birga saqlanadi: kim, qachon,
              qayerda — va kim aytib bergan.
            </SectionHeading>
            {types.length > 1 && (
              <div
                role="toolbar"
                aria-label="Xotiralarni saralash"
                className="mt-10 flex flex-wrap gap-2"
              >
                {(['ALL', ...types] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    aria-pressed={filter === t}
                    onClick={() => setFilter(t)}
                    className={cn(
                      'rounded-full border px-4 py-2 text-xs tracking-wide transition-colors',
                      filter === t
                        ? 'border-gold-400 bg-gold-400 text-ink-900'
                        : 'border-white/10 text-sage-400 hover:border-gold-400/40 hover:text-parchment',
                    )}
                  >
                    {t === 'ALL' ? 'Barchasi' : LABELS.memoryEvent[t]}
                  </button>
                ))}
              </div>
            )}
            {filtered.length ? (
              <motion.ul layout className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-12">
                {filtered.map((m, i) => (
                  <motion.li
                    layout
                    key={m.id}
                    className={cn(
                      i % 6 === 0
                        ? 'lg:col-span-7'
                        : i % 6 === 1
                          ? 'lg:col-span-5'
                          : 'lg:col-span-4',
                    )}
                    initial={{ opacity: 0, y: 24 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-8%' }}
                    transition={{ duration: 0.7, delay: (i % 3) * 0.08 }}
                  >
                    <MemoryCard memory={m} onOpen={() => setLightbox(i)} />
                    <p className="mt-2 px-1 text-xs text-sage-500">
                      {formatPartialDate(m.date)}
                      {m.location ? ` · ${m.location}` : ''}
                    </p>
                  </motion.li>
                ))}
              </motion.ul>
            ) : demo.error ? (
              <div className="mt-10">
                <DemoUnavailable />
              </div>
            ) : (
              <div className="mt-10 grid gap-5 sm:grid-cols-3">
                <Skeleton className="aspect-[4/3]" />
                <Skeleton className="aspect-[4/3]" />
                <Skeleton className="aspect-[4/3]" />
              </div>
            )}
          </div>
        </section>

        {/* F. Statistics */}
        {stats && (
          <section
            aria-labelledby="stats-title"
            className="border-y border-white/[0.06] bg-ink-850 py-20"
          >
            <div className="container-x">
              <h2 id="stats-title" className="sr-only">
                Statistika
              </h2>
              <dl className="grid grid-cols-2 gap-y-12 md:grid-cols-4">
                {(
                  [
                    [stats.familyMembers, 'Oila a’zolari', Users],
                    [stats.generations, 'Avlodlar', GitFork],
                    [stats.branches, 'Oila tarmoqlari', LogoMarkIcon],
                    [stats.memories, 'Arxivlangan xotiralar', Database],
                  ] as const
                ).map(([v, l, Icon], i) => (
                  <motion.div
                    key={l}
                    {...reveal}
                    transition={{ ...reveal.transition, delay: i * 0.08 }}
                    className="border-l border-gold-400/20 pl-6"
                  >
                    <Icon className="h-5 w-5 text-gold-400/70" aria-hidden />
                    <dd className="mt-4 font-serif text-6xl text-parchment">
                      <CountUp value={v} />
                    </dd>
                    <dt className="mt-1 text-sm text-sage-400">{l}</dt>
                  </motion.div>
                ))}
              </dl>
              <p className="mt-10 text-xs text-sage-500">
                Manba: {statsLabel}. Raqamlar ma’lumotlar bazasidan hisoblanadi.
              </p>
            </div>
          </section>
        )}

        {/* About + closing */}
        <section
          id="biz-haqimizda"
          aria-labelledby="about-title"
          className="relative scroll-mt-20 overflow-hidden py-28 sm:py-40"
        >
          <div
            className="pointer-events-none absolute left-1/2 top-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gold-400/[0.06] blur-3xl"
            aria-hidden
          />
          <div className="container-x relative grid gap-16 lg:grid-cols-2">
            <SectionHeading
              id="about-title"
              eyebrow="Biz haqimizda"
              title="Xotira — eng qimmat meros."
            >
              Bobolarimizning ismlari ko‘pincha bir avlod ichida unutiladi. AVLOD ularni
              ehtiyotkorlik bilan saqlash uchun yaratilgan: aniqligi noma’lum sanalar uchun ham,
              murakkab oilaviy rishtalar uchun ham joy bor.
            </SectionHeading>
            <motion.ul {...reveal} className="grid gap-4 self-end sm:grid-cols-2">
              {[
                [
                  Lock,
                  'Sukut bo‘yicha shaxsiy',
                  'Faqat taklif qilingan qarindoshlar ko‘radi; rollar serverda tekshiriladi.',
                ],
                [
                  GitFork,
                  'Har qanday oila tuzilmasi',
                  'Asrab olingan, o‘gay va vasiylik rishtalari aniq belgilanadi.',
                ],
                [
                  Database,
                  'Manbali tarix',
                  'Taxminiy sanalar va tasdiqlanmagan rishtalar ochiq belgilanadi.',
                ],
                [
                  Users,
                  'Butun avlod birga',
                  'Oila a’zolari birgalikda to‘ldiradi, har o‘zgarish jurnalda.',
                ],
              ].map(([Icon, t, d]) => {
                const I = Icon as typeof Lock;
                return (
                  <li
                    key={t as string}
                    className="rounded-2xl border border-white/[0.07] bg-ink-800/50 p-5"
                  >
                    <I className="h-5 w-5 text-gold-400" aria-hidden />
                    <h3 className="mt-3 font-serif text-xl text-parchment">{t as string}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-sage-400">{d as string}</p>
                  </li>
                );
              })}
            </motion.ul>
          </div>
          <motion.div {...reveal} className="container-x relative mt-28 text-center">
            <LogoMark className="mx-auto h-12 w-12 text-gold-400" />
            <p className="mx-auto mt-8 max-w-3xl font-serif text-[clamp(2rem,4vw,3.4rem)] italic leading-tight text-parchment">
              Bugun yozilmagan hikoya ertaga yo‘qoladi. Oilangiz tarixini hozir saqlang.
            </p>
            <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
              <Link to={secondaryTo} className={buttonClass('primary', 'lg')}>
                Oila tarixini yaratish
              </Link>
              <Link to="/privacy" className={buttonClass('secondary', 'lg')}>
                Maxfiylik qanday ta’minlanadi
              </Link>
            </div>
          </motion.div>
        </section>
      </main>
      <SiteFooter />

      <Drawer open={Boolean(selected)} onClose={() => setSelected(null)} title="Namuna profil">
        {selected && demo.data && (
          <PersonPanel
            familyId={demo.data.family.id}
            personId={selected}
            role={null}
            demo
            onSelect={setSelected}
          />
        )}
      </Drawer>
      <Lightbox memories={filtered} index={lightbox} onIndex={setLightbox} />
    </div>
  );
}

function LogoMarkIcon({ className }: { className?: string }) {
  return <LogoMark className={className} />;
}

function DemoUnavailable() {
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-center">
      <p className="font-serif text-2xl text-parchment">Namuna ma’lumotlar hali yuklanmagan</p>
      <p className="max-w-md text-sm text-sage-400">
        Mahalliy muhitda{' '}
        <code className="rounded bg-ink-950 px-1.5 py-0.5 text-gold-200">npm run db:seed</code>{' '}
        buyrug‘ini ishga tushiring yoki o‘z oilangizni yarating.
      </p>
      <Link to="/register" className={buttonClass('secondary', 'sm', 'mt-2')}>
        Boshlash
      </Link>
    </div>
  );
}
