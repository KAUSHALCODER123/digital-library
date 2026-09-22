'use client';

import { MailCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useId, useState, type FormEvent } from 'react';
import { z } from 'zod';
import { buttonClasses } from '@/components/ui/button';
import { authErrorMessage } from '@/lib/auth/redirect';
import { getBrowserSupabase } from '@/lib/supabase/client';
import { fieldClass, labelClass } from './AuthCard';
import { GoogleButton } from './GoogleButton';

const schema = z.object({
  name: z.string().trim().min(1, 'Tell us what to call you.').max(60, 'Keep your name under 60 characters.'),
  email: z.string().trim().email('Enter a valid email address.'),
  password: z.string().min(8, 'Use at least 8 characters for your password.').max(72, 'Use at most 72 characters.'),
});

type Errors = Partial<Record<'name' | 'email' | 'password' | 'form', string>>;

export function RegisterForm({ next }: { next: string }) {
  const router = useRouter();
  const id = useId();
  const [values, setValues] = useState({ name: '', email: '', password: '' });
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse(values);
    if (!parsed.success) {
      const errs: Errors = {};
      for (const issue of parsed.error.issues) errs[issue.path[0] as keyof Errors] ??= issue.message;
      setErrors(errs);
      return;
    }
    const supabase = getBrowserSupabase();
    if (!supabase) return;
    setBusy(true);
    setErrors({});
    const { data, error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        data: { display_name: parsed.data.name },
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    setBusy(false);
    if (error) {
      setErrors({ form: authErrorMessage(error) });
      return;
    }
    // Supabase returns a user with no identities when the email is already registered.
    if (data.user && data.user.identities?.length === 0) {
      setErrors({ form: 'An account with this email already exists. Sign in instead.' });
      return;
    }
    if (data.session) {
      router.replace(next);
      router.refresh();
      return;
    }
    setSentTo(parsed.data.email);
  }

  if (sentTo) {
    return (
      <div role="status" className="space-y-3">
        <MailCheck aria-hidden className="size-8 text-forest" strokeWidth={1.5} />
        <p className="text-body text-ink">
          We sent a confirmation link to <strong className="break-all">{sentTo}</strong>. Open it to finish creating your
          account.
        </p>
        <p className="text-ui text-ink-muted">Nothing there? Check your spam folder, or wait a minute and sign up again.</p>
      </div>
    );
  }

  const field = (key: 'name' | 'email' | 'password') => ({
    id: `${id}-${key}`,
    value: values[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setValues((v) => ({ ...v, [key]: e.target.value })),
    'aria-invalid': !!errors[key],
    'aria-describedby': errors[key] ? `${id}-${key}-err` : key === 'password' ? `${id}-password-hint` : undefined,
    className: fieldClass,
  });

  return (
    <div className="space-y-5">
      <GoogleButton next={next} label="Sign up with Google" onError={(m) => setErrors({ form: m })} />
      <div className="flex items-center gap-3 text-caption text-ink-muted">
        <span className="h-px flex-1 bg-rule" />
        or with email
        <span className="h-px flex-1 bg-rule" />
      </div>
      <form onSubmit={submit} noValidate className="space-y-4">
        <div>
          <label htmlFor={`${id}-name`} className={labelClass}>
            Name
          </label>
          <input type="text" autoComplete="name" maxLength={60} {...field('name')} />
          {errors.name && (
            <p id={`${id}-name-err`} className="mt-1 text-caption text-danger">
              {errors.name}
            </p>
          )}
        </div>
        <div>
          <label htmlFor={`${id}-email`} className={labelClass}>
            Email
          </label>
          <input type="email" autoComplete="email" inputMode="email" {...field('email')} />
          {errors.email && (
            <p id={`${id}-email-err`} className="mt-1 text-caption text-danger">
              {errors.email}
            </p>
          )}
        </div>
        <div>
          <label htmlFor={`${id}-password`} className={labelClass}>
            Password
          </label>
          <input type="password" autoComplete="new-password" maxLength={72} {...field('password')} />
          {errors.password ? (
            <p id={`${id}-password-err`} className="mt-1 text-caption text-danger">
              {errors.password}
            </p>
          ) : (
            <p id={`${id}-password-hint`} className="mt-1 text-caption text-ink-muted">
              At least 8 characters.
            </p>
          )}
        </div>
        {errors.form && (
          <p role="alert" className="rounded-xs border-s-2 border-danger bg-danger/5 px-3 py-2 text-ui text-danger">
            {errors.form}
          </p>
        )}
        <button type="submit" disabled={busy} className={buttonClasses('primary', 'lg', 'w-full')}>
          {busy ? 'Creating your card…' : 'Create account'}
        </button>
        <p className="text-caption text-ink-muted">
          Your account keeps your shelf and reviews. Books you’ve added on this device come with you.
        </p>
      </form>
    </div>
  );
}
