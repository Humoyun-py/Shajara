import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ImagePlus } from 'lucide-react';
import {
  ALLOWED_IMAGE_MIME,
  ALLOWED_VIDEO_MIME,
  LABELS,
  MEMORY_EVENT_TYPES,
  type AlbumDTO,
  type MemoryDTO,
} from '@avlod/shared';
import { Dialog } from '../../components/ui/Dialog';
import { Button } from '../../components/ui/Button';
import { Checkbox, Input, Select, Textarea } from '../../components/ui/Field';
import { FormError } from '../../components/ui/States';
import { api, errorMessage } from '../../lib/api';
import { useFamilyMutation, useSearch } from '../../services/queries';

const year = z
  .string()
  .trim()
  .refine(
    (v) => v === '' || (/^\d{1,4}$/.test(v) && +v >= 1 && +v <= 2200),
    'Yilni to‘g‘ri kiriting',
  );
const schema = z.object({
  title: z.string().trim().min(1, 'Sarlavhani kiriting').max(160),
  description: z.string().max(8000),
  eventType: z.enum(MEMORY_EVENT_TYPES),
  year,
  approximate: z.boolean(),
  location: z.string().max(160),
  caption: z.string().max(500),
  provenance: z.string().max(1000),
  albumId: z.string(),
});
type Values = z.infer<typeof schema>;

const MAX_IMAGE = 20 * 1024 * 1024;
const MAX_VIDEO = 200 * 1024 * 1024;
const ACCEPT = [...ALLOWED_IMAGE_MIME, ...ALLOWED_VIDEO_MIME].join(',');

/** Client-side checks mirror the server's limits for fast feedback; the server re-validates file content. */
export function validateFile(file: File): string | null {
  const isImage = (ALLOWED_IMAGE_MIME as readonly string[]).includes(file.type);
  const isVideo = (ALLOWED_VIDEO_MIME as readonly string[]).includes(file.type);
  if (!isImage && !isVideo)
    return 'Faqat JPEG, PNG, WebP, AVIF, GIF rasmlar yoki MP4, WebM, MOV videolar.';
  if (isImage && file.size > MAX_IMAGE) return 'Rasm hajmi 20 MB dan oshmasligi kerak.';
  if (isVideo && file.size > MAX_VIDEO) return 'Video hajmi 200 MB dan oshmasligi kerak.';
  return null;
}

