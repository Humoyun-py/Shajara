import { useDeferredValue, useState } from 'react';
import { Link2, Trash2 } from 'lucide-react';
import {
  LABELS,
  PARENT_TYPES,
  UNION_STATUSES,
  UNION_TYPES,
  VERIFICATION_STATUSES,
  type ParentLinkDTO,
  type ParentType,
  type PersonProfileDTO,
  type UnionDTO,
  type UnionStatus,
  type UnionType,
  type VerificationStatus,
} from '@avlod/shared';
import { Dialog, ConfirmDialog } from '../../components/ui/Dialog';
import { Button, IconButton } from '../../components/ui/Button';
import { Select } from '../../components/ui/Field';
import { Portrait } from '../../components/ui/Brand';
import { FormError } from '../../components/ui/States';
import { api, errorMessage } from '../../lib/api';
import { useFamilyMutation, useSearch } from '../../services/queries';

type Kind = 'parent' | 'child' | 'partner';

/** Connect an existing relative, edit relationship types/verification, or remove a link. */
export function RelationshipEditor({
  familyId,
  profile,
}: {
  familyId: string;
  profile: PersonProfileDTO;
}) {
  const [linking, setLinking] = useState<Kind | null>(null);
  const [removing, setRemoving] = useState<
    | null
    | { kind: 'link'; link: ParentLinkDTO; name: string }
    | { kind: 'union'; union: UnionDTO; name: string }
  >(null);
  const [error, setError] = useState<string | null>(null);
  const me = profile.person;

  const remove = useFamilyMutation(familyId, () =>
    removing?.kind === 'link'
      ? api.delete(`/families/${familyId}/relationships/parents/${removing.link.id}`)
      : api.delete(
          `/families/${familyId}/relationships/unions/${removing!.kind === 'union' ? removing!.union.id : ''}`,
        ),
  );
  const updateLink = useFamilyMutation(
    familyId,
    (v: { id: string; type?: ParentType; verification?: VerificationStatus }) =>
      api.patch(`/families/${familyId}/relationships/parents/${v.id}`, {
        type: v.type,
        verification: v.verification,
      }),
  );
  const updateUnion = useFamilyMutation(
    familyId,
    (v: { id: string; status?: UnionStatus; type?: UnionType }) =>
      api.patch(`/families/${familyId}/relationships/unions/${v.id}`, {
        status: v.status,
        type: v.type,
      }),
  );

  const rows = [
    ...profile.relatives.parents.map((r) => ({
      key: r.link.id,
      label: 'Ota-ona',
      person: r.person,
      link: r.link,
    })),
    ...profile.relatives.children.map((r) => ({
      key: r.link.id,
      label: 'Farzand',
      person: r.person,
      link: r.link,
    })),
  ];

  return (
    <section className="panel p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-serif text-2xl text-parchment">Bog‘lanishlarni boshqarish</h2>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="secondary"
            icon={<Link2 className="h-4 w-4" />}
            onClick={() => setLinking('parent')}
          >
            Ota-ona
          </Button>
          <Button
            size="sm"
            variant="secondary"
            icon={<Link2 className="h-4 w-4" />}
            onClick={() => setLinking('partner')}
          >
            Juft
          </Button>
          <Button
            size="sm"
            variant="secondary"
            icon={<Link2 className="h-4 w-4" />}
            onClick={() => setLinking('child')}
          >
            Farzand
          </Button>
        </div>
      </div>
      <p className="mt-1 text-sm text-sage-500">
        Mavjud qarindoshni bog‘lang. Tizim aylana, takroriy va noto‘g‘ri bog‘lanishlarni rad etadi.
      </p>
      <FormError message={error} />

      <ul className="mt-5 divide-y divide-white/[0.06]">
        {rows.map((r) => (
          <li key={r.key} className="flex flex-wrap items-center gap-3 py-3">
            <Portrait
              name={r.person.fullName}
              media={r.person.portrait}
              sex={r.person.sex}
              size={36}
            />
            <div className="min-w-[10rem] flex-1">
              <p className="text-sm text-parchment">{r.person.fullName}</p>
              <p className="text-xs text-sage-500">{r.label}</p>
            </div>
            <label className="sr-only" htmlFor={`t-${r.key}`}>
              Turi
            </label>
            <select
              id={`t-${r.key}`}
              value={r.link.type}
              onChange={(e) =>
                updateLink
                  .mutateAsync({ id: r.link.id, type: e.target.value as ParentType })
                  .catch((err) => setError(errorMessage(err)))
              }
              className="h-9 rounded-full border border-white/10 bg-ink-950/60 px-3 text-xs text-parchment"
            >
              {PARENT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {LABELS.parentType[t]}
                </option>
              ))}
            </select>
            <label className="sr-only" htmlFor={`v-${r.key}`}>
              Tasdiq
            </label>
            <select
              id={`v-${r.key}`}
              value={r.link.verification}
              onChange={(e) =>
                updateLink
                  .mutateAsync({
                    id: r.link.id,
                    verification: e.target.value as VerificationStatus,
                  })
                  .catch((err) => setError(errorMessage(err)))
              }
              className="h-9 rounded-full border border-white/10 bg-ink-950/60 px-3 text-xs text-parchment"
            >
              {VERIFICATION_STATUSES.map((t) => (
                <option key={t} value={t}>
                  {LABELS.verification[t]}
                </option>
              ))}
            </select>
            <IconButton
              label="Bog‘lanishni uzish"
              onClick={() => setRemoving({ kind: 'link', link: r.link, name: r.person.fullName })}
            >
              <Trash2 className="h-4 w-4" />
            </IconButton>
          </li>
        ))}
        {profile.relatives.partners.map((r) => (
          <li key={r.union.id} className="flex flex-wrap items-center gap-3 py-3">
            <Portrait
              name={r.person.fullName}
              media={r.person.portrait}
              sex={r.person.sex}
              size={36}
            />
            <div className="min-w-[10rem] flex-1">
              <p className="text-sm text-parchment">{r.person.fullName}</p>
              <p className="text-xs text-sage-500">
                {LABELS.unionType[r.union.type]}
                {r.union.startYear ? ` · ${r.union.startYear}` : ''}
              </p>
            </div>
            <label className="sr-only" htmlFor={`s-${r.union.id}`}>
              Holati
            </label>
            <select
              id={`s-${r.union.id}`}
              value={r.union.status}
              onChange={(e) =>
                updateUnion
                  .mutateAsync({ id: r.union.id, status: e.target.value as UnionStatus })
                  .catch((err) => setError(errorMessage(err)))
              }
              className="h-9 rounded-full border border-white/10 bg-ink-950/60 px-3 text-xs text-parchment"
            >
              {UNION_STATUSES.map((t) => (
                <option key={t} value={t}>
                  {LABELS.unionStatus[t]}
                </option>
              ))}
            </select>
            <IconButton
              label="Juftlikni o‘chirish"
              onClick={() =>
                setRemoving({ kind: 'union', union: r.union, name: r.person.fullName })
              }
            >
              <Trash2 className="h-4 w-4" />
            </IconButton>
          </li>
        ))}
      </ul>

      {linking && (
        <LinkDialog
          familyId={familyId}
          personId={me.id}
          personName={me.fullName}
          kind={linking}
          onClose={() => setLinking(null)}
        />
      )}
      <ConfirmDialog
        open={removing !== null}
        title="Bog‘lanishni uzasizmi?"
        message={
          <p>
            <strong className="text-parchment">{me.fullName}</strong> va{' '}
            <strong className="text-parchment">{removing?.name}</strong> orasidagi bog‘lanish
            o‘chiriladi. Ikkala shaxsning yozuvlari saqlanib qoladi.
          </p>
        }
        confirmLabel="Uzish"
        loading={remove.isPending}
        onConfirm={async () => {
          try {
            await remove.mutateAsync(undefined);
            setRemoving(null);
          } catch (e) {
            setError(errorMessage(e));
            setRemoving(null);
          }
        }}
        onClose={() => setRemoving(null)}
      />
    </section>
  );
}

