'use client';

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type ReaderTheme = 'light' | 'sepia' | 'dark';
export type ReaderFont = 'serif' | 'sans';

/** Reading themes are separate from the site theme. Pairs are contrast-checked in tests. */
export const READER_THEMES: Record<ReaderTheme, { label: string; bg: string; fg: string; muted: string; chrome: string }> = {
  light: { label: 'Light', bg: '#fbf8f1', fg: '#1e2230', muted: '#5a5d6b', chrome: '#f3eee3' },
  sepia: { label: 'Sepia', bg: '#f1e4c8', fg: '#3b2f20', muted: '#6b5738', chrome: '#e8d8b6' },
  dark: { label: 'Dark', bg: '#1b1916', fg: '#e6dfd1', muted: '#a79f90', chrome: '#24211d' },
};

export const FONT_SIZES = [15, 16, 17, 18, 20, 22, 24, 26] as const;
export const LINE_HEIGHTS = [1.45, 1.65, 1.85] as const;

type Prefs = {
  theme: ReaderTheme;
  font: ReaderFont;
  size: number;
  lineHeight: number;
  set: (p: Partial<Omit<Prefs, 'set'>>) => void;
};

export const useReaderPrefs = create<Prefs>()(
  persist(
    (set) => ({ theme: 'light', font: 'serif', size: 18, lineHeight: 1.65, set: (p) => set(p) }),
    {
      name: 'bib-reader-prefs',
      version: 1,
      storage: createJSONStorage(() => {
        try {
          return window.localStorage;
        } catch {
          const mem = new Map<string, string>();
          return {
            getItem: (k: string) => mem.get(k) ?? null,
            setItem: (k: string, v: string) => void mem.set(k, v),
            removeItem: (k: string) => void mem.delete(k),
          };
        }
      }),
      partialize: ({ theme, font, size, lineHeight }) => ({ theme, font, size, lineHeight }),
      // Guard against hand-edited or stale storage.
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<Prefs>;
        return {
          ...current,
          theme: p.theme && p.theme in READER_THEMES ? p.theme : current.theme,
          font: p.font === 'sans' || p.font === 'serif' ? p.font : current.font,
          size: FONT_SIZES.includes(p.size as (typeof FONT_SIZES)[number]) ? (p.size as number) : current.size,
          lineHeight: LINE_HEIGHTS.includes(p.lineHeight as (typeof LINE_HEIGHTS)[number]) ? (p.lineHeight as number) : current.lineHeight,
        };
      },
    },
  ),
);

const POS_PREFIX = 'bib-pos:';

/** Reading position as a 0..1 fraction, so it survives font-size and screen changes. */
export function readPosition(bookId: string): number {
  try {
    const v = Number(window.localStorage.getItem(POS_PREFIX + bookId));
    return Number.isFinite(v) && v >= 0 && v <= 1 ? v : 0;
  } catch {
    return 0;
  }
}

export function writePosition(bookId: string, fraction: number): void {
  try {
    window.localStorage.setItem(POS_PREFIX + bookId, String(Math.min(1, Math.max(0, fraction))));
  } catch {
    // Position just won't be remembered.
  }
}
