import type { EmailOtpType } from '@supabase/supabase-js';
import { NextResponse, type NextRequest } from 'next/server';
import { safeNext } from '@/lib/auth/redirect';
import { getServerSupabase } from '@/lib/supabase/server';

const OTP_TYPES: EmailOtpType[] = ['signup', 'invite', 'magiclink', 'recovery', 'email_change', 'email'];

/**
 * Finishes OAuth sign-in and email links. Handles both the PKCE `code` flow and `token_hash`
 * links (used when the email templates point here directly).
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const next = safeNext(url.searchParams.get('next'));
  const origin = url.origin;
  const supabase = await getServerSupabase();
  if (!supabase) return NextResponse.redirect(`${origin}/`);

  const code = url.searchParams.get('code');
  const tokenHash = url.searchParams.get('token_hash');
  const type = url.searchParams.get('type') as EmailOtpType | null;

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  } else if (tokenHash && type && OTP_TYPES.includes(type)) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    if (!error) return NextResponse.redirect(`${origin}${type === 'recovery' ? '/auth/update-password' : next}`);
  }

  const reason = url.searchParams.get('error') ? 'oauth' : 'link';
  return NextResponse.redirect(`${origin}/login?error=${reason}`);
}
