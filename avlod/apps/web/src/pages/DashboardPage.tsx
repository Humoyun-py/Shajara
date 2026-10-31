import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowUpRight, Plus, TreePine } from 'lucide-react';
import { LABELS } from '@avlod/shared';
import { useAuth } from '../features/auth/AuthProvider';
import { useFamilies, useFamilyMutation, useStats } from '../services/queries';
import { Button } from '../components/ui/Button';
import { Dialog } from '../components/ui/Dialog';
import { Input, Textarea } from '../components/ui/Field';
import { Badge, EmptyState, ErrorState, FormError, Skeleton } from '../components/ui/States';
import { api, errorMessage } from '../lib/api';

export function DashboardPage() {
  const { user } = useAuth();
  const families = useFamilies();
  const [creating, setCreating] = useState(false);
  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <p className="eyebrow">Xush kelibsiz</p>
        <h1 className="mt-2 font-serif text-5xl text-parchment">{user?.displayName}</h1>
        <p className="mt-2 max-w-xl text-sage-400">
          Oila ish maydonlaringiz — har biri shaxsiy va faqat taklif qilingan qarindoshlarga ochiq.
        </p>
      </motion.div>
      <div className="mt-10 flex items-center justify-between">
        <h2 className="font-serif text-2xl text-parchment">Oilalarim</h2>
        <Button icon={<Plus className="h-4 w-4" />} onClick={() => setCreating(true)}>
          Yangi oila
        </Button>
      </div>
      <div className="mt-6">
        {families.isLoading ? (
          <div className="grid gap-5 md:grid-cols-2">
            <Skeleton className="h-56" />
            <Skeleton className="h-56" />
          </div>
        ) : families.error ? (
          <ErrorState error={families.error} onRetry={() => families.refetch()} />
        ) : !families.data?.length ? (
          <EmptyState
            icon={<TreePine className="h-6 w-6" />}
            title="Birinchi shajarangizni yarating"
            action={<Button onClick={() => setCreating(true)}>Oila yaratish</Button>}
          >
            Oila ish maydonini yarating, keyin qarindoshlarni qo‘shing va ularni taklif qiling. Agar
            sizni taklif qilishgan bo‘lsa, emaildagi havolani oching.
          </EmptyState>
        ) : (
          <ul className="grid gap-5 md:grid-cols-2">
            {families.data.map((f, i) => (
              <motion.li
                key={f.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06, duration: 0.5 }}
              >
                <FamilyCard
                  id={f.id}
                  name={f.name}
                  description={f.description}
                  role={f.role}
                  isDemo={f.isDemo}
                  members={f.memberCount}
                />
              </motion.li>
            ))}
          </ul>
        )}
      </div>
      <CreateFamilyDialog open={creating} onClose={() => setCreating(false)} />
    </div>
  );
}

function FamilyCard({
  id,
  name,
  description,
  role,
  isDemo,
  members,
}: {
  id: string;
  name: string;
  description: string | null;
  role: keyof typeof LABELS.role | null;
  isDemo: boolean;
  members: number;
}) {
  const stats = useStats(id);
  return (
    <Link
      to={`/family/${id}/tree`}
      className="group relative block overflow-hidden rounded-3xl border border-white/[0.07] bg-gradient-to-br from-ink-700 to-ink-850 p-7 transition-colors hover:border-gold-400/40"
    >
      <div
        className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-gold-400/[0.06] blur-3xl transition-opacity group-hover:opacity-150"
        aria-hidden
      />
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap gap-2">
            {role && <Badge tone="gold">{LABELS.role[role]}</Badge>}
            {isDemo && <Badge tone="warn">Namuna</Badge>}
            <Badge>{members} a’zo</Badge>
          </div>
          <h3 className="mt-4 font-serif text-3xl text-parchment">{name}</h3>
          {description && <p className="mt-2 line-clamp-2 text-sm text-sage-400">{description}</p>}
        </div>
        <ArrowUpRight
          className="h-5 w-5 shrink-0 text-sage-500 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-gold-300"
          aria-hidden
        />
      </div>
      <dl className="mt-8 grid grid-cols-4 gap-3 border-t border-white/[0.06] pt-5">
        {(
          [
            ['Kishilar', stats.data?.familyMembers],
            ['Avlod', stats.data?.generations],
            ['Tarmoq', stats.data?.branches],
            ['Xotira', stats.data?.memories],
          ] as const
        ).map(([l, v]) => (
          <div key={l}>
            <dd className="font-serif text-2xl text-gold-300">{v ?? '—'}</dd>
            <dt className="text-[11px] uppercase tracking-[0.15em] text-sage-500">{l}</dt>
          </div>
        ))}
      </dl>
    </Link>
  );
}

function CreateFamilyDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const create = useFamilyMutation('none', () =>
    api.post<{ id: string }>('/families', { name, description: description || null }),
  );
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Yangi oila ish maydoni"
      description="Siz egasi bo‘lasiz. Ish maydoni sukut bo‘yicha shaxsiy."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Bekor qilish
          </Button>
          <Button
            loading={create.isPending}
            disabled={name.trim().length < 2}
            onClick={async () => {
              setError(null);
              try {
                const f = await create.mutateAsync(undefined);
                onClose();
                navigate(`/family/${f.id}/tree`);
              } catch (e) {
                setError(errorMessage(e));
              }
            }}
          >
            Yaratish
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <FormError message={error} />
        <Input
          label="Oila nomi"
          placeholder="Masalan: Yusupovlar oilasi"
          data-autofocus
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Textarea
          label="Qisqacha tavsif"
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
    </Dialog>
  );
}
