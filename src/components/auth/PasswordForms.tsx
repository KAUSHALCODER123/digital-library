'use client';

import { MailCheck } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useId, useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { buttonClasses } from '@/components/ui/button';
import { authErrorMessage } from '@/lib/auth/redirect';
import { getBrowserSupabase } from '@/lib/supabase/client';
import { fieldClass, labelClass } from './AuthCard';

export function ForgotPasswordForm() {
  const id = useId();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setError('Enter the email address you signed up with.');
      return;
    }
    const supabase = getBrowserSupabase();
    if (!supabase) return;
    setBusy(true);
    setError(null);
    const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent('/auth/update-password')}`,
    });
    setBusy(false);
    // Don't reveal whether an account exists; only rate limits and outages are shown.
    if (err && (err.status === 429 || /rate limit|fetch|network/i.test(err.message))) {
      setError(authErrorMessage(err));
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <div role="status" className="space-y-3">
        <MailCheck aria-hidden className="size-8 text-forest" strokeWidth={1.5} />
        <p className="text-body text-ink">If there’s an account for that email, a link to reset your password is on its way.</p>
        <Link href="/login" className="text-ui font-semibold text-forest">
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <div>
        <label htmlFor={`${id}-email`} className={labelClass}>
          Email
        </label>
        <input
          id={`${id}-email`}
          type="email"
          autoComplete="email"
          inputMode="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-invalid={!!error}
          className={fieldClass}
        />
      </div>
      {error && (
        <p role="alert" className="text-ui text-danger">
          {error}
        </p>
      )}
      <button type="submit" disabled={busy} className={buttonClasses('primary', 'lg', 'w-full')}>
        {busy ? 'Sending…' : 'Send reset link'}
      </button>
    </form>
  );
}

export function UpdatePasswordForm() {
  const id = useId();
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (password.length < 8) return setError('Use at least 8 characters.');
    if (password !== confirm) return setError('The two passwords don’t match.');
    const supabase = getBrowserSupabase();
    if (!supabase) return;
    setBusy(true);
    setError(null);
    const { error: err } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (err) {
      setError(err.status === 401 || /session/i.test(err.message) ? 'This reset link has expired. Request a new one.' : authErrorMessage(err));
      return;
    }
    toast.success('Password updated');
    router.replace('/account');
    router.refresh();
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <div>
        <label htmlFor={`${id}-pw`} className={labelClass}>
          New password
        </label>
        <input id={`${id}-pw`} type="password" autoComplete="new-password" maxLength={72} value={password} onChange={(e) => setPassword(e.target.value)} className={fieldClass} />
      </div>
      <div>
        <label htmlFor={`${id}-pw2`} className={labelClass}>
          Confirm new password
        </label>
        <input id={`${id}-pw2`} type="password" autoComplete="new-password" maxLength={72} value={confirm} onChange={(e) => setConfirm(e.target.value)} className={fieldClass} />
      </div>
      {error && (
        <p role="alert" className="text-ui text-danger">
          {error}{' '}
          {error.includes('expired') && (
            <Link href="/forgot-password" className="font-semibold text-forest">
              Send a new link
            </Link>
          )}
        </p>
      )}
      <button type="submit" disabled={busy} className={buttonClasses('primary', 'lg', 'w-full')}>
        {busy ? 'Saving…' : 'Save new password'}
      </button>
    </form>
  );
}
