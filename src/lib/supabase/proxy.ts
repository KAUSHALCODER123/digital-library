import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { getSupabaseEnv } from './env';

/** Refreshes the auth session cookie on every matched request. */
export async function updateSession(request: NextRequest): Promise<NextResponse> {
  let response = NextResponse.next({ request });
  const env = getSupabaseEnv();
  if (!env) return response;

  const supabase = createServerClient(env.url, env.key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (toSet) => {
        for (const { name, value } of toSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of toSet) response.cookies.set(name, value, options);
      },
    },
  });

  // Must run between client creation and returning the response; it triggers the refresh.
  await supabase.auth.getClaims();
  return response;
}
