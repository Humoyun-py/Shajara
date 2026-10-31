import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  LABELS,
  PARENT_TYPES,
  SEXES,
  UNION_TYPES,
  type ParentType,
  type PersonDetailDTO,
  type UnionType,
} from '@avlod/shared';
import { Dialog } from '../../components/ui/Dialog';
import { Button } from '../../components/ui/Button';
import { Checkbox, Input, Select, Textarea } from '../../components/ui/Field';
import { FormError } from '../../components/ui/States';
import { api, errorMessage, fieldErrors } from '../../lib/api';
import { useFamilyMutation } from '../../services/queries';

const optNum = (min: number, max: number) =>
  z
    .string()
    .trim()
    .refine(
      (v) => v === '' || (/^\d+$/.test(v) && +v >= min && +v <= max),
      `${min}–${max} oralig‘ida son kiriting`,
    );

const formSchema = z.object({
  givenName: z.string().trim().min(1, 'Ismni kiriting').max(80),
  familyName: z.string().trim().max(80),
  patronymic: z.string().trim().max(80),
  maidenName: z.string().trim().max(80),
  sex: z.enum(SEXES),
  birthYear: optNum(1, 2200),
  birthMonth: optNum(1, 12),
  birthDay: optNum(1, 31),
  birthApprox: z.boolean(),
  birthPlace: z.string().trim().max(160),
  living: z.enum(['unknown', 'yes', 'no']),
  deathYear: optNum(1, 2200),
  deathMonth: optNum(1, 12),
  deathDay: optNum(1, 31),
  deathApprox: z.boolean(),
  deathPlace: z.string().trim().max(160),
  occupation: z.string().trim().max(160),
  biography: z.string().trim().max(8000),
  achievements: z.string().max(6000),
  branchLabel: z.string().trim().max(80),
  notes: z.string().trim().max(4000),
});
type FormValues = z.infer<typeof formSchema>;

const s = (v: string | null | undefined) => v ?? '';
const n = (v: number | null | undefined) => (v === null || v === undefined ? '' : String(v));
const num = (v: string) => (v === '' ? null : Number(v));
const txt = (v: string) => (v === '' ? null : v);

function defaults(p?: PersonDetailDTO | null): FormValues {
  return {
    givenName: s(p?.givenName),
    familyName: s(p?.familyName),
    patronymic: s(p?.patronymic),
    maidenName: s(p?.maidenName),
    sex: p?.sex ?? 'UNKNOWN',
    birthYear: n(p?.birth.year),
    birthMonth: n(p?.birth.month),
    birthDay: n(p?.birth.day),
    birthApprox: p?.birth.approximate ?? false,
    birthPlace: s(p?.birthPlace),
    living: p?.isLiving === true ? 'yes' : p?.isLiving === false ? 'no' : 'unknown',
    deathYear: n(p?.death.year),
    deathMonth: n(p?.death.month),
    deathDay: n(p?.death.day),
    deathApprox: p?.death.approximate ?? false,
    deathPlace: s(p?.deathPlace),
    occupation: s(p?.occupation),
    biography: s(p?.biography),
    achievements: (p?.achievements ?? []).join('\n'),
    branchLabel: s(p?.branchLabel),
    notes: s(p?.notes),
  };
}

export function toPayload(v: FormValues) {
  return {
    givenName: v.givenName,
    familyName: txt(v.familyName),
    patronymic: txt(v.patronymic),
    maidenName: txt(v.maidenName),
    sex: v.sex,
    birth: {
      year: num(v.birthYear),
      month: num(v.birthMonth),
      day: num(v.birthDay),
      approximate: v.birthApprox,
    },
    birthPlace: txt(v.birthPlace),
    isLiving: v.living === 'yes' ? true : v.living === 'no' ? false : null,
    death: {
      year: num(v.deathYear),
      month: num(v.deathMonth),
      day: num(v.deathDay),
      approximate: v.deathApprox,
    },
    deathPlace: txt(v.deathPlace),
    occupation: txt(v.occupation),
    biography: txt(v.biography),
    achievements: v.achievements
      .split('\n')
      .map((a) => a.trim())
      .filter(Boolean),
    branchLabel: txt(v.branchLabel),
    notes: txt(v.notes),
  };
}

export type RelationKind = 'PARENT_OF' | 'CHILD_OF' | 'PARTNER_OF';

interface Props {
  familyId: string;
  open: boolean;
  onClose: () => void;
  /** Edit mode when provided. */
  person?: PersonDetailDTO | null;
  /** Create mode: connect the new person to this relative. */
  relation?: { to: string; toName: string; kind: RelationKind } | null;
  onSaved?: (personId: string) => void;
  /** Editors see internal notes. */
  canSeeNotes?: boolean;
}

const relationTitle: Record<RelationKind, string> = {
  CHILD_OF: 'Farzand qo‘shish',
  PARENT_OF: 'Ota yoki ona qo‘shish',
  PARTNER_OF: 'Turmush o‘rtog‘ini qo‘shish',
};

