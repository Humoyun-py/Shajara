import {
  forwardRef,
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import { cn } from '../../lib/utils';

const control =
  'w-full rounded-xl border border-white/10 bg-ink-950/60 px-4 text-[15px] text-parchment placeholder:text-sage-600 transition-colors focus:border-gold-400/60 focus:outline-none focus:ring-2 focus:ring-gold-400/20 aria-[invalid=true]:border-danger/60';

interface FieldWrapProps {
  label: string;
  error?: string;
  hint?: string;
  children: (props: {
    id: string;
    'aria-invalid'?: boolean;
    'aria-describedby'?: string;
  }) => ReactNode;
  className?: string;
}

/** Associates label, hint and error text with the control for screen readers. */
export function FieldWrap({ label, error, hint, children, className }: FieldWrapProps) {
  const id = useId();
  const describedBy =
    [hint && `${id}-hint`, error && `${id}-err`].filter(Boolean).join(' ') || undefined;
  return (
    <div className={cn('space-y-1.5', className)}>
      <label htmlFor={id} className="block text-[13px] font-medium text-sage-300">
        {label}
      </label>
      {children({ id, 'aria-invalid': error ? true : undefined, 'aria-describedby': describedBy })}
      {hint && !error && (
        <p id={`${id}-hint`} className="text-xs text-sage-500">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-err`} role="alert" className="text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
  hint?: string;
  wrapClassName?: string;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, hint, wrapClassName, className, ...rest },
  ref,
) {
  return (
    <FieldWrap label={label} error={error} hint={hint} className={wrapClassName}>
      {(a) => <input ref={ref} className={cn(control, 'h-12', className)} {...a} {...rest} />}
    </FieldWrap>
  );
});

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string;
  error?: string;
  hint?: string;
  wrapClassName?: string;
};

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, error, hint, wrapClassName, className, rows = 4, ...rest },
  ref,
) {
  return (
    <FieldWrap label={label} error={error} hint={hint} className={wrapClassName}>
      {(a) => (
        <textarea
          ref={ref}
          rows={rows}
          className={cn(control, 'py-3 leading-relaxed', className)}
          {...a}
          {...rest}
        />
      )}
    </FieldWrap>
  );
});

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  error?: string;
  hint?: string;
  wrapClassName?: string;
};

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, error, hint, wrapClassName, className, children, ...rest },
  ref,
) {
  return (
    <FieldWrap label={label} error={error} hint={hint} className={wrapClassName}>
      {(a) => (
        <select
          ref={ref}
          className={cn(control, 'h-12 appearance-none bg-[length:12px] pr-10', className)}
          {...a}
          {...rest}
        >
          {children}
        </select>
      )}
    </FieldWrap>
  );
});

export function Checkbox({
  label,
  ...rest
}: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  const id = useId();
  return (
    <label
      htmlFor={id}
      className="inline-flex cursor-pointer items-center gap-2.5 text-sm text-sage-300"
    >
      <input
        id={id}
        type="checkbox"
        className="h-4 w-4 rounded border-white/20 bg-ink-950 accent-gold-400"
        {...rest}
      />
      {label}
    </label>
  );
}
