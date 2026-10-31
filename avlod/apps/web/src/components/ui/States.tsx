import type { ReactNode } from 'react';
import { AlertTriangle, Lock } from 'lucide-react';
import { ApiError } from '../../lib/api';
import { cn } from '../../lib/utils';
import { Button } from './Button';

export function Spinner({
  label = 'Yuklanmoqda…',
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <div
      role="status"
      className={cn(
        'flex flex-col items-center justify-center gap-4 py-16 text-sage-400',
        className,
      )}
    >
      <span className="relative h-10 w-10" aria-hidden>
        <span className="absolute inset-0 rounded-full border border-gold-400/15" />
        <span className="absolute inset-0 animate-spin rounded-full border border-transparent border-t-gold-400" />
      </span>
      <span className="text-sm">{label}</span>
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn('animate-pulse rounded-xl bg-white/[0.04]', className)} />;
}

export function EmptyState({
  icon,
  title,
  children,
  action,
}: {
  icon?: ReactNode;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-6 py-20 text-center">
      {icon && (
        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full border border-gold-400/25 text-gold-400">
          {icon}
        </div>
      )}
      <h3 className="font-serif text-3xl text-parchment">{title}</h3>
      {children && <div className="mt-3 text-sm leading-relaxed text-sage-400">{children}</div>}
      {action && <div className="mt-8">{action}</div>}
    </div>
  );
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const status = error instanceof ApiError ? error.status : 0;
  if (status === 403) {
    return (
      <EmptyState icon={<Lock className="h-6 w-6" />} title="Ruxsat yo‘q">
        Bu sahifani ko‘rish uchun oila administratoridan kerakli rolni so‘rang.
      </EmptyState>
    );
  }
  if (status === 404) {
    return (
      <EmptyState icon={<AlertTriangle className="h-6 w-6" />} title="Topilmadi">
        Bu yozuv mavjud emas yoki sizda unga kirish huquqi yo‘q.
      </EmptyState>
    );
  }
  return (
    <EmptyState
      icon={<AlertTriangle className="h-6 w-6" />}
      title="Nimadir noto‘g‘ri ketdi"
      action={
        onRetry && (
          <Button variant="secondary" onClick={onRetry}>
            Qayta urinish
          </Button>
        )
      }
    >
      {error instanceof Error ? error.message : 'Kutilmagan xatolik yuz berdi.'}
    </EmptyState>
  );
}

export function Badge({
  children,
  tone = 'neutral',
  className,
}: {
  children: ReactNode;
  tone?: 'neutral' | 'gold' | 'warn';
  className?: string;
}) {
  const tones = {
    neutral: 'border-white/10 bg-white/[0.04] text-sage-300',
    gold: 'border-gold-400/30 bg-gold-400/10 text-gold-300',
    warn: 'border-danger/30 bg-danger/10 text-danger',
  };
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-medium',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function FormError({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <p
      role="alert"
      className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger"
    >
      {message}
    </p>
  );
}
