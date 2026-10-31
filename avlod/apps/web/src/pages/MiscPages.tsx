import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { MailOpen } from 'lucide-react';
import { LABELS, type InvitationPreviewDTO } from '@avlod/shared';
import { useAuth } from '../features/auth/AuthProvider';
import { SiteNav } from '../layouts/SiteNav';
import { SiteFooter } from '../layouts/SiteFooter';
import { Button, ButtonLink } from '../components/ui/Button';
import { ErrorState, FormError, Spinner } from '../components/ui/States';
import { LogoMark } from '../components/ui/Brand';
import { api, errorMessage } from '../lib/api';
import { qk } from '../services/queries';

export function InvitationPage() {
  const { token = '' } = useParams();
  const { status, user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<'accept' | 'decline' | null>(null);
  const preview = useQuery({
    queryKey: ['invitation', token],
    queryFn: () => api.get<InvitationPreviewDTO>(`/invitations/preview/${token}`),
    retry: false,
  });
  const next = encodeURIComponent(`/invitations/${token}`);

  const respond = async (action: 'accept' | 'decline') => {
    setError(null);
    setBusy(action);
    try {
      const r = await api.post<{ familyId: string }>(`/invitations/${action}`, { token });
      await qc.invalidateQueries({ queryKey: qk.families });
      navigate(action === 'accept' ? `/family/${r.familyId}/tree` : '/dashboard');
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex min-h-screen flex-col">
      <SiteNav />
      <main className="flex flex-1 items-center justify-center px-5 pb-16 pt-28">
        {preview.isLoading ? (
          <Spinner />
        ) : preview.error || !preview.data ? (
          <ErrorState error={preview.error} />
        ) : (
          <div className="panel w-full max-w-lg p-8 text-center">
            <MailOpen className="mx-auto h-8 w-8 text-gold-400" aria-hidden />
            <p className="eyebrow mt-6">Oilaviy taklif</p>
            <h1 className="mt-3 font-serif text-4xl text-parchment">{preview.data.familyName}</h1>
            <p className="mt-3 text-sage-400">
              {preview.data.invitedBy ?? 'Oila a’zosi'} sizni{' '}
              <strong className="text-parchment">{LABELS.role[preview.data.role]}</strong> sifatida
              taklif qildi.
            </p>
            <p className="mt-1 text-xs text-sage-500">
              Taklif {preview.data.email} uchun ·{' '}
              {new Date(preview.data.expiresAt).toLocaleDateString('uz-UZ')} gacha
            </p>
            <div className="mt-6">
              <FormError message={error} />
            </div>
            {preview.data.status !== 'PENDING' ? (
              <p className="mt-6 text-sage-400">Bu taklif endi faol emas.</p>
            ) : status !== 'authenticated' ? (
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
                <ButtonLink to={`/login?next=${next}`}>Kirish va qabul qilish</ButtonLink>
                <ButtonLink to={`/register?next=${next}`} variant="secondary">
                  Ro‘yxatdan o‘tish
                </ButtonLink>
              </div>
            ) : user?.email !== preview.data.email ? (
              <p className="mt-6 text-sm text-danger">
                Siz {user?.email} sifatida kirgansiz. Taklifni qabul qilish uchun{' '}
                {preview.data.email} bilan kiring.
              </p>
            ) : (
              <div className="mt-8 flex justify-center gap-3">
                <Button
                  variant="ghost"
                  loading={busy === 'decline'}
                  onClick={() => respond('decline')}
                >
                  Rad etish
                </Button>
                <Button loading={busy === 'accept'} onClick={() => respond('accept')}>
                  Qabul qilish
                </Button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export function PrivacyPage() {
  return (
    <>
      <SiteNav />
      <main className="container-x max-w-3xl pb-24 pt-32">
        <p className="eyebrow">Maxfiylik</p>
        <h1 className="mt-3 font-serif text-5xl text-parchment">Oilangiz ma’lumotlari — sizniki</h1>
        <div className="mt-10 space-y-8 leading-relaxed text-sage-300 [&_h2]:mb-2 [&_h2]:font-serif [&_h2]:text-2xl [&_h2]:text-parchment">
          <section>
            <h2>Shaxsiy ish maydonlari</h2>
            <p>
              Har bir oila ish maydoni sukut bo‘yicha shaxsiy. Uni faqat egasi taklif qilgan va
              taklifni qabul qilgan foydalanuvchilar ko‘radi. Ruxsatlar serverda har bir so‘rovda
              tekshiriladi.
            </p>
          </section>
          <section>
            <h2>Tirik qarindoshlar</h2>
            <p>
              Tirik insonlarning aniq tug‘ilgan sanasi va joyi faqat muharrir va undan yuqori
              rollarga ko‘rinadi. Ichki tadqiqot izohlari faqat muharrirlarga ochiq.
            </p>
          </section>
          <section>
            <h2>Media fayllar</h2>
            <p>
              Suratlar va videolar yopiq ombor (object storage)da saqlanadi va faqat vaqtinchalik
              imzolangan havolalar orqali ochiladi. Fayllar turi va hajmi yuklashda tekshiriladi.
            </p>
          </section>
          <section>
            <h2>Hisob xavfsizligi</h2>
            <p>
              Parollar bcrypt bilan xeshlanadi. Sessiyalar qisqa muddatli kirish tokenlari va
              HttpOnly cookie’dagi aylanuvchi yangilash tokenlari bilan boshqariladi. Ko‘p
              muvaffaqiyatsiz kirishlardan so‘ng hisob vaqtincha bloklanadi.
            </p>
          </section>
          <section>
            <h2>Audit</h2>
            <p>
              Muhim o‘zgarishlar (shaxslar, bog‘lanishlar, rollar, o‘chirishlar) audit jurnaliga
              yoziladi va administratorlarga ko‘rinadi.
            </p>
          </section>
          <section>
            <h2>Namuna ma’lumotlar</h2>
            <p>
              Bosh sahifadagi “Karimovlar oilasi (namuna)” — to‘liq to‘qima ma’lumot. Haqiqiy
              oilalar hech qachon avtomatik ravishda ommaga chiqarilmaydi.
            </p>
          </section>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteNav />
      <main className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <LogoMark className="h-16 w-16 text-gold-400/70" />
        <p className="eyebrow mt-8">404</p>
        <h1 className="mt-3 font-serif text-5xl text-parchment">Bu shox hali o‘smagan</h1>
        <p className="mt-3 max-w-md text-sage-400">
          Siz qidirgan sahifa topilmadi. Balki u boshqa tarmoqdadir.
        </p>
        <div className="mt-8 flex gap-3">
          <ButtonLink to="/">Bosh sahifa</ButtonLink>
          <Link
            to="/dashboard"
            className="inline-flex h-11 items-center px-5 text-sm text-sage-300 hover:text-parchment"
          >
            Oilalarim
          </Link>
        </div>
      </main>
    </div>
  );
}
