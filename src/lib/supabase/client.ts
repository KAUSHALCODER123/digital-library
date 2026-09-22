'use client';

import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseEnv } from './env';
import type { Database } from './types';

let client: SupabaseClient<Database> | null | undefined;

/** Browser client singleton, or null when Supabase isn't configured (guest-only mode). */
export function getBrowserSupabase(): SupabaseClient<Database> | null {
  if (client !== undefined) return client;
  const env = getSupabaseEnv();
  client = env ? createBrowserClient<Database>(env.url, env.key) : null;
  return client;
}
