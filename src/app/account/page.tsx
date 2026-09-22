import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { AccountView } from '@/components/account/AccountView';
import { AccountsUnavailable } from '@/components/auth/AccountsUnavailable';
import { isSupabaseConfigured } from '@/lib/supabase/env';
import { getCurrentUser } from '@/lib/supabase/server';

// Always per-request: these pages depend on the signed-in reader.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: 'Account', robots: { index: false } };

export default async function AccountPage() {
  if (!isSupabaseConfigured()) return <AccountsUnavailable />;
  const session = await getCurrentUser();
  if (!session) redirect('/login?next=/account');
  const { data: profile } = await session.supabase
    .from('profiles')
    .select('display_name, show_mature')
    .eq('id', session.user.id)
    .maybeSingle();
  return (
    <AccountView
      email={session.user.email}
      initialName={profile?.display_name ?? ''}
      initialShowMature={profile?.show_mature ?? false}
    />
  );
}
