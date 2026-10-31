import { useState, type ReactNode } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import {
  loginSchema,
  passwordSchema,
  registerSchema,
  type LoginInput,
  type RegisterInput,
} from '@avlod/shared';
import { useAuth } from '../features/auth/AuthProvider';
import { Logo } from '../components/ui/Brand';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Field';
import { FormError } from '../components/ui/States';
import { api, errorMessage, fieldErrors } from '../lib/api';
import { HeroArt } from '../features/landing/HeroArt';

/** Only allow in-app redirects after sign-in (no open redirects). */
function safeNext(next: string | null) {
  return next && next.startsWith('/') && !next.startsWith('//') ? next : '/dashboard';
}

function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      <div className="relative hidden overflow-hidden lg:block" aria-hidden>
        <HeroArt className="absolute inset-0 h-full w-full" />
        <div className="absolute inset-0 bg-gradient-to-r from-ink-900/30 via-ink-900/40 to-ink-900" />
        <div className="absolute bottom-16 left-16 max-w-md">
          <p className="eyebrow">AVLOD</p>
          <p className="mt-4 font-serif text-4xl italic leading-tight text-parchment">
            “Ildizini unutgan daraxt shamolga dosh berolmaydi.”
          </p>
          <p className="mt-3 text-sm text-sage-400">— Xalq maqoli</p>
        </div>
      </div>
      <main className="flex items-center justify-center px-5 py-16">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-md"
        >
          <Link to="/" aria-label="Bosh sahifa">
            <Logo />
          </Link>
          <h1 className="mt-10 font-serif text-4xl text-parchment">{title}</h1>
          <p className="mt-2 text-sage-400">{subtitle}</p>
          <div className="mt-8">{children}</div>
          <div className="mt-8 text-sm text-sage-400">{footer}</div>
        </motion.div>
      </main>
    </div>
  );
}

export function LoginPage() {
  const { login, status } = useAuth();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const form = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });
  if (status === 'authenticated') return <Navigate to={safeNext(params.get('next'))} replace />;
  const submit = form.handleSubmit(async (v) => {
    setError(null);
    try {
      await login(v);
      navigate(safeNext(params.get('next')), { replace: true });
    } catch (e) {
      setError(errorMessage(e));
    }
  });
  return (
    <AuthShell
      title="Xush kelibsiz"
      subtitle="Oilangiz tarixiga qaytish uchun tizimga kiring."
      footer={
        <>
          Hisobingiz yo‘qmi?{' '}
          <Link
            to={`/register${params.get('next') ? `?next=${encodeURIComponent(params.get('next')!)}` : ''}`}
            className="text-gold-300 hover:underline"
          >
            Ro‘yxatdan o‘ting
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-5" noValidate>
        <FormError message={error} />
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          {...form.register('email')}
          error={form.formState.errors.email?.message}
        />
        <Input
          label="Parol"
          type="password"
          autoComplete="current-password"
          {...form.register('password')}
          error={form.formState.errors.password?.message}
        />
        <div className="flex justify-end">
          <Link to="/forgot-password" className="text-sm text-sage-400 hover:text-parchment">
            Parolni unutdingizmi?
          </Link>
        </div>
        <Button type="submit" size="lg" className="w-full" loading={form.formState.isSubmitting}>
          Kirish
        </Button>
      </form>
    </AuthShell>
  );
}