function LinkDialog({
  familyId,
  personId,
  personName,
  kind,
  onClose,
}: {
  familyId: string;
  personId: string;
  personName: string;
  kind: Kind;
  onClose: () => void;
}) {
  const [q, setQ] = useState('');
  const deferred = useDeferredValue(q);
  const results = useSearch(familyId, deferred);
  const [target, setTarget] = useState<{ id: string; name: string } | null>(null);
  const [parentType, setParentType] = useState<ParentType>('BIOLOGICAL');
  const [unionType, setUnionType] = useState<UnionType>('MARRIAGE');
  const [error, setError] = useState<string | null>(null);
  const save = useFamilyMutation(familyId, async () => {
    if (!target) return;
    if (kind === 'partner')
      return api.post(`/families/${familyId}/relationships/unions`, {
        partnerAId: personId,
        partnerBId: target.id,
        type: unionType,
      });
    const body =
      kind === 'parent'
        ? { parentId: target.id, childId: personId, type: parentType }
        : { parentId: personId, childId: target.id, type: parentType };
    return api.post(`/families/${familyId}/relationships/parents`, body);
  });
  const titles: Record<Kind, string> = {
    parent: 'Ota-onani bog‘lash',
    child: 'Farzandni bog‘lash',
    partner: 'Juftni bog‘lash',
  };
  return (
    <Dialog
      open
      onClose={onClose}
      title={titles[kind]}
      description={`${personName} uchun mavjud qarindoshni tanlang`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Bekor qilish
          </Button>
          <Button
            disabled={!target}
            loading={save.isPending}
            onClick={async () => {
              setError(null);
              try {
                await save.mutateAsync(undefined);
                onClose();
              } catch (e) {
                setError(errorMessage(e));
              }
            }}
          >
            Bog‘lash
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <FormError message={error} />
        <label htmlFor="link-q" className="block text-[13px] font-medium text-sage-300">
          Qidirish
        </label>
        <input
          id="link-q"
          data-autofocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Kamida 2 ta harf…"
          className="h-12 w-full rounded-xl border border-white/10 bg-ink-950/60 px-4 text-parchment focus:border-gold-400/60 focus:outline-none"
        />
        <ul className="max-h-60 space-y-1 overflow-y-auto" role="listbox" aria-label="Natijalar">
          {results.data?.people
            .filter((p) => p.id !== personId)
            .map((p) => (
              <li key={p.id} role="option" aria-selected={target?.id === p.id}>
                <button
                  type="button"
                  onClick={() => setTarget({ id: p.id, name: p.fullName })}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm ${target?.id === p.id ? 'bg-gold-400/15 text-parchment' : 'hover:bg-white/[0.04]'}`}
                >
                  <Portrait name={p.fullName} media={p.portrait} sex={p.sex} size={32} />
                  {p.fullName} <span className="text-sage-500">{p.birth.year ?? ''}</span>
                </button>
              </li>
            ))}
        </ul>
        {kind === 'partner' ? (
          <Select
            label="Juftlik turi"
            value={unionType}
            onChange={(e) => setUnionType(e.target.value as UnionType)}
          >
            {UNION_TYPES.map((t) => (
              <option key={t} value={t}>
                {LABELS.unionType[t]}
              </option>
            ))}
          </Select>
        ) : (
          <Select
            label="Bog‘lanish turi"
            value={parentType}
            onChange={(e) => setParentType(e.target.value as ParentType)}
          >
            {PARENT_TYPES.map((t) => (
              <option key={t} value={t}>
                {LABELS.parentType[t]}
              </option>
            ))}
          </Select>
        )}
      </div>
    </Dialog>
  );
}
