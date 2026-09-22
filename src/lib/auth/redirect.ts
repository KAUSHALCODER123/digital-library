/**
 * Only same-site paths are allowed as post-login destinations, so a crafted `?next=` link
 * can't send someone to another site after they sign in.
 */
export function safeNext(next: string | null | undefined, fallback = '/'): string {
  if (!next || typeof next !== 'string') return fallback;
  let decoded = next;
  try {
    decoded = decodeURIComponent(next);
  } catch {
    return fallback;
  }
  if (!decoded.startsWith('/') || decoded.startsWith('//') || decoded.startsWith('/\\')) return fallback;
  if (/[\u0000-\u001f]/.test(decoded) || /^\/+[a-z][a-z0-9+.-]*:/i.test(decoded)) return fallback;
  if (decoded.startsWith('/auth/') && !decoded.startsWith('/auth/update-password')) return fallback;
  return decoded.length > 512 ? fallback : decoded;
}

/** Supabase error messages, rewritten for readers. */
export function authErrorMessage(err: { message?: string; code?: string; status?: number } | null | undefined): string {
  const m = (err?.message ?? '').toLowerCase();
  const code = err?.code ?? '';
  if (code === 'invalid_credentials' || m.includes('invalid login credentials'))
    return 'That email and password don’t match. Check them and try again.';
  if (code === 'email_not_confirmed' || m.includes('email not confirmed'))
    return 'Confirm your email address first. We sent you a link when you signed up.';
  if (code === 'user_already_exists' || m.includes('already registered'))
    return 'An account with this email already exists. Sign in instead.';
  if (code === 'weak_password' || m.includes('password should'))
    return 'Choose a stronger password: at least 8 characters, ideally a short phrase.';
  if (code === 'over_email_send_rate_limit' || code === 'over_request_rate_limit' || err?.status === 429 || m.includes('rate limit'))
    return 'Too many attempts. Wait a minute, then try again.';
  if (m.includes('provider is not enabled') || m.includes('unsupported provider'))
    return 'Google sign-in isn’t available yet. Use your email and password.';
  if (code === 'same_password') return 'Your new password must be different from the old one.';
  if (m.includes('fetch') || m.includes('network')) return 'Couldn’t reach the sign-in service. Check your connection and try again.';
  return 'Something went wrong. Try again in a moment.';
}
