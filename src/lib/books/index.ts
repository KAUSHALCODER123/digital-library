import 'server-only';
import { cache } from 'react';
import { getGenre } from '@/lib/genres';
import { dedupeBooks, interleave, matchKeys, mergeBooks } from './dedupe';
import { FIXTURE_AUTHOR, FIXTURE_BOOKS, FIXTURE_EDITIONS } from './fixtures';
import { applyFilters, MAX_PAGE, PAGE_SIZE, sortBooks } from './filters';
import { googleByIsbn, googleNewest, googleSearch, googleVolume } from './google';
import { gutenbergBook, gutenbergByAuthor, gutenbergPopular } from './gutendex';
import { describeError, UpstreamError } from './http';
import {
  olAuthor,
  olByIsbn,
  olByTitleAuthor,
  olEditions,
  olEditionToWork,
  olPublicDomain,
  olRecent,
  olSearch,
  olTrending,
  olWork,
  resolvePublicIaId,
} from './openlibrary';
import type {
  AuthorProfile,
  BookDetail,
  BookSummary,
  Edition,
  SearchParams,
  SearchResult,
  ShelfRowKey,
  SourceStatus,
} from './types';

export class BooksUnavailableError extends Error {
  constructor(public readonly sources: SourceStatus[]) {
    super('All book sources failed');
    this.name = 'BooksUnavailableError';
  }
}

const isMock = () => process.env.BOOKS_MOCK === '1';

function log(scope: string, err: unknown) {
  if (process.env.NODE_ENV !== 'test') console.warn(`[books] ${scope}: ${err instanceof Error ? err.message : String(err)}`);
}

/** Resolve a promise to null on failure (enrichment is best-effort). */
async function soft<T>(scope: string, p: Promise<T>): Promise<T | null> {
  try {
    return await p;
  } catch (err) {
    log(scope, err);
    return null;
  }
}

/** A reader decides readability; merged search-level flags are re-derived from it. */
function finalizeAccess<T extends BookSummary>(b: T): T {
  const r = b.reader;
  return { ...b, readableFullText: r ? r.kind !== 'google' || r.full : false };
}

// ---------------------------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------------------------

export async function searchBooks(params: SearchParams): Promise<SearchResult> {
  if (isMock()) return mockSearch(params);

  const genre = getGenre(params.genre);
  const [g, o] = await Promise.allSettled([googleSearch(params, genre?.google), olSearch(params, genre?.openLibrary)]);

  const sources: SourceStatus[] = [
    { source: 'google', ok: g.status === 'fulfilled', reason: g.status === 'rejected' ? describeError(g.reason) : undefined },
    { source: 'openlibrary', ok: o.status === 'fulfilled', reason: o.status === 'rejected' ? describeError(o.reason) : undefined },
  ];
  if (g.status === 'rejected') log('google search', g.reason);
  if (o.status === 'rejected') log('openlibrary search', o.reason);
  if (g.status === 'rejected' && o.status === 'rejected') throw new BooksUnavailableError(sources);

  const gItems = g.status === 'fulfilled' ? g.value.items : [];
  const oItems = o.status === 'fulfilled' ? o.value.items : [];
  const gTotal = g.status === 'fulfilled' ? g.value.total : 0;
  const oTotal = o.status === 'fulfilled' ? o.value.total : 0;

  const merged = sortBooks(applyFilters(dedupeBooks(interleave(gItems, oItems)), params), params.sort);
  const total = Math.max(gTotal, oTotal, merged.length);
  const sourceHasMore = gItems.length >= PAGE_SIZE || oItems.length >= PAGE_SIZE;
  return {
    items: merged,
    total,
    page: params.page,
    pageSize: PAGE_SIZE,
    hasMore: sourceHasMore && params.page < MAX_PAGE && params.page * PAGE_SIZE < total,
    sources,
  };
}

/** ISBN queries go straight to an exact lookup on both sources. */
export async function lookupIsbn(isbn13: string): Promise<BookSummary[]> {
  if (isMock()) return FIXTURE_BOOKS.filter((b) => b.isbn13 === isbn13 || b.allIsbns?.includes(isbn13));
  const [g, o] = await Promise.allSettled([googleByIsbn(isbn13), olByIsbn(isbn13)]);
  if (g.status === 'rejected' && o.status === 'rejected') {
    throw new BooksUnavailableError([
      { source: 'google', ok: false, reason: describeError(g.reason) },
      { source: 'openlibrary', ok: false, reason: describeError(o.reason) },
    ]);
  }
  return dedupeBooks([
    ...(g.status === 'fulfilled' ? g.value : []),
    ...(o.status === 'fulfilled' ? o.value : []),
  ]);
}

// ---------------------------------------------------------------------------------------------
// Detail
// ---------------------------------------------------------------------------------------------

