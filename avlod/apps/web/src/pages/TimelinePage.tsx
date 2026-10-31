import { useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Clock3, MapPin, Pencil, Plus, Trash2 } from 'lucide-react';
import {
  formatPartialDate,
  hasRole,
  LABELS,
  TIMELINE_EVENT_TYPES,
  type TimelineEventDTO,
} from '@avlod/shared';
import type { FamilyOutletContext } from '../layouts/FamilyLayout';
import { useFamilyMutation, usePeople, useTimeline } from '../services/queries';
import { TimelineReveal } from '../features/landing/TimelineReveal';
import { Button, IconButton } from '../components/ui/Button';
import { ConfirmDialog, Dialog } from '../components/ui/Dialog';
import { Checkbox, Input, Select, Textarea } from '../components/ui/Field';
import { Badge, EmptyState, ErrorState, FormError, Spinner } from '../components/ui/States';
import { api, errorMessage } from '../lib/api';

export function TimelinePage() {
  const { family } = useOutletContext<FamilyOutletContext>();
  const events = useTimeline(family.id);
  const [editing, setEditing] = useState<TimelineEventDTO | 'new' | null>(null);
  const [deleting, setDeleting] = useState<TimelineEventDTO | null>(null);
  const canEdit = hasRole(family.role, 'EDITOR');
  const del = useFamilyMutation(family.id, (id: string) =>
    api.delete(`/families/${family.id}/timeline/${id}`),
  );

  if (events.isLoading) return <Spinner />;
  if (events.error) return <ErrorState error={events.error} onRetry={() => events.refetch()} />;
  const list = events.data ?? [];

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Oila xronikasi</p>
          <h2 className="mt-2 font-serif text-4xl text-parchment">Avlodlar yo‘li</h2>
        </div>
        {canEdit && (
          <Button icon={<Plus className="h-4 w-4" />} onClick={() => setEditing('new')}>
            Voqea qo‘shish
          </Button>
        )}
      </div>

      {list.length === 0 ? (
        <EmptyState icon={<Clock3 className="h-6 w-6" />} title="Tarix hali yozilmagan">
          Tug‘ilishlar, to‘ylar, ko‘chishlar va yutuqlarni qo‘shib, oilaning yo‘lini chizing.
        </EmptyState>
      ) : (
        <TimelineReveal
          revealKey={list.map((e) => e.id).join()}
          className="relative mt-12 pl-8 sm:pl-12"
        >
          <span
            data-spine
            className="absolute left-2 top-0 h-full w-px bg-gradient-to-b from-gold-400/70 via-gold-400/30 to-transparent sm:left-4"
            aria-hidden
          />
          <ol className="space-y-10">
            {list.map((e) => (
              <li key={e.id} data-reveal className="relative">
                <span
                  className="absolute -left-[29px] top-2 h-3 w-3 rounded-full border border-gold-400 bg-ink-900 shadow-[0_0_0_4px_rgba(213,177,107,0.08)] sm:-left-[37px]"
                  aria-hidden
                />
                <article className="group rounded-2xl border border-white/[0.06] bg-ink-800/50 p-5 transition-colors hover:border-gold-400/30">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-serif text-3xl text-gold-300">
                        {e.date.year ? `${e.date.approximate ? '~' : ''}${e.date.year}` : '—'}
                      </p>
                      <p className="text-xs text-sage-500">{formatPartialDate(e.date)}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Badge>{LABELS.timelineEvent[e.type]}</Badge>
                      {canEdit && (
                        <>
                          <IconButton
                            label="Tahrirlash"
                            className="h-8 w-8"
                            onClick={() => setEditing(e)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </IconButton>
                          <IconButton
                            label="O‘chirish"
                            className="h-8 w-8 hover:text-danger"
                            onClick={() => setDeleting(e)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </IconButton>
                        </>
                      )}
                    </div>
                  </div>
                  <h3 className="mt-3 font-serif text-2xl text-parchment">{e.title}</h3>
                  {e.description && (
                    <p className="mt-2 leading-relaxed text-sage-300">{e.description}</p>
                  )}
                  <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-sage-400">
                    {e.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" /> {e.location}
                      </span>
                    )}
                    {e.person && (
                      <Link
                        to={`../people/${e.person.id}`}
                        relative="path"
                        className="text-gold-300 hover:underline"
                      >
                        {e.person.fullName}
                      </Link>
                    )}
                    {e.isDemo && <Badge tone="warn">Namuna</Badge>}
                  </div>
                </article>
              </li>
            ))}
          </ol>
        </TimelineReveal>
      )}

      {editing && (
        <EventDialog
          familyId={family.id}
          event={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
        />
      )}
      <ConfirmDialog
        open={deleting !== null}
        title="Voqeani o‘chirasizmi?"
        message={<p>“{deleting?.title}” xronikadan olib tashlanadi.</p>}
        confirmLabel="O‘chirish"
        loading={del.isPending}
        onConfirm={async () => {
          await del.mutateAsync(deleting!.id).catch(() => undefined);
          setDeleting(null);
        }}
        onClose={() => setDeleting(null)}
      />
    </div>
  );
}

const yearField = z
  .string()
  .trim()
  .refine(
    (v) => v === '' || (/^\d{1,4}$/.test(v) && +v >= 1 && +v <= 2200),
    'Yilni to‘g‘ri kiriting',
  );
const monthField = z
  .string()
  .trim()
  .refine((v) => v === '' || (/^\d{1,2}$/.test(v) && +v >= 1 && +v <= 12), '1–12');
const schema = z.object({
  title: z.string().trim().min(1, 'Sarlavhani kiriting').max(160),
  description: z.string().max(8000),
  type: z.enum(TIMELINE_EVENT_TYPES),
  year: yearField,
  month: monthField,
  approximate: z.boolean(),
  location: z.string().max(160),
  personId: z.string(),
});
type Values = z.infer<typeof schema>;

function EventDialog({
  familyId,
  event,
  onClose,
}: {
  familyId: string;
  event: TimelineEventDTO | null;
  onClose: () => void;
}) {
  const people = usePeople(familyId, { pageSize: 100, sort: 'name' });
  const [error, setError] = useState<string | null>(null);
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: event?.title ?? '',
      description: event?.description ?? '',
      type: event?.type ?? 'FAMILY',
      year: event?.date.year ? String(event.date.year) : '',
      month: event?.date.month ? String(event.date.month) : '',
      approximate: event?.date.approximate ?? false,
      location: event?.location ?? '',
      personId: event?.person?.id ?? '',
    },
  });
  const save = useFamilyMutation(familyId, (v: Values) => {
    const body = {
      title: v.title,
      description: v.description || null,
      type: v.type,
      date: {
        year: v.year ? +v.year : null,
        month: v.year && v.month ? +v.month : null,
        day: null,
        approximate: v.approximate,
      },
      location: v.location || null,
      personId: v.personId || null,
    };
    return event
      ? api.patch(`/families/${familyId}/timeline/${event.id}`, body)
      : api.post(`/families/${familyId}/timeline`, body);
  });
  const submit = form.handleSubmit(async (v) => {
    try {
      await save.mutateAsync(v);
      onClose();
    } catch (e) {
      setError(errorMessage(e));
    }
  });
  const e = form.formState.errors;
  return (
    <Dialog
      open
      onClose={onClose}
      title={event ? 'Voqeani tahrirlash' : 'Yangi voqea'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Bekor qilish
          </Button>
          <Button loading={save.isPending} onClick={submit}>
            Saqlash
          </Button>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4" noValidate>
        <FormError message={error} />
        <Input
          label="Sarlavha *"
          data-autofocus
          {...form.register('title')}
          error={e.title?.message}
        />
        <div className="grid gap-4 sm:grid-cols-3">
          <Select label="Turi" {...form.register('type')}>
            {TIMELINE_EVENT_TYPES.map((t) => (
              <option key={t} value={t}>
                {LABELS.timelineEvent[t]}
              </option>
            ))}
          </Select>
          <Input
            label="Yil"
            inputMode="numeric"
            {...form.register('year')}
            error={e.year?.message}
          />
          <Input
            label="Oy"
            inputMode="numeric"
            {...form.register('month')}
            error={e.month?.message}
          />
        </div>
        <Checkbox label="Sana taxminiy" {...form.register('approximate')} />
        <Input label="Joy" {...form.register('location')} />
        <Select label="Bog‘liq inson" {...form.register('personId')}>
          <option value="">— Yo‘q —</option>
          {people.data?.data.map((p) => (
            <option key={p.id} value={p.id}>
              {p.fullName}
            </option>
          ))}
        </Select>
        <Textarea label="Tavsif" rows={4} {...form.register('description')} />
      </form>
    </Dialog>
  );
}
