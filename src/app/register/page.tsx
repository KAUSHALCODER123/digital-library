import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AccountsUnavailable } from '@/components/auth/AccountsUnavailable';
import { AuthCard } from '@/components/auth/AuthCard';
import { RegisterForm } from '@/components/auth/RegisterForm';
import { safeNext } from '@/lib/auth/redirect';
import { isSupabaseConfigured } from '@/lib/supabase/env';
import { getCurrentUser } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Get a library card', robots: { index: false } };

type Props = { searchParams: Promise<{ next?: string }> };

export default async function RegisterPage({ searchParams }: Props) {
  const next = safeNext((await searchParams).next, '/shelf');
  if (!isSupabaseConfigured()) return <AccountsUnavailable />;
  if (await getCurrentUser()) redirect(next);

  return (
    <AuthCard
      title="Get your library card"
      lead="A free account saves your shelf and reviews across devices."
      footer={
        <>
          Already have an account?{' '}
          <Link href={`/login${next !== '/shelf' ? `?next=${encodeURIComponent(next)}` : ''}`} className="font-semibold text-forest">
            Sign in
          </Link>
        </>
      }
    >
      <RegisterForm next={next} />
    </AuthCard>
  );
}