/** Enrichment is optional; don't let it hold the page for long. */
const ENRICH_TIMEOUT = 3000;

export type BookLookup = { book: BookDetail } | { redirectTo: string } | null;

async function enrichFromOpenLibrary(book: BookDetail): Promise<BookDetail> {
  const matches = book.isbn13
    ? await soft('ol isbn', olByIsbn(book.isbn13, ENRICH_TIMEOUT))
    : await soft('ol title', olByTitleAuthor(book.title, book.authors[0], ENRICH_TIMEOUT));
  const match = matches?.[0];
  if (!match) return book;
  let merged = mergeBooks(book, match, { keepIdentity: true });
  const olid = match.id.slice(3);
  merged = { ...merged, workKey: merged.workKey ?? olid };
  if (match.readableFullText && (!merged.reader || merged.reader.kind === 'google')) {
    const work = await soft('ol work', olWork(olid));
    const ia = work ? await soft('ia resolve', resolvePublicIaId(work.iaCandidates)) : null;
    if (ia) merged = { ...merged, reader: { kind: 'ia', identifier: ia }, olEbookAccess: 'public' };
  }
  return merged;
}

async function enrichFromGoogle(book: BookDetail): Promise<BookDetail> {
  if (!book.isbn13) return book;
  const matches = await soft('google isbn', googleByIsbn(book.isbn13, ENRICH_TIMEOUT));
  const match = matches?.[0];
  return match ? mergeBooks(book, match, { keepIdentity: true }) : book;
}

async function loadBook(id: string): Promise<BookLookup> {
  if (isMock()) {
    const b = FIXTURE_BOOKS.find((x) => x.id === id);
    return b ? { book: b } : null;
  }
  const [prefix, value] = [id.slice(0, id.indexOf(':')), id.slice(id.indexOf(':') + 1)];
  try {
    if (prefix === 'google') {
      const b = await googleVolume(value);
      return b ? { book: finalizeAccess(await enrichFromOpenLibrary(b)) } : null;
    }
    if (prefix === 'ol') {
      if (value.endsWith('M')) {
        const work = await olEditionToWork(value);
        return work ? { redirectTo: `ol:${work}` } : null;
      }
      const work = await olWork(value);
      if (!work) return null;
      const { iaCandidates, ...rest } = work;
      let b: BookDetail = rest;
      if (work.olEbookAccess === 'public') {
        const ia = await soft('ia resolve', resolvePublicIaId(iaCandidates));
        if (ia) b = { ...b, reader: { kind: 'ia', identifier: ia } };
      }
      return { book: finalizeAccess(await enrichFromGoogle(b)) };
    }
    if (prefix === 'gutenberg') {
      const b = await gutenbergBook(Number(value));
      if (!b) return null;
      return { book: finalizeAccess(await enrichFromOpenLibrary(b)) };
    }
    return null;
  } catch (err) {
    if (err instanceof UpstreamError && err.kind === 'not-found') return null;
    throw err;
  }
}

/** Memoized per request so generateMetadata and the page share one fetch. */
export const getBook = cache(loadBook);

export const getEditions = cache(async (workKey: string | undefined): Promise<Edition[]> => {
  if (!workKey) return [];
  if (isMock()) return workKey === 'OL262758W' ? FIXTURE_EDITIONS : [];
  return (await soft('editions', olEditions(workKey))) ?? [];
});

export async function getSimilar(book: BookDetail, limit = 12): Promise<BookSummary[]> {
  const subject = book.subjects[0] ?? book.categories[0];
  if (isMock()) {
    return FIXTURE_BOOKS.filter(
      (b) => b.id !== book.id && (b.categories.some((c) => book.categories.includes(c)) || b.authors[0] === book.authors[0]),
    ).slice(0, limit);
  }
  const author = book.authors[0];
  const tasks: Array<Promise<{ items: BookSummary[] } | null>> = [];
  const base = { q: '', page: 1, sort: 'relevance' as const };
  if (author) tasks.push(soft('similar author', olSearch({ ...base, author })));
  if (subject) tasks.push(soft('similar subject', googleSearch(base, subject)));
  const results = await Promise.all(tasks);
  const self = matchKeys(book);
  const selfKeys = new Set([...self.isbns, self.titleKey]);
  return dedupeBooks(interleave(results[0]?.items ?? [], results[1]?.items ?? []))
    .filter((b) => {
      const k = matchKeys(b);
      return b.id !== book.id && !k.isbns.some((x) => selfKeys.has(x)) && !selfKeys.has(k.titleKey);
    })
    .slice(0, limit);
}

// ---------------------------------------------------------------------------------------------
// Authors
// ---------------------------------------------------------------------------------------------

