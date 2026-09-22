'use client';

import { useSyncExternalStore } from 'react';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { clampProgress, type ReadingStatus, type ShelfBook, type ShelfItem } from './types';

export const SHELF_STORAGE_KEY = 'bib-shelf';

/** Persists changes for signed-in readers. Set by SessionSync; null for guests. */
export type ShelfRemote = {
  save: (item: ShelfItem, previous: ShelfItem | undefined) => Promise<void>;
  remove: (bookId: string) => Promise<void>;
};

type ShelfState = {
  items: Record<string, ShelfItem>;
  remote: ShelfRemote | null;
  /** Called when a remote write fails after the optimistic update was rolled back. */
  onRemoteError: ((message: string) => void) | null;
  setStatus: (book: ShelfBook, status: ReadingStatus | null) => void;
  toggleFavorite: (book: ShelfBook) => void;
  setProgress: (book: ShelfBook, progress: number) => void;
  remove: (bookId: string) => void;
  replaceAll: (items: ShelfItem[]) => void;
  clear: () => void;
  setRemote: (remote: ShelfRemote | null, onError?: (message: string) => void) => void;
};

const now = () => new Date().toISOString();

function blank(book: ShelfBook): ShelfItem {
  const t = now();
  return { bookId: book.id, book, status: null, favorite: false, progress: null, addedAt: t, updatedAt: t, finishedAt: null };
}

export const useShelf = create<ShelfState>()(
  persist(
    (set, get) => {
      /** Optimistic update with rollback if the account write fails. */
      function commit(bookId: string, next: ShelfItem | null) {
        const previous = get().items[bookId];
        set((s) => {
          const items = { ...s.items };
          if (next && (next.status || next.favorite)) items[bookId] = next;
          else delete items[bookId];
          return { items };
        });
        const { remote, onRemoteError } = get();
        if (!remote) return;
        const stored = get().items[bookId];
        const op = stored ? remote.save(stored, previous) : remote.remove(bookId);
        op.catch(() => {
          set((s) => {
            const items = { ...s.items };
            if (previous) items[bookId] = previous;
            else delete items[bookId];
            return { items };
          });
          onRemoteError?.('Your shelf could not be saved. Check your connection and try again.');
        });
      }

      return {
        items: {},
        remote: null,
        onRemoteError: null,

        setStatus: (book, status) => {
          const current = get().items[book.id] ?? blank(book);
          const t = now();
          commit(book.id, {
            ...current,
            book,
            status,
            progress: status === 'READ' ? 1 : status === 'READING' ? (current.progress === 1 ? 0 : current.progress ?? 0) : null,
            finishedAt: status === 'READ' ? (current.status === 'READ' ? current.finishedAt : t) : null,
            updatedAt: t,
          });
        },

        toggleFavorite: (book) => {
          const current = get().items[book.id] ?? blank(book);
          commit(book.id, { ...current, book, favorite: !current.favorite, updatedAt: now() });
        },

        setProgress: (book, progress) => {
          const current = get().items[book.id] ?? blank(book);
          const p = clampProgress(progress) ?? 0;
          // Opening a book in the reader puts it on "Currently reading" unless it's already read.
          const status: ReadingStatus = current.status === 'READ' ? 'READ' : 'READING';
          if (current.status === status && current.progress === p) return;
          commit(book.id, { ...current, book, status, progress: status === 'READ' ? 1 : p, updatedAt: now() });
        },

        remove: (bookId) => commit(bookId, null),

        replaceAll: (items) => set({ items: Object.fromEntries(items.map((i) => [i.bookId, i])) }),

        clear: () => set({ items: {} }),

        setRemote: (remote, onError) => set({ remote, onRemoteError: onError ?? null }),
      };
    },
    {
      name: SHELF_STORAGE_KEY,
      version: 1,
      storage: createJSONStorage(() => {
        try {
          return window.localStorage;
        } catch {
          // Storage blocked: fall back to memory for this session.
          const mem = new Map<string, string>();
          return {
            getItem: (k: string) => mem.get(k) ?? null,
            setItem: (k: string, v: string) => void mem.set(k, v),
            removeItem: (k: string) => void mem.delete(k),
          };
        }
      }),
      partialize: (s) => ({ items: s.items }),
      // Hydrate manually after mount to keep server and first client render identical.
      skipHydration: true,
    },
  ),
);

export function selectItem(bookId: string) {
  return (s: ShelfState) => s.items[bookId];
}

function subscribeHydration(cb: () => void) {
  const unsubA = useShelf.persist.onHydrate(cb);
  const unsubB = useShelf.persist.onFinishHydration(cb);
  return () => {
    unsubA();
    unsubB();
  };
}

/** False on the server and until localStorage has been read, so UI can avoid flashing "not on shelf". */
export function useShelfHydrated(): boolean {
  return useSyncExternalStore(subscribeHydration, () => useShelf.persist.hasHydrated(), () => false);
}
