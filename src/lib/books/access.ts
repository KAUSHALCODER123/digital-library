import type { ReaderSource } from './types';

/**
 * Copyright gate. "Read now" is only offered when a source explicitly says the text is
 * public domain / full view, or when the embed is the publisher-sanctioned Google viewer.
 * When in doubt, there is no reader and the UI falls back to "Check availability".
 */
export type AccessSignals = {
  gutenberg?: { id: number; copyrighted: boolean | null; textUrl?: string };
  /**
   * `publicIaId` must be an identifier confirmed as unrestricted by archive.org
   * (see `resolvePublicIaId`). Open Library's work-level `ia` list mixes lending-only scans.
   */
  openLibrary?: { ebookAccess?: string; publicIaId?: string };
  google?: { volumeId: string; viewability?: string; embeddable?: boolean; publicDomain?: boolean };
};

export type AccessDecision = {
  readableFullText: boolean;
  reader?: ReaderSource;
  previewUrl?: string;
};

const IA_ID = /^[A-Za-z0-9._-]{3,100}$/;

export function googleEmbedUrl(volumeId: string): string {
  return `https://books.google.com/books?id=${encodeURIComponent(volumeId)}&printsec=frontcover&output=embed`;
}

export function decideAccess(s: AccessSignals): AccessDecision {
  // 1. Project Gutenberg text we can render ourselves. `copyright: null` (unknown) is not enough.
  if (s.gutenberg && s.gutenberg.copyrighted === false && s.gutenberg.textUrl) {
    return {
      readableFullText: true,
      reader: { kind: 'gutenberg', gutenbergId: s.gutenberg.id, textUrl: s.gutenberg.textUrl },
    };
  }

  // 2. Internet Archive scan that Open Library marks as public (not "borrowable").
  const ia = s.openLibrary?.publicIaId;
  if (s.openLibrary?.ebookAccess === 'public') {
    if (ia && IA_ID.test(ia)) return { readableFullText: true, reader: { kind: 'ia', identifier: ia } };
    // Search results: Open Library says a public scan exists; the detail page confirms which one.
    return { readableFullText: true };
  }

  // 3. Google's own embedded viewer, only when the publisher allows embedding.
  const g = s.google;
  if (g && g.embeddable === true) {
    if (g.viewability === 'ALL_PAGES') {
      return {
        readableFullText: true,
        reader: { kind: 'google', volumeId: g.volumeId, full: true },
        previewUrl: googleEmbedUrl(g.volumeId),
      };
    }
    if (g.viewability === 'PARTIAL') {
      return {
        readableFullText: false,
        reader: { kind: 'google', volumeId: g.volumeId, full: false },
        previewUrl: googleEmbedUrl(g.volumeId),
      };
    }
  }

  return { readableFullText: false };
}

/** Prefer the reader that gives the best in-app experience when merging sources. */
export function readerRank(r: ReaderSource | undefined): number {
  if (!r) return 0;
  if (r.kind === 'gutenberg') return 4;
  if (r.kind === 'ia') return 3;
  return r.full ? 2 : 1;
}
