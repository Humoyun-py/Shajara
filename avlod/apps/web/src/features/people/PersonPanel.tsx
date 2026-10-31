import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowUpRight, Baby, HeartHandshake, Pencil, Trash2, UserPlus } from 'lucide-react';
import {
  formatPartialDate,
  hasRole,
  LABELS,
  type FamilyRole,
  type PersonSummaryDTO,
} from '@avlod/shared';
import { Portrait } from '../../components/ui/Brand';
import { Badge, ErrorState, Spinner } from '../../components/ui/States';
import { Button, buttonClass } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/Dialog';
import { usePerson, useFamilyMutation } from '../../services/queries';
import { api, ApiError, errorMessage } from '../../lib/api';
import { PersonFormDialog, type RelationKind } from './PersonForm';

interface Props {
  familyId: string;
  personId: string;
  role: FamilyRole | null;
  demo?: boolean;
  onSelect: (personId: string) => void;
  onDeleted?: () => void;
}

/** Profile summary shown beside the tree. Edit controls render only for permitted roles (the API enforces them regardless). */
export function PersonPanel({
  familyId,
  personId,
  role,
  demo = false,
  onSelect,
  onDeleted,
}: Props) {
  const q = usePerson(familyId, personId, demo);
  const [form, setForm] = useState<null | { mode: 'edit' } | { mode: 'add'; kind: RelationKind }>(
    null,
  );
  const [confirm, setConfirm] = useState<null | 'plain' | 'detach'>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const canEdit = !demo && hasRole(role, 'EDITOR');
  const canDelete = !demo && hasRole(role, 'ADMIN');

  const del = useFamilyMutation(familyId, (detach: boolean) =>
    api.delete(`/families/${familyId}/people/${personId}`, {
      query: { detach: detach ? 'true' : undefined },
    }),
  );

  if (q.isLoading) return <Spinner />;
  if (q.error || !q.data) return <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  const { person, relatives, generation } = q.data;
  const deceased = person.isLiving === false || person.death.year !== null;

  const runDelete = async (detach: boolean) => {
    setDeleteError(null);
    try {
      await del.mutateAsync(detach);
      setConfirm(null);
      onDeleted?.();
    } catch (e) {
      if (e instanceof ApiError && e.code === 'HAS_RELATIONSHIPS') setConfirm('detach');
      else setDeleteError(errorMessage(e));
    }
  };

  return (
    <motion.div
      key={personId}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="px-6 pb-10 pt-6"
    >
      <div className="flex items-start gap-5">
        <Portrait
          name={person.fullName}
          media={person.portrait}
          sex={person.sex}
          size={88}
          deceased={deceased}
        />
        <div className="min-w-0 pt-1">
          <h3 className="font-serif text-3xl leading-tight text-parchment">{person.fullName}</h3>
          <p className="mt-1 text-sm text-sage-400">
            {formatPartialDate(person.birth)}
            {(deceased || person.death.year) && ` — ${formatPartialDate(person.death)}`}
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {generation !== null && <Badge tone="gold">{generation + 1}-avlod</Badge>}
            {person.branchLabel && <Badge>{person.branchLabel}</Badge>}
            {person.isDemo && <Badge tone="warn">Namuna</Badge>}
          </div>
        </div>
      </div>

      {person.redacted && (
        <p className="mt-5 rounded-xl border border-white/[0.07] bg-white/[0.02] px-4 py-3 text-xs leading-relaxed text-sage-400">
          Tirik qarindoshning ayrim shaxsiy ma’lumotlari maxfiylik uchun yashirilgan.
        </p>
      )}

      {(person.occupation || person.biography) && (
        <section className="mt-7 space-y-3">
          {person.occupation && <p className="eyebrow">{person.occupation}</p>}
          {person.biography && (
            <p className="text-[15px] leading-relaxed text-sage-300">{person.biography}</p>
          )}
        </section>
      )}

      {person.achievements.length > 0 && (
        <section className="mt-6">
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-sage-500">
            Yutuqlar
          </h4>
          <ul className="space-y-1.5 text-sm text-sage-300">
            {person.achievements.map((a) => (
              <li key={a} className="flex gap-2">
                <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-gold-400" aria-hidden />
                {a}
              </li>
            ))}
          </ul>
        </section>
      )}

      <RelGroup
        title="Ota-onasi"
        people={relatives.parents.map((r) => ({
          p: r.person,
          note:
            r.link.type !== 'BIOLOGICAL'
              ? LABELS.parentType[r.link.type]
              : r.link.verification !== 'VERIFIED'
                ? LABELS.verification[r.link.verification]
                : undefined,
        }))}
        onSelect={onSelect}
      />
      <RelGroup
        title="Turmush o‘rtog‘i"
        people={relatives.partners.map((r) => ({
          p: r.person,
          note: LABELS.unionStatus[r.union.status],
        }))}
        onSelect={onSelect}
      />
      <RelGroup
        title="Aka-uka, opa-singillari"
        people={relatives.siblings.map((r) => ({
          p: r.person,
          note: r.shared === 'HALF' ? 'O‘gay' : r.shared === 'OTHER' ? 'Boshqa' : undefined,
        }))}
        onSelect={onSelect}
      />
      <RelGroup
        title="Farzandlari"
        people={relatives.children.map((r) => ({
          p: r.person,
          note: r.link.type !== 'BIOLOGICAL' ? LABELS.parentType[r.link.type] : undefined,
        }))}
        onSelect={onSelect}
      />

      <div className="mt-8 flex flex-wrap gap-2">
        {!demo && (
          <Link
            to={`/family/${familyId}/people/${personId}`}
            className={buttonClass('secondary', 'sm')}
          >
            To‘liq profil <ArrowUpRight className="h-4 w-4" />
          </Link>
        )}
        {canEdit && (
          <Button
            size="sm"
            variant="secondary"
            icon={<Pencil className="h-4 w-4" />}
            onClick={() => setForm({ mode: 'edit' })}
          >
            Tahrirlash
          </Button>
        )}
      </div>

      {canEdit && (
        <div className="mt-6 grid grid-cols-3 gap-2">
          <AddButton
            icon={<UserPlus className="h-4 w-4" />}
            label="Ota-ona"
            onClick={() => setForm({ mode: 'add', kind: 'PARENT_OF' })}
          />
          <AddButton
            icon={<HeartHandshake className="h-4 w-4" />}
            label="Juft"
            onClick={() => setForm({ mode: 'add', kind: 'PARTNER_OF' })}
          />
          <AddButton
            icon={<Baby className="h-4 w-4" />}
            label="Farzand"
            onClick={() => setForm({ mode: 'add', kind: 'CHILD_OF' })}
          />
        </div>
      )}

      {canDelete && (
        <button
          type="button"
          onClick={() => setConfirm('plain')}
          className="mt-8 inline-flex items-center gap-2 text-xs text-sage-500 transition-colors hover:text-danger"
        >
          <Trash2 className="h-3.5 w-3.5" /> Yozuvni o‘chirish
        </button>
      )}

      {form && (
        <PersonFormDialog
          familyId={familyId}
          open
          onClose={() => setForm(null)}
          person={form.mode === 'edit' ? person : null}
          relation={
            form.mode === 'add' ? { to: personId, toName: person.fullName, kind: form.kind } : null
          }
          onSaved={(id) => form.mode === 'add' && onSelect(id)}
          canSeeNotes={canEdit}
        />
      )}
      <ConfirmDialog
        open={confirm !== null}
        title={confirm === 'detach' ? 'Bog‘lanishlar ham uziladi' : 'Yozuvni o‘chirasizmi?'}
        message={
          confirm === 'detach' ? (
            <>
              <p>
                <strong className="text-parchment">{person.fullName}</strong> boshqa qarindoshlar
                bilan bog‘langan. Davom etsangiz, faqat shu shaxsning bog‘lanishlari uziladi —
                boshqa qarindoshlar o‘chirilmaydi.
              </p>
              <p>Amal audit jurnaliga yoziladi.</p>
            </>
          ) : (
            <p>
              <strong className="text-parchment">{person.fullName}</strong> shajaradan olib
              tashlanadi. Bu amalni ortga qaytarib bo‘lmaydi.
            </p>
          )
        }
        confirmLabel={confirm === 'detach' ? 'Bog‘lanishlar bilan o‘chirish' : 'O‘chirish'}
        loading={del.isPending}
        error={deleteError}
        onConfirm={() => runDelete(confirm === 'detach')}
        onClose={() => {
          setConfirm(null);
          setDeleteError(null);
        }}
      />
    </motion.div>
  );
}

function RelGroup({
  title,
  people,
  onSelect,
}: {
  title: string;
  people: { p: PersonSummaryDTO; note?: string }[];
  onSelect: (id: string) => void;
}) {
  if (!people.length) return null;
  return (
    <section className="mt-7">
      <h4 className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-sage-500">
        {title}
      </h4>
      <ul className="space-y-1">
        {people.map(({ p, note }) => (
          <li key={p.id}>
            <button
              type="button"
              onClick={() => onSelect(p.id)}
              className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors hover:bg-white/[0.04]"
            >
              <Portrait
                name={p.fullName}
                media={p.portrait}
                sex={p.sex}
                size={36}
                deceased={p.isLiving === false || p.death.year !== null}
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm text-parchment">{p.fullName}</span>
                <span className="block text-xs text-sage-500">{p.birth.year ?? '?'}</span>
              </span>
              {note && <Badge>{note}</Badge>}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function AddButton({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center gap-1.5 rounded-xl border border-dashed border-gold-400/30 px-2 py-3 text-xs text-gold-300 transition-colors hover:border-gold-400/70 hover:bg-gold-400/5"
    >
      {icon}+ {label}
    </button>
  );
}
