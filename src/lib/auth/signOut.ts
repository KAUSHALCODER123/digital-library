'use client';

import { useShelf } from '@/lib/shelf/store';
import { writeStorage } from '@/lib/storage';
import { getBrowserSupabase } from '@/lib/supabase/client';
import { useAuth } from './store';

export const SHELF_OWNER_KEY = 'bib-shelf-owner';

/**
 * Sign out and forget this reader's shelf on this device, so the next person using a shared
 * library computer starts with an empty guest shelf.
 */
export async function signOutEverywhere(): Promise<void> {
  const supabase = getBrowserSupabase();
  useShelf.getState().setRemote(null);
  useShelf.getState().clear();
  writeStorage(SHELF_OWNER_KEY, null);
  useAuth.getState().set({ status: 'guest', user: null });
  await supabase?.auth.signOut().catch(() => undefined);
}
