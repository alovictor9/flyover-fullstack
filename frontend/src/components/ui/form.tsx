'use client';
import { forwardRef, useId, useState, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { clsx } from 'clsx';
import { Eye, EyeOff, Check } from 'lucide-react';

const control =
  'block w-full rounded-xl border bg-white px-3.5 text-sm text-navy-800 placeholder:text-slate-light transition-colors focus:outline-none focus:ring-2 focus:ring-navy-200 focus:border-navy-400 disabled:bg-mist disabled:text-slate';

export function Field({
  label,
  hint,
  error,
  required,
  children,
  htmlFor,
  className,
}: {
  label: string;
  hint?: ReactNode;
  error?: string;
  required?: boolean;
  children: ReactNode;
  htmlFor?: string;
  className?: string;
}) {
  return (
    <div className={clsx('space-y-1.5', className)}>
      <label htmlFor={htmlFor} className="block text-sm font-medium text-navy-700">
        {label}
        {required && (
          <span className="text-brick-500" aria-hidden>
            {' '}*
          </span>
        )}
      </label>
      {children}
      {error ? (
        <p className="text-xs font-medium text-brick-600" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-slate">{hint}</p>
      ) : null}
    </div>
  );
}

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  hint?: ReactNode;
  error?: string;
  prefix?: string;
  suffix?: string;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hint, error, prefix, suffix, className, id, required, type, ...rest },
  ref,
) {
  const auto = useId();
  const fid = id ?? auto;
  const [show, setShow] = useState(false);
  const isPw = type === 'password';
  const el = (
    <div className="relative flex items-center">
      {prefix && <span className="pointer-events-none absolute left-3.5 text-sm text-slate">{prefix}</span>}
      <input
        ref={ref}
        id={fid}
        type={isPw && show ? 'text' : type}
        required={required}
        aria-invalid={!!error || undefined}
        aria-describedby={error || hint ? `${fid}-desc` : undefined}
        className={clsx(
          control,
          'h-11',
          error ? 'border-brick-400' : 'border-line',
          prefix && 'pl-12',
          (suffix || isPw) && 'pr-11',
          className,
        )}
        {...rest}
      />
      {suffix && <span className="pointer-events-none absolute right-3.5 text-sm text-slate">{suffix}</span>}
      {isPw && (
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="absolute right-2 rounded-lg p-1.5 text-slate hover:text-navy-700"
          aria-label={show ? 'Hide password' : 'Show password'}
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      )}
    </div>
  );
  if (!label) return el;
  return (
    <Field label={label} hint={hint} error={error} required={required} htmlFor={fid}>
      {el}
    </Field>
  );
});

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string; hint?: ReactNode; error?: string };
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, hint, error, className, id, required, rows = 4, ...rest },
  ref,
) {
  const auto = useId();
  const fid = id ?? auto;
  const el = (
    <textarea
      ref={ref}
      id={fid}
      rows={rows}
      required={required}
      aria-invalid={!!error || undefined}
      className={clsx(control, 'py-2.5', error ? 'border-brick-400' : 'border-line', className)}
      {...rest}
    />
  );
  if (!label) return el;
  return (
    <Field label={label} hint={hint} error={error} required={required} htmlFor={fid}>
      {el}
    </Field>
  );
});

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
  hint?: ReactNode;
  error?: string;
  options: { value: string; label: string }[];
  placeholder?: string;
};
export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, hint, error, options, placeholder, className, id, required, ...rest },
  ref,
) {
  const auto = useId();
  const fid = id ?? auto;
  const el = (
    <select
      ref={ref}
      id={fid}
      required={required}
      aria-invalid={!!error || undefined}
      className={clsx(control, 'h-11 pr-8', error ? 'border-brick-400' : 'border-line', className)}
      {...rest}
    >
      {placeholder !== undefined && <option value="">{placeholder}</option>}
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
  if (!label) return el;
  return (
    <Field label={label} hint={hint} error={error} required={required} htmlFor={fid}>
      {el}
    </Field>
  );
});

/** Multi-select chip group (channels, interests). */
export function ChipSelect({
  label,
  hint,
  options,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  options: string[];
  value: string[];
  onChange: (v: string[]) => void;
}) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium text-navy-700">{label}</legend>
      {hint && <p className="text-xs text-slate">{hint}</p>}
      <div className="flex flex-wrap gap-2">
        {options.map((o) => {
          const on = value.includes(o);
          return (
            <button
              key={o}
              type="button"
              aria-pressed={on}
              onClick={() => onChange(on ? value.filter((x) => x !== o) : [...value, o])}
              className={clsx(
                'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors',
                on ? 'border-navy-700 bg-navy-700 text-white' : 'border-line bg-white text-navy-700 hover:border-navy-300',
              )}
            >
              {on && <Check className="h-3.5 w-3.5" aria-hidden />}
              {o}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

/** Card-style single choice (role picker, access mode, commission type). */
export function ChoiceCards<V extends string>({
  label,
  value,
  onChange,
  options,
  columns = 2,
}: {
  label?: string;
  value: V;
  onChange: (v: V) => void;
  options: { value: V; title: string; description?: string; icon?: ReactNode; disabled?: boolean; badge?: string }[];
  columns?: 2 | 3 | 4;
}) {
  return (
    <fieldset className="space-y-2">
      {label && <legend className="mb-2 text-sm font-medium text-navy-700">{label}</legend>}
      <div className={clsx('grid gap-3', columns === 2 ? 'sm:grid-cols-2' : columns === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2 lg:grid-cols-4')}>
        {options.map((o) => {
          const on = o.value === value;
          return (
            <button
              type="button"
              key={o.value}
              disabled={o.disabled}
              role="radio"
              aria-checked={on}
              onClick={() => onChange(o.value)}
              className={clsx(
                'relative flex h-full flex-col items-start gap-1 rounded-xl border p-4 text-left transition-all disabled:cursor-not-allowed disabled:opacity-50',
                on ? 'border-navy-700 bg-navy-50 ring-1 ring-navy-700' : 'border-line bg-white hover:border-navy-300',
              )}
            >
              <div className="flex w-full items-center gap-2">
                {o.icon && <span className={clsx(on ? 'text-navy-700' : 'text-slate')}>{o.icon}</span>}
                <span className="font-semibold text-navy-800">{o.title}</span>
                {o.badge && <span className="ml-auto rounded-full bg-mist px-2 py-0.5 text-[11px] font-medium text-slate">{o.badge}</span>}
              </div>
              {o.description && <span className="text-xs leading-relaxed text-slate">{o.description}</span>}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

export function FormError({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <div role="alert" className="rounded-xl border border-brick-200 bg-brick-50 px-4 py-3 text-sm font-medium text-brick-700">
      {message}
    </div>
  );
}