export function MemoryFormDialog({
  familyId,
  open,
  onClose,
  albums,
  memory,
}: {
  familyId: string;
  open: boolean;
  onClose: () => void;
  albums: AlbumDTO[];
  memory?: MemoryDTO | null;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [people, setPeople] = useState<{ id: string; fullName: string }[]>(memory?.people ?? []);
  const [personQuery, setPersonQuery] = useState('');
  const found = useSearch(familyId, personQuery);
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    values: {
      title: memory?.title ?? '',
      description: memory?.description ?? '',
      eventType: memory?.eventType ?? 'OTHER',
      year: memory?.date.year ? String(memory.date.year) : '',
      approximate: memory?.date.approximate ?? false,
      location: memory?.location ?? '',
      caption: memory?.caption ?? '',
      provenance: memory?.provenance ?? '',
      albumId: memory?.albumId ?? '',
    },
  });
  const e = form.formState.errors;

  const save = useFamilyMutation(familyId, async (v: Values) => {
    const data = {
      title: v.title,
      description: v.description || null,
      eventType: v.eventType,
      date: {
        year: v.year ? Number(v.year) : null,
        month: null,
        day: null,
        approximate: v.approximate,
      },
      location: v.location || null,
      caption: v.caption || null,
      provenance: v.provenance || null,
      albumId: v.albumId || null,
      personIds: people.map((p) => p.id),
    };
    if (memory) return api.patch<MemoryDTO>(`/families/${familyId}/memories/${memory.id}`, data);
    if (file) {
      const fd = new FormData();
      fd.append('data', JSON.stringify(data));
      fd.append('file', file);
      return api.upload<MemoryDTO>(`/families/${familyId}/memories`, fd);
    }
    return api.post<MemoryDTO>(`/families/${familyId}/memories`, data);
  });

  const submit = form.handleSubmit(async (v) => {
    setError(null);
    try {
      await save.mutateAsync(v);
      setFile(null);
      setPeople([]);
      form.reset();
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    }
  });

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={memory ? 'Xotirani tahrirlash' : 'Yangi xotira'}
      description="Surat, video yoki shunchaki hikoya — har biri oilaning tarixi."
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Bekor qilish
          </Button>
          <Button onClick={submit} loading={save.isPending}>
            Saqlash
          </Button>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-5" noValidate>
        <FormError message={error} />
        {!memory && (
          <div>
            <label className="flex cursor-pointer flex-col items-center gap-2 rounded-2xl border border-dashed border-gold-400/30 px-6 py-8 text-center text-sm text-sage-400 transition-colors hover:border-gold-400/60 focus-within:ring-2 focus-within:ring-gold-400/40">
              <ImagePlus className="h-6 w-6 text-gold-400" aria-hidden />
              {file ? (
                <span className="text-parchment">{file.name}</span>
              ) : (
                'Rasm yoki video tanlang (ixtiyoriy)'
              )}
              <span className="text-xs text-sage-600">Rasm ≤ 20 MB · Video ≤ 200 MB</span>
              <input
                type="file"
                accept={ACCEPT}
                className="sr-only"
                onChange={(ev) => {
                  const f = ev.target.files?.[0] ?? null;
                  const err = f ? validateFile(f) : null;
                  setFileError(err);
                  setFile(err ? null : f);
                }}
              />
            </label>
            {fileError && (
              <p role="alert" className="mt-2 text-xs text-danger">
                {fileError}
              </p>
            )}
          </div>
        )}
        <Input
          label="Sarlavha *"
          data-autofocus
          {...form.register('title')}
          error={e.title?.message}
        />
        <div className="grid gap-4 sm:grid-cols-3">
          <Select label="Voqea turi" {...form.register('eventType')}>
            {MEMORY_EVENT_TYPES.map((t) => (
              <option key={t} value={t}>
                {LABELS.memoryEvent[t]}
              </option>
            ))}
          </Select>
          <Input
            label="Yil"
            inputMode="numeric"
            {...form.register('year')}
            error={e.year?.message}
          />
          <Input label="Joy" {...form.register('location')} />
        </div>
        <Checkbox label="Sana taxminiy" {...form.register('approximate')} />
        <Textarea label="Hikoya" rows={4} {...form.register('description')} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Surat izohi" {...form.register('caption')} />
          <Select label="Albom" {...form.register('albumId')}>
            <option value="">— Albomsiz —</option>
            {albums.map((a) => (
              <option key={a.id} value={a.id}>
                {a.title}
              </option>
            ))}
          </Select>
        </div>
        <Textarea
          label="Manba (provenance)"
          hint="Surat kimda saqlanadi, qayerdan olingan, kim aytib bergan"
          rows={2}
          {...form.register('provenance')}
        />

        <div className="space-y-2">
          <label htmlFor="mem-people" className="block text-[13px] font-medium text-sage-300">
            Xotiradagi insonlar
          </label>
          <div className="flex flex-wrap gap-1.5">
            {people.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPeople((list) => list.filter((x) => x.id !== p.id))}
                className="rounded-full border border-gold-400/30 bg-gold-400/10 px-3 py-1 text-xs text-gold-200 hover:border-danger/50"
                aria-label={`${p.fullName} — olib tashlash`}
              >
                {p.fullName} ×
              </button>
            ))}
          </div>
          <input
            id="mem-people"
            value={personQuery}
            onChange={(ev) => setPersonQuery(ev.target.value)}
            placeholder="Ism bo‘yicha qo‘shish…"
            className="h-11 w-full rounded-xl border border-white/10 bg-ink-950/60 px-4 text-sm text-parchment focus:border-gold-400/60 focus:outline-none"
          />
          {personQuery.trim().length >= 2 && (
            <ul className="max-h-40 overflow-y-auto rounded-xl border border-white/10 bg-ink-900 p-1">
              {found.data?.people
                .filter((p) => !people.some((x) => x.id === p.id))
                .map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setPeople((list) => [...list, { id: p.id, fullName: p.fullName }]);
                        setPersonQuery('');
                      }}
                      className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-white/[0.05]"
                    >
                      {p.fullName} <span className="text-sage-500">{p.birth.year ?? ''}</span>
                    </button>
                  </li>
                ))}
            </ul>
          )}
        </div>
      </form>
    </Dialog>
  );
}

export function AlbumFormDialog({
  familyId,
  open,
  onClose,
}: {
  familyId: string;
  open: boolean;
  onClose: () => void;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const save = useFamilyMutation(familyId, () =>
    api.post(`/families/${familyId}/albums`, { title, description: description || null }),
  );
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Yangi albom"
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Bekor qilish
          </Button>
          <Button
            loading={save.isPending}
            disabled={!title.trim()}
            onClick={async () => {
              try {
                await save.mutateAsync(undefined);
                setTitle('');
                setDescription('');
                onClose();
              } catch (err) {
                setError(errorMessage(err));
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
          label="Nomi"
          data-autofocus
          value={title}
          onChange={(ev) => setTitle(ev.target.value)}
        />
        <Textarea
          label="Tavsif"
          rows={3}
          value={description}
          onChange={(ev) => setDescription(ev.target.value)}
        />
      </div>
    </Dialog>
  );
}
