'use client';

import { Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useId, useState, type FormEvent } from 'react';
import { buttonClasses } from '@/components/ui/button';
import { authErrorMessage } from '@/lib/auth/redirect';
import { getBrowserSupabase } from '@/lib/supabase/client';
import { fieldClass, labelClass } from './AuthCard';
import { GoogleButton } from './GoogleButton';

export function LoginForm({ next, initialError }: { next: string; initialError?: string }) {
  const router = useRouter();
  const id = useId();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(initialError ?? null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const supabase = getBrowserSupabase();
    if (!supabase) return;
    if (!email.trim() || !password) {
      setError('Enter your email and password.');
      return;
    }
    setBusy(true);
    setError(null);
    const { error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (err) {
      setBusy(false);
      setError(authErrorMessage(err));
      return;
    }
    router.replace(next);
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <GoogleButton next={next} onError={setError} />
      <div className="flex items-center gap-3 text-caption text-ink-muted">
        <span className="h-px flex-1 bg-rule" />
        or with email
        <span className="h-px flex-1 bg-rule" />
      </div>
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
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={fieldClass}
          />
        </div>
        <div>
          <div className="flex items-baseline justify-between">
            <label htmlFor={`${id}-password`} className={labelClass}>
              Password
            </label>
            <Link href="/forgot-password" className="text-caption text-forest">
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <input
              id={`${id}-password`}
              type={show ? 'text' : 'password'}
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`${fieldClass} pe-11`}
            />
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              className="absolute inset-y-0 end-0 mt-1.5 grid w-11 place-items-center text-ink-muted hover:text-ink"
              aria-label={show ? 'Hide password' : 'Show password'}
              aria-pressed={show}
            >
              {show ? <EyeOff aria-hidden className="size-4" /> : <Eye aria-hidden className="size-4" />}
            </button>
          </div>
        </div>
        {error && (
          <p role="alert" className="rounded-xs border-s-2 border-danger bg-danger/5 px-3 py-2 text-ui text-danger">
            {error}
          </p>
        )}
        <button type="submit" disabled={busy} className={buttonClasses('primary', 'lg', 'w-full')}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}