export function RegisterPage() {
  const { register: signUp, status } = useAuth();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const form = useForm<RegisterInput>({ resolver: zodResolver(registerSchema) });
  if (status === 'authenticated') return <Navigate to={safeNext(params.get('next'))} replace />;
  const submit = form.handleSubmit(async (v) => {
    setError(null);
    try {
      await signUp(v);
      navigate(safeNext(params.get('next')), { replace: true });
    } catch (e) {
      Object.entries(fieldErrors(e)).forEach(([k, m]) =>
        form.setError(k as keyof RegisterInput, { message: m }),
      );
      setError(errorMessage(e));
    }
  });
  const e = form.formState.errors;
  return (
    <AuthShell
      title="Merosni boshlang"
      subtitle="Hisob yarating va oilangizning shaxsiy ish maydonini oching."
      footer={
        <>
          Hisobingiz bormi?{' '}
          <Link to="/login" className="text-gold-300 hover:underline">
            Kirish
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-5" noValidate>
        <FormError message={error} />
        <Input
          label="Ismingiz"
          autoComplete="name"
          {...form.register('displayName')}
          error={e.displayName?.message}
        />
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          {...form.register('email')}
          error={e.email?.message}
        />
        <Input
          label="Parol"
          type="password"
          autoComplete="new-password"
          hint="Kamida 10 belgi, harf va raqam"
          {...form.register('password')}
          error={e.password?.message}
        />
        <Button type="submit" size="lg" className="w-full" loading={form.formState.isSubmitting}>
          Hisob yaratish
        </Button>
        <p className="text-xs leading-relaxed text-sage-500">
          Ro‘yxatdan o‘tish orqali{' '}
          <Link to="/privacy" className="underline">
            maxfiylik siyosati
          </Link>{' '}
          bilan tanishganingizni tasdiqlaysiz.
        </p>
      </form>
    </AuthShell>
  );
}

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  return (
    <AuthShell
      title="Parolni tiklash"
      subtitle="Email manzilingizni kiriting — tiklash havolasini yuboramiz."
      footer={
        <Link to="/login" className="text-gold-300 hover:underline">
          Kirish sahifasiga qaytish
        </Link>
      }
    >
      {sent ? (
        <p
          role="status"
          className="rounded-2xl border border-gold-400/30 bg-gold-400/5 p-5 text-sage-300"
        >
          {sent}
        </p>
      ) : (
        <form
          className="space-y-5"
          onSubmit={async (ev) => {
            ev.preventDefault();
            setError(null);
            setLoading(true);
            try {
              const r = await api.post<{ message: string }>(
                '/auth/password-reset/request',
                { email },
                { noRetry: true },
              );
              setSent(r.message);
            } catch (e) {
              setError(errorMessage(e));
            } finally {
              setLoading(false);
            }
          }}
        >
          <FormError message={error} />
          <Input
            label="Email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(ev) => setEmail(ev.target.value)}
          />
          <Button type="submit" size="lg" className="w-full" loading={loading}>
            Havola yuborish
          </Button>
        </form>
      )}
    </AuthShell>
  );
}

const resetSchema = z
  .object({ password: passwordSchema, confirm: z.string() })
  .refine((v) => v.password === v.confirm, { message: 'Parollar mos emas', path: ['confirm'] });

export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const form = useForm<z.infer<typeof resetSchema>>({ resolver: zodResolver(resetSchema) });
  return (
    <AuthShell
      title="Yangi parol"
      subtitle="Hisobingiz uchun yangi parol o‘rnating."
      footer={
        <Link to="/login" className="text-gold-300 hover:underline">
          Kirish
        </Link>
      }
    >
      {!token ? (
        <FormError message="Havola noto‘liq. Emaildagi havolani qayta oching." />
      ) : done ? (
        <p
          role="status"
          className="rounded-2xl border border-gold-400/30 bg-gold-400/5 p-5 text-sage-300"
        >
          Parol yangilandi. Barcha qurilmalardagi eski sessiyalar yopildi.{' '}
          <Link to="/login" className="text-gold-300 underline">
            Kirish
          </Link>
        </p>
      ) : (
        <form
          className="space-y-5"
          noValidate
          onSubmit={form.handleSubmit(async (v) => {
            setError(null);
            try {
              await api.post(
                '/auth/password-reset/confirm',
                { token, password: v.password },
                { noRetry: true },
              );
              setDone(true);
            } catch (e) {
              setError(errorMessage(e));
            }
          })}
        >
          <FormError message={error} />
          <Input
            label="Yangi parol"
            type="password"
            autoComplete="new-password"
            {...form.register('password')}
            error={form.formState.errors.password?.message}
          />
          <Input
            label="Parolni takrorlang"
            type="password"
            autoComplete="new-password"
            {...form.register('confirm')}
            error={form.formState.errors.confirm?.message}
          />
          <Button type="submit" size="lg" className="w-full" loading={form.formState.isSubmitting}>
            Saqlash
          </Button>
        </form>
      )}
    </AuthShell>
  );
}
