import { useRef, useState } from 'react';
import { Link, useNavigate, useOutletContext, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Camera, GitFork, MapPin, Pencil } from 'lucide-react';
import { formatPartialDate, hasRole, LABELS } from '@avlod/shared';
import type { FamilyOutletContext } from '../layouts/FamilyLayout';
import { useMemories, usePerson, useTimeline, useFamilyMutation } from '../services/queries';
import { Portrait } from '../components/ui/Brand';
import { Button, buttonClass } from '../components/ui/Button';
import { Badge, ErrorState, FormError, Spinner } from '../components/ui/States';
import { PersonFormDialog } from '../features/people/PersonForm';
import { PersonPanel } from '../features/people/PersonPanel';
import { RelationshipEditor } from '../features/people/RelationshipEditor';
import { MemoryCard, Lightbox } from '../features/memories/MemoryCard';
import { api, errorMessage } from '../lib/api';

export function PersonProfilePage() {
  const { family } = useOutletContext<FamilyOutletContext>();
  const { personId = '' } = useParams();
  const profile = usePerson(family.id, personId);
  const memories = useMemories(family.id, { personId });
  const events = useTimeline(family.id, { personId });
  const [editing, setEditing] = useState(false);
  const [lightbox, setLightbox] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const canEdit = hasRole(family.role, 'EDITOR');
  const upload = useFamilyMutation(family.id, (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return api.upload(`/families/${family.id}/people/${personId}/portrait`, form);
  });

  if (profile.isLoading) return <Spinner />;
  if (profile.error || !profile.data)
    return <ErrorState error={profile.error} onRetry={() => profile.refetch()} />;
  const { person, generation, photos } = profile.data;
  const deceased = person.isLiving === false || person.death.year !== null;
  const mem = memories.data?.data ?? [];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <Link
        to="../people"
        relative="path"
        className="inline-flex items-center gap-2 text-sm text-sage-400 hover:text-parchment"
      >
        <ArrowLeft className="h-4 w-4" /> Qarindoshlar
      </Link>

      <motion.header
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mt-6 grid gap-8 md:grid-cols-[auto_1fr]"
      >
        <div className="relative w-fit">
          <Portrait
            name={person.fullName}
            media={person.portrait}
            sex={person.sex}
            size={168}
            deceased={deceased}
            className="border-2"
          />
          {canEdit && (
            <>
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/avif"
                className="sr-only"
                aria-label="Portret yuklash"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setUploadError(null);
                  try {
                    await upload.mutateAsync(file);
                  } catch (err) {
                    setUploadError(errorMessage(err));
                  }
                  e.target.value = '';
                }}
              />
              <Button
                size="sm"
                variant="secondary"
                className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-ink-800"
                loading={upload.isPending}
                icon={<Camera className="h-4 w-4" />}
                onClick={() => fileRef.current?.click()}
              >
                Portret
              </Button>
            </>
          )}
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap gap-2">
            {generation !== null && <Badge tone="gold">{generation + 1}-avlod</Badge>}
            {person.branchLabel && <Badge>{person.branchLabel}</Badge>}
            {person.isDemo && <Badge tone="warn">Namuna ma’lumot</Badge>}
            {person.redacted && <Badge>Maxfiylik uchun qisqartirilgan</Badge>}
          </div>
          <h1 className="mt-3 font-serif text-5xl leading-[1.05] text-parchment md:text-6xl">
            {person.fullName}
          </h1>
          {person.maidenName && (
            <p className="mt-1 text-sage-400">Qizlik familiyasi: {person.maidenName}</p>
          )}
          <dl className="mt-5 grid gap-x-10 gap-y-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-sage-500">Tug‘ilgan</dt>
              <dd className="text-parchment">
                {formatPartialDate(person.birth)}
                {person.birthPlace && (
                  <span className="ml-2 inline-flex items-center gap-1 text-sage-400">
                    <MapPin className="h-3.5 w-3.5" /> {person.birthPlace}
                  </span>
                )}
              </dd>
            </div>
            {(deceased || person.isLiving === null) && (
              <div>
                <dt className="text-sage-500">Vafot etgan</dt>
                <dd className="text-parchment">
                  {person.death.year
                    ? formatPartialDate(person.death)
                    : person.isLiving === null
                      ? 'Ma’lumot yo‘q'
                      : 'Sana noma’lum'}
                  {person.deathPlace && (
                    <span className="ml-2 text-sage-400">{person.deathPlace}</span>
                  )}
                </dd>
              </div>
            )}
            {person.occupation && (
              <div>
                <dt className="text-sage-500">Kasbi</dt>
                <dd className="text-parchment">{person.occupation}</dd>
              </div>
            )}
            <div>
              <dt className="text-sage-500">Jinsi</dt>
              <dd className="text-parchment">{LABELS.sex[person.sex]}</dd>
            </div>
          </dl>
          <div className="mt-6 flex flex-wrap gap-2">
            <Link
              to={`../tree?person=${person.id}&root=${person.id}`}
              relative="path"
              className={buttonClass('secondary', 'sm')}
            >
              <GitFork className="h-4 w-4" /> Shajarada ko‘rish
            </Link>
            {canEdit && (
              <Button
                size="sm"
                variant="secondary"
                icon={<Pencil className="h-4 w-4" />}
                onClick={() => setEditing(true)}
              >
                Tahrirlash
              </Button>
            )}
          </div>
          <div className="mt-4">
            <FormError message={uploadError} />
          </div>
        </div>
      </motion.header>

      <div className="mt-12 grid gap-8 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-8">
          {person.biography && (
            <section>
              <h2 className="eyebrow mb-3">Hayot hikoyasi</h2>
              <p className="whitespace-pre-line font-serif text-xl leading-relaxed text-sage-300">
                {person.biography}
              </p>
            </section>
          )}
          {person.achievements.length > 0 && (
            <section>
              <h2 className="eyebrow mb-3">Yutuqlar</h2>
              <ul className="space-y-2">
                {person.achievements.map((a) => (
                  <li key={a} className="flex gap-3 text-sage-300">
                    <span
                      className="mt-2.5 h-1 w-1 shrink-0 rounded-full bg-gold-400"
                      aria-hidden
                    />
                    {a}
                  </li>
                ))}
              </ul>
            </section>
          )}
          {person.notes && (
            <section className="rounded-2xl border border-dashed border-white/10 p-5">
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-sage-500">
                Ichki izohlar
              </h2>
              <p className="whitespace-pre-line text-sm text-sage-400">{person.notes}</p>
            </section>
          )}

          <section>
            <h2 className="eyebrow mb-4">Hayotidagi muhim voqealar</h2>
            {events.data?.length ? (
              <ol className="relative space-y-5 border-l border-gold-400/25 pl-6">
                {events.data.map((e) => (
                  <li key={e.id} className="relative">
                    <span
                      className="absolute -left-[29px] top-1.5 h-2.5 w-2.5 rounded-full border border-gold-400 bg-ink-900"
                      aria-hidden
                    />
                    <p className="text-xs text-gold-400">{formatPartialDate(e.date)}</p>
                    <p className="text-parchment">{e.title}</p>
                    {e.description && <p className="text-sm text-sage-400">{e.description}</p>}
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-sm text-sage-500">Hozircha voqealar qo‘shilmagan.</p>
            )}
          </section>

          <section>
            <h2 className="eyebrow mb-4">Xotiralar va suratlar</h2>
            {mem.length ? (
              <ul className="grid gap-4 sm:grid-cols-2">
                {mem.map((m, i) => (
                  <li key={m.id}>
                    <MemoryCard memory={m} onOpen={() => setLightbox(i)} />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-sage-500">Bu shaxs belgilangan xotiralar yo‘q.</p>
            )}
            {photos.length > 0 && (
              <ul className="mt-6 grid grid-cols-3 gap-2 sm:grid-cols-4">
                {photos.map((ph) => (
                  <li
                    key={ph.id}
                    className="aspect-square overflow-hidden rounded-xl border border-white/10"
                  >
                    <img
                      src={ph.media.url}
                      alt={ph.caption ?? `${person.fullName} surati`}
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <aside className="space-y-8">
          <div className="panel overflow-hidden">
            <PersonPanel
              familyId={family.id}
              personId={person.id}
              role={null}
              onSelect={(id) => navigate(`../${id}`, { relative: 'path' })}
            />
          </div>
          {canEdit && <RelationshipEditor familyId={family.id} profile={profile.data} />}
        </aside>
      </div>

      <PersonFormDialog
        familyId={family.id}
        open={editing}
        onClose={() => setEditing(false)}
        person={person}
        canSeeNotes={canEdit}
      />
      <Lightbox memories={mem} index={lightbox} onIndex={setLightbox} />
    </div>
  );
}
