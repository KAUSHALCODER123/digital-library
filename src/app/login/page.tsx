import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AuthCard } from '@/components/auth/AuthCard';
import { LoginForm } from '@/components/auth/LoginForm';
import { AccountsUnavailable } from '@/components/auth/AccountsUnavailable';
import { safeNext } from '@/lib/auth/redirect';
import { isSupabaseConfigured } from '@/lib/supabase/env';
import { getCurrentUser } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Sign in', robots: { index: false } };

const ERRORS: Record<string, string> = {
  link: 'That sign-in link is invalid or has expired. Sign in, or request a new link.',
  oauth: 'Google sign-in didn’t finish. Try again, or use your email and password.',
};

type Props = { searchParams: Promise<{ next?: string; error?: string }> };

export default async function LoginPage({ searchParams }: Props) {
  const sp = await searchParams;
  const next = safeNext(sp.next);
  if (!isSupabaseConfigured()) return <AccountsUnavailable />;
  if (await getCurrentUser()) redirect(next);

  return (
    <AuthCard
      title="Sign in"
      lead="Keep your shelf and reviews on every device. You don’t need an account to search or read."
      footer={
        <>
          New here?{' '}
          <Link href={`/register${next !== '/' ? `?next=${encodeURIComponent(next)}` : ''}`} className="font-semibold text-forest">
            Get a library card
          </Link>
        </>
      }
    >
      <LoginForm next={next} initialError={sp.error ? ERRORS[sp.error] : undefined} />
    </AuthCard>
  );
}
