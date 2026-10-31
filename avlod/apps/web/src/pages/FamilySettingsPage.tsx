import { useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Copy, Check, MailPlus, Trash2, UserMinus } from 'lucide-react';
import {
  assignableRoles,
  hasRole,
  LABELS,
  type FamilyRole,
  type InvitationDTO,
} from '@avlod/shared';
import type { FamilyOutletContext } from '../layouts/FamilyLayout';
import { useAuth } from '../features/auth/AuthProvider';
import { useFamilyMutation, useInvitations, useMembers, useStats, qk } from '../services/queries';
import { Button, IconButton } from '../components/ui/Button';
import { ConfirmDialog } from '../components/ui/Dialog';
import { Input, Select, Textarea } from '../components/ui/Field';
import { Badge, FormError, Spinner } from '../components/ui/States';
import { api, errorMessage } from '../lib/api';

export function FamilySettingsPage() {
  const { family } = useOutletContext<FamilyOutletContext>();
  const isAdmin = hasRole(family.role, 'ADMIN');
  const stats = useStats(family.id);
  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-10 sm:px-6">
      {stats.data && (
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-4" aria-label="Statistika">
          {(
            [
              ['A’zolar', stats.data.familyMembers],
              ['Avlodlar', stats.data.generations],
              ['Tarmoqlar', stats.data.branches],
              ['Xotiralar', stats.data.memories],
            ] as const
          ).map(([l, v]) => (
            <div key={l} className="panel px-5 py-4">
              <p className="font-serif text-4xl text-gold-300">{v}</p>
              <p className="text-xs uppercase tracking-[0.18em] text-sage-500">{l}</p>
            </div>
          ))}
        </section>
      )}
      {isAdmin && <GeneralSection />}
      <MembersSection />
      {isAdmin && <InvitationsSection />}
      {family.role === 'OWNER' && <DangerSection />}
    </div>
  );
}

function GeneralSection() {
  const { family } = useOutletContext<FamilyOutletContext>();
  const [name, setName] = useState(family.name);
  const [description, setDescription] = useState(family.description ?? '');
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const save = useFamilyMutation(family.id, () =>
    api.patch(`/families/${family.id}`, { name, description: description || null }),
  );
  return (
    <section className="panel p-6">
      <h2 className="font-serif text-2xl text-parchment">Umumiy</h2>
      <div className="mt-5 space-y-4">
        <FormError message={error} />
        <Input label="Oila nomi" value={name} onChange={(e) => setName(e.target.value)} />
        <Textarea
          label="Tavsif"
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <div className="flex items-center gap-3">
          <Button
            loading={save.isPending}
            onClick={async () => {
              setError(null);
              try {
                await save.mutateAsync(undefined);
                setMsg('Saqlandi');
              } catch (e) {
                setError(errorMessage(e));
              }
            }}
          >
            Saqlash
          </Button>
          {msg && (
            <span role="status" className="text-sm text-sage-400">
              {msg}
            </span>
          )}
        </div>
      </div>
    </section>
  );
}

