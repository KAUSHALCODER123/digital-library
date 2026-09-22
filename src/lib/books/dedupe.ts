import { readerRank } from './access';
import { titleAuthorKey, uniqueStrings } from './normalize';
import type { BookSummary, Contributor } from './types';

/** Match keys in priority order: ISBN-13s (ISBN-10s are already converted), then title + author. */
export function matchKeys(b: BookSummary): { isbns: string[]; titleKey: string } {
  const isbns = uniqueStrings([b.isbn13, ...(b.allIsbns ?? [])]).map((s) => `isbn:${s}`);
  return { isbns, titleKey: `ta:${titleAuthorKey(b.title, b.authors[0])}` };
}

/** How much useful metadata a record carries; the richer record becomes the primary. */
export function richness(b: BookSummary): number {
  return (
    (b.description ? Math.min(b.description.length, 1200) / 100 + 3 : 0) +
    (b.coverUrl ? 3 : 0) +
    (b.ratingsCount ? Math.min(Math.log10(b.ratingsCount + 1), 4) : 0) +
    (b.pageCount ? 1 : 0) +
    (b.publisher ? 0.5 : 0) +
    (b.isbn13 ? 1 : 0) +
    readerRank(b.reader) * 2 +
    b.categories.length * 0.2
  );
}

const COVER_RANK: Record<BookSummary['source'], number> = { openlibrary: 3, google: 2, gutenberg: 1 };

function pickCover(a: BookSummary, b: BookSummary): string | undefined {
  if (a.coverUrl && b.coverUrl) return COVER_RANK[a.source] >= COVER_RANK[b.source] ? a.coverUrl : b.coverUrl;
  return a.coverUrl ?? b.coverUrl;
}

function longer(x: string | undefined, y: string | undefined): string | undefined {
  if (!x) return y;
  if (!y) return x;
  return y.length > x.length ? y : x;
}

function mergeContributors(a: Contributor[], b: Contributor[]): Contributor[] {
  const seen = new Set<string>();
  const out: Contributor[] = [];
  for (const c of [...a, ...b]) {
    const k = `${c.role}:${c.name.toLowerCase().replace(/[^\p{L}]/gu, '')}`;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(c);
  }
  return out;
}

function minDefined(x: number | undefined, y: number | undefined): number | undefined {
  if (x === undefined) return y;
  if (y === undefined) return x;
  return Math.min(x, y);
}

/**
 * Field-wise merge of two records describing the same book. The richer record keeps its id,
 * title and link; every other field takes the better value from either side.
 */
export function mergeBooks<T extends BookSummary>(x: T, y: BookSummary, opts: { keepIdentity?: boolean } = {}): T {
  const [p, s] = richness(y) > richness(x) ? [y, x] : [x, y];
  const ratingSrc = (s.ratingsCount ?? 0) > (p.ratingsCount ?? 0) ? s : p;
  const readerSrc = readerRank(s.reader) > readerRank(p.reader) ? s : p;
  const contributors = mergeContributors(p.contributors, s.contributors);
  return {
    ...(x as object),
    ...(p as object),
    isbn13: p.isbn13 ?? s.isbn13,
    isbn10: p.isbn10 ?? s.isbn10,
    allIsbns: uniqueStrings([...(p.allIsbns ?? []), ...(s.allIsbns ?? []), p.isbn13, s.isbn13]).slice(0, 40),
    subtitle: p.subtitle ?? s.subtitle,
    authors: p.authors.length ? p.authors : s.authors,
    contributors,
    description: longer(p.description, s.description),
    coverUrl: pickCover(p, s),
    categories: uniqueStrings([...p.categories, ...s.categories]).slice(0, 8),
    publishedYear: minDefined(p.publishedYear, s.publishedYear),
    publisher: p.publisher ?? s.publisher,
    pageCount: p.pageCount ?? s.pageCount,
    averageRating: ratingSrc.averageRating,
    ratingsCount: ratingSrc.ratingsCount,
    language: p.language ?? s.language,
    previewUrl: p.previewUrl ?? s.previewUrl,
    readableFullText: p.readableFullText || s.readableFullText,
    reader: readerSrc.reader,
    mature: p.mature || s.mature,
    // Detail-page enrichment must not change the record the URL points at.
    ...(opts.keepIdentity ? { id: x.id, source: x.source, title: x.title, externalLink: x.externalLink } : {}),
  } as T;
}

/** Remove duplicates across sources, keeping first-seen order (i.e. relevance). */
export function dedupeBooks(books: BookSummary[]): BookSummary[] {
  const out: BookSummary[] = [];
  const index = new Map<string, number>();
  for (const book of books) {
    const { isbns, titleKey } = matchKeys(book);
    let at: number | undefined;
    for (const k of isbns) {
      at = index.get(k);
      if (at !== undefined) break;
    }
    at ??= index.get(titleKey);
    if (at === undefined) {
      at = out.push(book) - 1;
    } else {
      out[at] = mergeBooks(out[at], book);
    }
    const merged = matchKeys(out[at]);
    for (const k of [...merged.isbns, merged.titleKey, ...isbns, titleKey]) index.set(k, at);
  }
  return out;
}

/** Interleave two ranked lists so neither source dominates the first page. */
export function interleave<T>(a: T[], b: T[]): T[] {
  const out: T[] = [];
  const n = Math.max(a.length, b.length);
  for (let i = 0; i < n; i++) {
    if (i < a.length) out.push(a[i]);
    if (i < b.length) out.push(b[i]);
  }
  return out;
}
