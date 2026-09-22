import type { Metadata } from 'next';
import Link from 'next/link';
import { AccountsUnavailable } from '@/components/auth/AccountsUnavailable';
import { AuthCard } from '@/components/auth/AuthCard';
import { ForgotPasswordForm } from '@/components/auth/PasswordForms';
import { isSupabaseConfigured } from '@/lib/supabase/env';

export const metadata: Metadata = { title: 'Reset your password', robots: { index: false } };

export default function ForgotPasswordPage() {
  if (!isSupabaseConfigured()) return <AccountsUnavailable />;
  return (
    <AuthCard
      title="Reset your password"
      lead="Enter your email and we’ll send you a link to choose a new password."
      footer={
        <Link href="/login" className="font-semibold text-forest">
          Back to sign in
        </Link>
      }
    >
      <ForgotPasswordForm />
    </AuthCard>
  );
}