export const getAuthor = cache(async (name: string): Promise<AuthorProfile | null> => {
  if (isMock()) return name.toLowerCase() === FIXTURE_AUTHOR.name.toLowerCase() ? FIXTURE_AUTHOR : null;
  return soft('author', olAuthor(name));
});

export async function getAuthorWorks(name: string, page: number, sort: SearchParams['sort']): Promise<SearchResult> {
  const result = await searchBooks({ q: '', author: name, page, sort });
  if (page === 1 && !isMock()) {
    // Public-domain authors: surface the Gutenberg texts, which open in the in-app reader.
    const pg = await soft('gutenberg author', gutenbergByAuthor(name, 6));
    if (pg?.length) {
      const surname = name.split(' ').pop()?.toLowerCase() ?? '';
      const byAuthor = pg.filter((b) => b.authors.some((a) => a.toLowerCase().includes(surname)));
      return { ...result, items: dedupeBooks([...result.items, ...byAuthor]) };
    }
  }
  return result;
}

// ---------------------------------------------------------------------------------------------
// Home shelves
// ---------------------------------------------------------------------------------------------

/** Default staff picks, used until library staff pin their own. */
export const DEFAULT_STAFF_PICKS = [
  '9780525559474', // The Midnight Library
  '9780593135204', // Project Hail Mary
  '9780062315007', // The Alchemist
  '9780143127550', // Everything I Never Told You
  '9780385490818', // The Handmaid's Tale
  '9780374533557', // Thinking, Fast and Slow
  '9780735219090', // Where the Crawdads Sing
  '9781250301697', // The Silent Patient
  '9780553418026', // The Martian
  '9780812981605', // The Warmth of Other Suns
];

export async function getShelfRow(key: ShelfRowKey, limit = 18): Promise<BookSummary[]> {
  if (isMock()) {
    const pick: Record<ShelfRowKey, (b: BookDetail) => boolean> = {
      'new-arrivals': (b) => (b.publishedYear ?? 0) > 1950 && !b.title.startsWith('Field Notes'),
      trending: (b) => (b.ratingsCount ?? 0) > 800,
      classics: (b) => b.readableFullText,
      'staff-picks': (b) => !!b.description && !b.title.startsWith('Field Notes'),
    };
    return FIXTURE_BOOKS.filter(pick[key]).slice(0, limit);
  }
  switch (key) {
    case 'trending':
      return dedupeBooks(await olTrending(limit + 6)).filter((b) => b.coverUrl).slice(0, limit);
    case 'classics': {
      const pg = await soft('gutenberg popular', gutenbergPopular(limit));
      if (pg?.length) return pg;
      return olPublicDomain(limit);
    }
    case 'new-arrivals': {
      const google = await soft('google newest', googleNewest('fiction', 40));
      const fromGoogle = dedupeBooks(google ?? []).filter((b) => b.coverUrl && !b.mature);
      if (fromGoogle.length >= 6) return fromGoogle.slice(0, limit);
      return olRecent(limit);
    }
    case 'staff-picks': {
      const found = await Promise.all(DEFAULT_STAFF_PICKS.map((isbn) => soft('staff pick', olByIsbn(isbn))));
      return found.flatMap((r) => (r?.[0] ? [r[0]] : [])).slice(0, limit);
    }
  }
}

// ---------------------------------------------------------------------------------------------
// Mock provider (BOOKS_MOCK=1)
// ---------------------------------------------------------------------------------------------

function mockSearch(p: SearchParams): SearchResult {
  const q = p.q.toLowerCase();
  if (q === '__fail__') {
    throw new BooksUnavailableError([
      { source: 'google', ok: false, reason: 'rate-limited' },
      { source: 'openlibrary', ok: false, reason: 'timeout' },
    ]);
  }
  const genre = getGenre(p.genre);
  const all = FIXTURE_BOOKS.filter((b) => {
    const hay = [b.title, b.subtitle, ...b.authors, ...b.categories].join(' ').toLowerCase();
    if (q && q !== '__partial__' && !q.split(' ').every((w) => hay.includes(w))) return false;
    if (p.author && !b.authors.some((a) => a.toLowerCase() === p.author!.toLowerCase())) return false;
    if (genre && !genre.match.test(b.categories.join(' '))) return false;
    return true;
  });
  const filtered = sortBooks(applyFilters(all, p), p.sort);
  const start = (p.page - 1) * PAGE_SIZE;
  return {
    items: filtered.slice(start, start + PAGE_SIZE),
    total: filtered.length,
    page: p.page,
    pageSize: PAGE_SIZE,
    hasMore: start + PAGE_SIZE < filtered.length,
    sources: [
      { source: 'google', ok: q !== '__partial__', reason: q === '__partial__' ? 'rate-limited' : undefined },
      { source: 'openlibrary', ok: true },
    ],
  };
}

export { isMock };
