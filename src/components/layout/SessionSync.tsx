'use client';

import type { User } from '@supabase/supabase-js';
import { useEffect } from 'react';
import { toast } from 'sonner';
import { SHELF_OWNER_KEY } from '@/lib/auth/signOut';
import { useAuth } from '@/lib/auth/store';
import { changedItems, mergeShelves } from '@/lib/shelf/merge';
import { fetchRemoteShelf, removeBook, saveItems } from '@/lib/shelf/remote';
import { SHELF_STORAGE_KEY, useShelf } from '@/lib/shelf/store';
import { readStorage, writeStorage } from '@/lib/storage';
import { getBrowserSupabase } from '@/lib/supabase/client';

/**
 * Owns the client session: hydrates the local shelf, keeps tabs in sync, loads the profile,
 * and merges a guest shelf into the account the first time someone signs in on this device.
 */
export function SessionSync() {
  useEffect(() => {
    // Lets tests (and CSS, if ever needed) know client JavaScript is in control.
    document.documentElement.dataset.hydrated = 'true';
    void useShelf.persist.rehydrate();
    const onStorage = (e: StorageEvent) => {
      if (e.key === SHELF_STORAGE_KEY) void useShelf.persist.rehydrate();
    };
    window.addEventListener('storage', onStorage);

    const supabase = getBrowserSupabase();
    if (!supabase) {
      useAuth.getState().set({ enabled: false, status: 'guest', user: null });
      return () => window.removeEventListener('storage', onStorage);
    }

    let currentUserId: string | null = null;
    let syncing: Promise<void> | null = null;

    async function onSignedIn(user: User) {
      if (!supabase) return;
      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name, role, show_mature')
        .eq('id', user.id)
        .maybeSingle();
      useAuth.getState().set({
        status: 'authenticated',
        user: {
          id: user.id,
          email: user.email,
          name: profile?.display_name ?? (user.user_metadata?.full_name as string | undefined) ?? undefined,
          role: profile?.role === 'staff' ? 'staff' : 'patron',
          showMature: profile?.show_mature ?? false,
        },
      });

      await useShelf.persist.rehydrate();
      const local = Object.values(useShelf.getState().items);
      const owner = readStorage(SHELF_OWNER_KEY);
      const isGuestShelf = owner !== user.id;
      try {
        const remote = await fetchRemoteShelf(supabase, user.id);
        // A shelf left by a different account on this device is not merged into this one.
        const mergeable = owner && owner !== user.id ? [] : local;
        const { items, addedFromDevice } = mergeShelves(mergeable, remote);
        await saveItems(supabase, user.id, changedItems(items, remote));
        useShelf.getState().replaceAll(items);
        writeStorage(SHELF_OWNER_KEY, user.id);
        if (isGuestShelf && addedFromDevice > 0 && !owner) {
          toast.success(
            addedFromDevice === 1
              ? 'Added 1 book from this device to your shelf.'
              : `Added ${addedFromDevice} books from this device to your shelf.`,
          );
        }
      } catch {
        toast.error('Your saved shelf could not be loaded. Changes on this device will sync when you reload.');
      }
      useShelf.getState().setRemote(
        {
          save: (item) => saveItems(supabase, user.id, [item]),
          remove: (bookId) => removeBook(supabase, user.id, bookId),
        },
        (message) => toast.error(message),
      );
    }

    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      const user = session?.user ?? null;
      // Supabase warns against awaiting its own calls inside this callback; defer the work.
      setTimeout(() => {
        if (user) {
          if (user.id === currentUserId && event !== 'USER_UPDATED') return;
          currentUserId = user.id;
          syncing = (syncing ?? Promise.resolve()).then(() => onSignedIn(user));
        } else {
          const wasSignedIn = currentUserId !== null;
          currentUserId = null;
          useShelf.getState().setRemote(null);
          if (wasSignedIn || readStorage(SHELF_OWNER_KEY)) {
            useShelf.getState().clear();
            writeStorage(SHELF_OWNER_KEY, null);
          }
          useAuth.getState().set({ status: 'guest', user: null });
        }
      }, 0);
    });

    return () => {
      data.subscription.unsubscribe();
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  return null;
}
