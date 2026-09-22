import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { isMock } from '@/lib/books';
import { getSupabaseEnv } from '@/lib/supabase/env';
import type { Database } from '@/lib/supabase/types';

/** Records a search term for the staff "top searches" report. Best-effort, never blocks a page. */
export async function logSearch(term: string): Promise<void> {
  const env = getSupabaseEnv();
  if (!env || isMock()) return;
  try {
    const supabase = createClient<Database>(env.url, env.key, { auth: { persistSession: false } });
    await supabase.rpc('log_search', { p_term: term });
  } catch {
    // Analytics must never affect searching.
  }
}