export function PersonFormDialog({
  familyId,
  open,
  onClose,
  person,
  relation,
  onSaved,
  canSeeNotes = true,
}: Props) {
  const editing = Boolean(person);
  const [parentType, setParentType] = useState<ParentType>('BIOLOGICAL');
  const [unionType, setUnionType] = useState<UnionType>('MARRIAGE');
  const [error, setError] = useState<string | null>(null);
  const form = useForm<FormValues>({ resolver: zodResolver(formSchema), values: defaults(person) });
  const { register, handleSubmit, formState, watch, setError: setFieldError, reset } = form;
  const e = formState.errors;

  const save = useFamilyMutation(familyId, async (values: FormValues) => {
    const payload = toPayload(values);
    if (person)
      return api.patch<PersonDetailDTO>(`/families/${familyId}/people/${person.id}`, payload);
    return api.post<PersonDetailDTO>(`/families/${familyId}/people`, {
      person: payload,
      relation: relation
        ? { to: relation.to, kind: relation.kind, parentType, unionType }
        : undefined,
    });
  });

  const submit = handleSubmit(async (values) => {
    setError(null);
    try {
      const saved = await save.mutateAsync(values);
      onSaved?.(saved.id);
      if (!editing) reset(defaults(null));
      onClose();
    } catch (err) {
      const fe = fieldErrors(err);
      Object.entries(fe).forEach(([k, m]) => setFieldError(k as keyof FormValues, { message: m }));
      setError(errorMessage(err));
    }
  });

  const living = watch('living');
  const title = editing
    ? 'Ma’lumotlarni tahrirlash'
    : relation
      ? relationTitle[relation.kind]
      : 'Yangi qarindosh';

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      description={
        relation
          ? `${relation.toName} bilan bog‘lanadi`
          : 'Noma’lum ma’lumotlarni bo‘sh qoldirishingiz mumkin.'
      }
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
      <form onSubmit={submit} className="space-y-6" noValidate>
        <FormError message={error} />
        {relation && relation.kind !== 'PARTNER_OF' && (
          <Select
            label="Bog‘lanish turi"
            value={parentType}
            onChange={(ev) => setParentType(ev.target.value as ParentType)}
          >
            {PARENT_TYPES.map((t) => (
              <option key={t} value={t}>
                {LABELS.parentType[t]}
              </option>
            ))}
          </Select>
        )}
        {relation?.kind === 'PARTNER_OF' && (
          <Select
            label="Juftlik turi"
            value={unionType}
            onChange={(ev) => setUnionType(ev.target.value as UnionType)}
          >
            {UNION_TYPES.map((t) => (
              <option key={t} value={t}>
                {LABELS.unionType[t]}
              </option>
            ))}
          </Select>
        )}

        <fieldset className="grid gap-4 sm:grid-cols-2">
          <legend className="eyebrow mb-3">Ism-sharif</legend>
          <Input
            label="Ism *"
            data-autofocus
            autoComplete="off"
            {...register('givenName')}
            error={e.givenName?.message}
          />
          <Input
            label="Familiya"
            autoComplete="off"
            {...register('familyName')}
            error={e.familyName?.message}
          />
          <Input label="Otasining ismi" {...register('patronymic')} error={e.patronymic?.message} />
          <Input
            label="Qizlik familiyasi"
            {...register('maidenName')}
            error={e.maidenName?.message}
          />
          <Select label="Jinsi" {...register('sex')}>
            {SEXES.map((x) => (
              <option key={x} value={x}>
                {LABELS.sex[x]}
              </option>
            ))}
          </Select>
          <Input label="Oila tarmog‘i" hint="Masalan: Karimovlar" {...register('branchLabel')} />
        </fieldset>

        <fieldset className="space-y-3">
          <legend className="eyebrow mb-3">Tug‘ilgan</legend>
          <div className="grid grid-cols-3 gap-3">
            <Input
              label="Yil"
              inputMode="numeric"
              {...register('birthYear')}
              error={e.birthYear?.message}
            />
            <Input
              label="Oy"
              inputMode="numeric"
              {...register('birthMonth')}
              error={e.birthMonth?.message}
            />
            <Input
              label="Kun"
              inputMode="numeric"
              {...register('birthDay')}
              error={e.birthDay?.message}
            />
          </div>
          <Checkbox label="Taxminiy sana" {...register('birthApprox')} />
          <Input label="Tug‘ilgan joyi" {...register('birthPlace')} />
        </fieldset>

        <fieldset className="space-y-3">
          <legend className="eyebrow mb-3">Hayot holati</legend>
          <Select label="Tirikmi?" {...register('living')} error={e.living?.message}>
            <option value="unknown">Noma’lum</option>
            <option value="yes">Ha, tirik</option>
            <option value="no">Vafot etgan</option>
          </Select>
          {living !== 'yes' && (
            <>
              <div className="grid grid-cols-3 gap-3">
                <Input
                  label="Vafot yili"
                  inputMode="numeric"
                  {...register('deathYear')}
                  error={e.deathYear?.message}
                />
                <Input
                  label="Oy"
                  inputMode="numeric"
                  {...register('deathMonth')}
                  error={e.deathMonth?.message}
                />
                <Input
                  label="Kun"
                  inputMode="numeric"
                  {...register('deathDay')}
                  error={e.deathDay?.message}
                />
              </div>
              <Checkbox label="Taxminiy sana" {...register('deathApprox')} />
              <Input label="Vafot etgan joyi" {...register('deathPlace')} />
            </>
          )}
        </fieldset>

        <fieldset className="space-y-4">
          <legend className="eyebrow mb-3">Hayot yo‘li</legend>
          <Input label="Kasbi" {...register('occupation')} />
          <Textarea
            label="Qisqacha tarjimai hol"
            rows={5}
            {...register('biography')}
            error={e.biography?.message}
          />
          <Textarea
            label="Yutuqlar"
            hint="Har bir yutuq — alohida qatorda"
            rows={3}
            {...register('achievements')}
          />
          {canSeeNotes && (
            <Textarea
              label="Ichki izohlar (faqat muharrirlar ko‘radi)"
              rows={3}
              {...register('notes')}
            />
          )}
        </fieldset>
      </form>
    </Dialog>
  );
}
