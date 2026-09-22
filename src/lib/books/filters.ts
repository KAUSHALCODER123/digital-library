import { z } from 'zod';
import { parseQuery } from './query';
import type { BookSummary, SearchParams, SortOrder } from './types';

export const PAGE_SIZE = 20;
/** Upstream APIs stop paging reliably past ~1000 results. */
export const MAX_PAGE = 50;
const THIS_YEAR = new Date().getFullYear();

export const SORTS: Array<{ value: SortOrder; label: string }> = [
  { value: 'relevance', label: 'Relevance' },
  { value: 'newest', label: 'Newest' },
  { value: 'rating', label: 'Highest rated' },
  { value: 'title', label: 'Title A–Z' },
];

export const LANGUAGES: Array<{ value: string; label: string }> = [
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Spanish' },
  { value: 'fr', label: 'French' },
  { value: 'de', label: 'German' },
  { value: 'it', label: 'Italian' },
  { value: 'pt', label: 'Portuguese' },
  { value: 'hi', label: 'Hindi' },
  { value: 'ar', label: 'Arabic' },
  { value: 'ja', label: 'Japanese' },
  { value: 'zh', label: 'Chinese' },
  { value: 'ru', label: 'Russian' },
];

const first = (v: unknown) => (Array.isArray(v) ? v[0] : v);
const optInt = (min: number, max: number) =>
  z.preprocess(
    (v) => {
      const s = first(v);
      if (s === undefined || s === null || s === '') return undefined;
      const n = Number(s);
      return Number.isFinite(n) ? Math.trunc(n) : undefined;
    },
    z.number().int().min(min).max(max).optional().catch(undefined),
  );

/** Parses untrusted URL search params into clamped, typed search params. Never throws. */
export const searchParamsSchema = z.object({
  q: z.preprocess((v) => (typeof first(v) === 'string' ? first(v) : ''), z.string()).catch(''),
  page: z.preprocess((v) => Number(first(v) ?? 1), z.number().int().min(1).max(MAX_PAGE)).catch(1),
  sort: z.preprocess(first, z.enum(['relevance', 'newest', 'rating', 'title'])).catch('relevance'),
  language: z.preprocess(first, z.string().regex(/^[a-z]{2}$/).optional()).catch(undefined),
  yearFrom: optInt(0, THIS_YEAR + 1),
  yearTo: optInt(0, THIS_YEAR + 1),
  readable: z.preprocess((v) => first(v) === '1' || first(v) === 'true', z.boolean()).catch(false),
  genre: z.preprocess(first, z.string().regex(/^[a-z-]{2,40}$/).optional()).catch(undefined),
  minRating: optInt(1, 5),
  view: z.preprocess(first, z.enum(['pages', 'scroll'])).catch('pages'),
});

export type ParsedSearchParams = z.infer<typeof searchParamsSchema>;
export type SearchPageParams = ParsedSearchParams & { query: ReturnType<typeof parseQuery> };

export function parseSearchParams(input: Record<string, string | string[] | undefined>): SearchPageParams {
  const parsed = searchParamsSchema.parse(input);
  // A reversed range is almost always a typo; swap instead of returning nothing.
  if (parsed.yearFrom !== undefined && parsed.yearTo !== undefined && parsed.yearFrom > parsed.yearTo) {
    [parsed.yearFrom, parsed.yearTo] = [parsed.yearTo, parsed.yearFrom];
  }
  const query = parseQuery(parsed.q);
  return { ...parsed, q: query.q, query };
}

export function toSearchParams(p: ParsedSearchParams): SearchParams {
  return {
    q: p.q,
    page: p.page,
    sort: p.sort,
    language: p.language,
    yearFrom: p.yearFrom,
    yearTo: p.yearTo,
    readable: p.readable || undefined,
    genre: p.genre,
    minRating: p.minRating,
  };
}

/** Serialize back to a URL query, omitting defaults so shared links stay short. */
export function buildSearchQuery(p: Partial<ParsedSearchParams>, overrides: Partial<ParsedSearchParams> = {}): string {
  const m = { ...p, ...overrides };
  const qs = new URLSearchParams();
  if (m.q) qs.set('q', m.q);
  if (m.genre) qs.set('genre', m.genre);
  if (m.language) qs.set('language', m.language);
  if (m.yearFrom !== undefined) qs.set('yearFrom', String(m.yearFrom));
  if (m.yearTo !== undefined) qs.set('yearTo', String(m.yearTo));
  if (m.readable) qs.set('readable', '1');
  if (m.minRating) qs.set('minRating', String(m.minRating));
  if (m.sort && m.sort !== 'relevance') qs.set('sort', m.sort);
  if (m.view && m.view !== 'pages') qs.set('view', m.view);
  if (m.page && m.page > 1) qs.set('page', String(m.page));
  return qs.toString();
}

/** Filters the APIs can't apply themselves, run on each page of results. */
export function applyFilters(books: BookSummary[], p: SearchParams): BookSummary[] {
  return books.filter((b) => {
    if (p.yearFrom !== undefined && (b.publishedYear === undefined || b.publishedYear < p.yearFrom)) return false;
    if (p.yearTo !== undefined && (b.publishedYear === undefined || b.publishedYear > p.yearTo)) return false;
    if (p.minRating !== undefined && (b.averageRating === undefined || b.averageRating < p.minRating)) return false;
    if (p.readable && !b.readableFullText) return false;
    if (p.language && b.language && b.language !== p.language) return false;
    return true;
  });
}

const collator = new Intl.Collator('en', { sensitivity: 'base', numeric: true });

export function sortBooks(books: BookSummary[], sort: SortOrder): BookSummary[] {
  if (sort === 'relevance') return books;
  const copy = [...books];
  if (sort === 'newest') copy.sort((a, b) => (b.publishedYear ?? -1e6) - (a.publishedYear ?? -1e6));
  if (sort === 'rating')
    copy.sort(
      (a, b) =>
        (b.averageRating ?? -1) - (a.averageRating ?? -1) || (b.ratingsCount ?? 0) - (a.ratingsCount ?? 0),
    );
  if (sort === 'title') copy.sort((a, b) => collator.compare(a.title.replace(/^(the|a|an)\s+/i, ''), b.title.replace(/^(the|a|an)\s+/i, '')));
  return copy;
}

export function hasActiveFilters(p: Partial<ParsedSearchParams>): boolean {
  return !!(p.language || p.yearFrom !== undefined || p.yearTo !== undefined || p.readable || p.genre || p.minRating);
}