function MembersSection() {
  const { family } = useOutletContext<FamilyOutletContext>();
  const { user } = useAuth();
  const members = useMembers(family.id);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [removing, setRemoving] = useState<{ id: string; name: string; self: boolean } | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const changeRole = useFamilyMutation(family.id, (v: { id: string; role: FamilyRole }) =>
    api.patch(`/families/${family.id}/members/${v.id}`, { role: v.role }),
  );
  const remove = useFamilyMutation(family.id, (id: string) =>
    api.delete(`/families/${family.id}/members/${id}`),
  );
  const roles = assignableRoles(family.role ?? 'VIEWER');
  return (
    <section className="panel p-6">
      <h2 className="font-serif text-2xl text-parchment">A’zolar va rollar</h2>
      <p className="mt-1 text-sm text-sage-500">
        Egasi — hammasi; Administrator — a’zolar va takliflar; Muharrir — shajara va xotiralarni
        tahrirlash; Kuzatuvchi — faqat ko‘rish.
      </p>
      <FormError message={error} />
      {members.isLoading ? (
        <Spinner />
      ) : (
        <ul className="mt-5 divide-y divide-white/[0.06]">
          {members.data?.map((m) => {
            const self = m.userId === user?.id;
            const canManage =
              !self &&
              m.role !== 'OWNER' &&
              (family.role === 'OWNER' || (family.role === 'ADMIN' && m.role !== 'ADMIN'));
            return (
              <li key={m.id} className="flex flex-wrap items-center gap-3 py-3">
                <div className="min-w-[12rem] flex-1">
                  <p className="text-parchment">
                    {m.displayName} {self && <span className="text-sage-500">(siz)</span>}
                  </p>
                  <p className="text-xs text-sage-500">{m.email}</p>
                </div>
                {canManage ? (
                  <>
                    <label className="sr-only" htmlFor={`role-${m.id}`}>
                      Rol
                    </label>
                    <select
                      id={`role-${m.id}`}
                      value={m.role}
                      onChange={(e) =>
                        changeRole
                          .mutateAsync({ id: m.id, role: e.target.value as FamilyRole })
                          .catch((err) => setError(errorMessage(err)))
                      }
                      className="h-9 rounded-full border border-white/10 bg-ink-950/60 px-3 text-sm text-parchment"
                    >
                      {[m.role, ...roles.filter((r) => r !== m.role)].map((r) => (
                        <option key={r} value={r}>
                          {LABELS.role[r]}
                        </option>
                      ))}
                      {family.role === 'OWNER' && (
                        <option value="OWNER">Egalikni topshirish</option>
                      )}
                    </select>
                    <IconButton
                      label="A’zoni chiqarish"
                      onClick={() => setRemoving({ id: m.id, name: m.displayName, self: false })}
                    >
                      <UserMinus className="h-4 w-4" />
                    </IconButton>
                  </>
                ) : (
                  <Badge tone={m.role === 'OWNER' ? 'gold' : 'neutral'}>
                    {LABELS.role[m.role]}
                  </Badge>
                )}
                {self && m.role !== 'OWNER' && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setRemoving({ id: m.id, name: m.displayName, self: true })}
                  >
                    Oiladan chiqish
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}
      <ConfirmDialog
        open={removing !== null}
        title={removing?.self ? 'Oiladan chiqasizmi?' : 'A’zoni chiqarasizmi?'}
        message={
          <p>
            {removing?.self
              ? 'Qayta kirish uchun yangi taklif kerak bo‘ladi.'
              : `${removing?.name} endi bu oilani ko‘ra olmaydi.`}
          </p>
        }
        confirmLabel={removing?.self ? 'Chiqish' : 'Chiqarish'}
        loading={remove.isPending}
        onConfirm={async () => {
          try {
            await remove.mutateAsync(removing!.id);
            if (removing!.self) {
              await qc.invalidateQueries({ queryKey: qk.families });
              navigate('/dashboard');
            }
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

function InvitationsSection() {
  const { family } = useOutletContext<FamilyOutletContext>();
  const invitations = useInvitations(family.id, true);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'ADMIN' | 'EDITOR' | 'VIEWER'>('VIEWER');
  const [days, setDays] = useState('7');
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<InvitationDTO | null>(null);
  const [copied, setCopied] = useState(false);
  const invite = useFamilyMutation(family.id, () =>
    api.post<InvitationDTO>(`/families/${family.id}/invitations`, {
      email,
      role,
      expiresInDays: Number(days),
    }),
  );
  const revoke = useFamilyMutation(family.id, (id: string) =>
    api.delete(`/families/${family.id}/invitations/${id}`),
  );
  const roles = assignableRoles(family.role ?? 'VIEWER') as ('ADMIN' | 'EDITOR' | 'VIEWER')[];
  return (
    <section className="panel p-6">
      <h2 className="font-serif text-2xl text-parchment">Qarindoshlarni taklif qilish</h2>
      <p className="mt-1 text-sm text-sage-500">
        Taklif havolasi faqat ko‘rsatilgan email egasi uchun ishlaydi va muddati tugagach yaroqsiz
        bo‘ladi.
      </p>
      <form
        className="mt-5 grid gap-4 sm:grid-cols-[1fr_auto_auto_auto] sm:items-end"
        onSubmit={async (e) => {
          e.preventDefault();
          setError(null);
          setCreated(null);
          try {
            setCreated(await invite.mutateAsync(undefined));
            setEmail('');
          } catch (err) {
            setError(errorMessage(err));
          }
        }}
      >
        <Input
          label="Email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Select label="Rol" value={role} onChange={(e) => setRole(e.target.value as typeof role)}>
          {roles.map((r) => (
            <option key={r} value={r}>
              {LABELS.role[r]}
            </option>
          ))}
        </Select>
        <Select label="Muddat" value={days} onChange={(e) => setDays(e.target.value)}>
          <option value="1">1 kun</option>
          <option value="7">7 kun</option>
          <option value="30">30 kun</option>
        </Select>
        <Button type="submit" loading={invite.isPending} icon={<MailPlus className="h-4 w-4" />}>
          Taklif qilish
        </Button>
      </form>
      <div className="mt-3">
        <FormError message={error} />
      </div>
      {created?.acceptUrl && (
        <div className="mt-4 rounded-2xl border border-gold-400/30 bg-gold-400/5 p-4 text-sm">
          <p className="text-sage-300">
            Taklif yuborildi. Agar email sozlanmagan bo‘lsa, havolani o‘zingiz yuboring (faqat hozir
            ko‘rsatiladi):
          </p>
          <div className="mt-2 flex items-center gap-2">
            <code className="min-w-0 flex-1 truncate rounded-lg bg-ink-950 px-3 py-2 text-xs text-gold-200">
              {created.acceptUrl}
            </code>
            <IconButton
              label="Nusxalash"
              onClick={async () => {
                await navigator.clipboard.writeText(created.acceptUrl!);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
            >
              {copied ? <Check className="h-4 w-4 text-gold-300" /> : <Copy className="h-4 w-4" />}
            </IconButton>
          </div>
        </div>
      )}
      <ul className="mt-6 divide-y divide-white/[0.06]">
        {invitations.data?.map((i) => (
          <li key={i.id} className="flex flex-wrap items-center gap-3 py-3 text-sm">
            <span className="min-w-[12rem] flex-1 text-parchment">{i.email}</span>
            <Badge>{LABELS.role[i.role]}</Badge>
            <Badge tone={i.status === 'PENDING' ? 'gold' : 'neutral'}>
              {
                {
                  PENDING: 'Kutilmoqda',
                  ACCEPTED: 'Qabul qilingan',
                  DECLINED: 'Rad etilgan',
                  REVOKED: 'Bekor qilingan',
                  EXPIRED: 'Muddati o‘tgan',
                }[i.status]
              }
            </Badge>
            <span className="text-xs text-sage-500">
              {new Date(i.expiresAt).toLocaleDateString('uz-UZ')} gacha
            </span>
            {i.status === 'PENDING' && (
              <IconButton label="Taklifni bekor qilish" onClick={() => revoke.mutate(i.id)}>
                <Trash2 className="h-4 w-4" />
              </IconButton>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

function DangerSection() {
  const { family } = useOutletContext<FamilyOutletContext>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [confirmName, setConfirmName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const archive = useFamilyMutation(family.id, () =>
    api.delete(`/families/${family.id}`, { body: { confirmName } }),
  );
  return (
    <section className="rounded-2xl border border-danger/25 p-6">
      <h2 className="font-serif text-2xl text-danger">Xavfli hudud</h2>
      <p className="mt-1 text-sm text-sage-400">
        Oila ish maydonini arxivlash uni barcha a’zolar uchun yopadi. Yozuvlar zaxira uchun
        saqlanadi.
      </p>
      <Button variant="danger" className="mt-4" onClick={() => setOpen(true)}>
        Oilani arxivlash
      </Button>
      <ConfirmDialog
        open={open}
        title="Oilani arxivlaysizmi?"
        message={
          <>
            <p>
              Tasdiqlash uchun oila nomini kiriting:{' '}
              <strong className="text-parchment">{family.name}</strong>
            </p>
            <Input
              label="Oila nomi"
              value={confirmName}
              onChange={(e) => setConfirmName(e.target.value)}
            />
          </>
        }
        confirmLabel="Arxivlash"
        loading={archive.isPending}
        error={error}
        onConfirm={async () => {
          try {
            await archive.mutateAsync(undefined);
            await qc.invalidateQueries({ queryKey: qk.families });
            navigate('/dashboard');
          } catch (e) {
            setError(errorMessage(e));
          }
        }}
        onClose={() => setOpen(false)}
      />
    </section>
  );
}
