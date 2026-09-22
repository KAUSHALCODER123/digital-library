import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { AccountsUnavailable } from '@/components/auth/AccountsUnavailable';
import { AuthCard } from '@/components/auth/AuthCard';
import { UpdatePasswordForm } from '@/components/auth/PasswordForms';
import { isSupabaseConfigured } from '@/lib/supabase/env';
import { getCurrentUser } from '@/lib/supabase/server';

// Always per-request: these pages depend on the signed-in reader.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: 'Choose a new password', robots: { index: false } };

export default async function UpdatePasswordPage() {
  if (!isSupabaseConfigured()) return <AccountsUnavailable />;
  // The reset link signs the reader in first; without a session the link was invalid or expired.
  if (!(await getCurrentUser())) redirect('/login?error=link');
  return (
    <AuthCard title="Choose a new password">
      <UpdatePasswordForm />
    </AuthCard>
  );
}
