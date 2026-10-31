import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { passwordSchema, type AuthResultDTO, type UserDTO } from '@avlod/shared';
import { useAuth } from '../features/auth/AuthProvider';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Field';
import { FormError } from '../components/ui/States';
import { api, errorMessage } from '../lib/api';

const pwSchema = z
  .object({
    currentPassword: z.string().min(1, 'Joriy parolni kiriting'),
    newPassword: passwordSchema,
    confirm: z.string(),
  })
  .refine((v) => v.newPassword === v.confirm, { message: 'Parollar mos emas', path: ['confirm'] });

export function AccountSettingsPage() {
  const { user, setUser, applySession } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState(user?.displayName ?? '');
  const [profileMsg, setProfileMsg] = useState<string | null>(null);
  const [profileErr, setProfileErr] = useState<string | null>(null);
  const [pwMsg, setPwMsg] = useState<string | null>(null);
  const [pwErr, setPwErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const pw = useForm<z.infer<typeof pwSchema>>({ resolver: zodResolver(pwSchema) });

  return (
    <div className="mx-auto max-w-2xl space-y-8 px-4 py-12 sm:px-6">
      <div>
        <p className="eyebrow">Hisob</p>
        <h1 className="mt-2 font-serif text-5xl text-parchment">Sozlamalar</h1>
      </div>

      <section className="panel space-y-4 p-6">
        <h2 className="font-serif text-2xl text-parchment">Profil</h2>
        <FormError message={profileErr} />
        <Input
          label="Email"
          value={user?.email ?? ''}
          disabled
          hint="Email manzilni o‘zgartirish hozircha qo‘llab-quvvatlanmaydi."
        />
        <Input label="Ism" value={name} onChange={(e) => setName(e.target.value)} />
        <div className="flex items-center gap-3">
          <Button
            loading={saving}
            onClick={async () => {
              setProfileErr(null);
              setSaving(true);
              try {
                setUser(await api.patch<UserDTO>('/users/me', { displayName: name }));
                setProfileMsg('Saqlandi');
              } catch (e) {
                setProfileErr(errorMessage(e));
              } finally {
                setSaving(false);
              }
            }}
          >
            Saqlash
          </Button>
          {profileMsg && (
            <span role="status" className="text-sm text-sage-400">
              {profileMsg}
            </span>
          )}
        </div>
      </section>

      <section className="panel p-6">
        <h2 className="font-serif text-2xl text-parchment">Parolni o‘zgartirish</h2>
        <p className="mt-1 text-sm text-sage-500">
          Boshqa barcha qurilmalardagi sessiyalar yopiladi.
        </p>
        <form
          className="mt-5 space-y-4"
          noValidate
          onSubmit={pw.handleSubmit(async (v) => {
            setPwErr(null);
            try {
              applySession(
                await api.post<AuthResultDTO>('/users/me/password', {
                  currentPassword: v.currentPassword,
                  newPassword: v.newPassword,
                }),
              );
              pw.reset();
              setPwMsg('Parol yangilandi.');
            } catch (e) {
              setPwErr(errorMessage(e));
            }
          })}
        >
          <FormError message={pwErr} />
          <Input
            label="Joriy parol"
            type="password"
            autoComplete="current-password"
            {...pw.register('currentPassword')}
            error={pw.formState.errors.currentPassword?.message}
          />
          <Input
            label="Yangi parol"
            type="password"
            autoComplete="new-password"
            {...pw.register('newPassword')}
            error={pw.formState.errors.newPassword?.message}
          />
          <Input
            label="Yangi parolni takrorlang"
            type="password"
            autoComplete="new-password"
            {...pw.register('confirm')}
            error={pw.formState.errors.confirm?.message}
          />
          <div className="flex items-center gap-3">
            <Button type="submit" loading={pw.formState.isSubmitting}>
              Parolni yangilash
            </Button>
            {pwMsg && (
              <span role="status" className="text-sm text-sage-400">
                {pwMsg}
              </span>
            )}
          </div>
        </form>
      </section>

      <section className="panel p-6">
        <h2 className="font-serif text-2xl text-parchment">Sessiyalar</h2>
        <p className="mt-1 text-sm text-sage-500">
          Barcha qurilmalardan, shu jumladan ushbu qurilmadan chiqish.
        </p>
        <Button
          variant="secondary"
          className="mt-4"
          onClick={async () => {
            await api.post('/auth/logout-all').catch(() => undefined);
            applySession(null);
            navigate('/login');
          }}
        >
          Hamma joydan chiqish
        </Button>
      </section>
    </div>
  );
}
