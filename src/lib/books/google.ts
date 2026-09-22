import 'server-only';
import { decideAccess } from './access';
import { fetchJson } from './http';
import {
  cleanCategories,
  cleanString,
  httpsify,
  languageCode,
  parseContributors,
  parseYear,
  positiveInt,
  rating,
  toPlainText,
} from './normalize';
import { cleanIsbn, escapeForQuery } from './query';
import type { BookDetail, BookSummary, SearchParams } from './types';

const BASE = 'https://www.googleapis.com/books/v1/volumes';
export const GOOGLE_MAX_RESULTS = 20;

export type GoogleVolume = {
  id?: string;
  volumeInfo?: {
    title?: string;
    subtitle?: string;
    authors?: string[];
    publisher?: string;
    publishedDate?: string;
    description?: string;
    industryIdentifiers?: Array<{ type?: string; identifier?: string }>;
    pageCount?: number;
    categories?: string[];
    averageRating?: number;
    ratingsCount?: number;
    maturityRating?: string;
    imageLinks?: Partial<Record<'smallThumbnail' | 'thumbnail' | 'small' | 'medium' | 'large' | 'extraLarge', string>>;
    language?: string;
    previewLink?: string;
    infoLink?: string;
    canonicalVolumeLink?: string;
  };
  accessInfo?: {
    viewability?: string;
    embeddable?: boolean;
    publicDomain?: boolean;
  };
};

export type GoogleSearchResponse = { totalItems?: number; items?: GoogleVolume[] };

function withKey(url: URL): string {
  const key = process.env.GOOGLE_BOOKS_API_KEY;
  if (key) url.searchParams.set('key', key);
  return url.toString();
}

/** Google thumbnails come as http with a page-curl effect; request a clean, larger rendition. */
export function googleCover(links: NonNullable<GoogleVolume['volumeInfo']>['imageLinks']): string | undefined {
  const raw = links?.medium ?? links?.small ?? links?.thumbnail ?? links?.smallThumbnail;
  const url = httpsify(raw);
  if (!url) return undefined;
  return url.replace(/&edge=curl/g, '');
}

export function mapGoogleVolume(v: GoogleVolume): BookSummary | null {
  const info = v.volumeInfo;
  const title = cleanString(info?.title);
  if (!v.id || !info || !title) return null;

  let isbn13: string | undefined;
  let isbn10: string | undefined;
  for (const ident of info.industryIdentifiers ?? []) {
    const c = cleanIsbn(ident.identifier);
    if (ident.type === 'ISBN_13' && c.isbn13) isbn13 = c.isbn13;
    if (ident.type === 'ISBN_10' && c.isbn10) {
      isbn10 = c.isbn10;
      isbn13 ??= c.isbn13;
    }
  }

  const contributors = parseContributors(info.authors ?? []);
  const access = decideAccess({
    google: {
      volumeId: v.id,
      viewability: v.accessInfo?.viewability,
      embeddable: v.accessInfo?.embeddable,
      publicDomain: v.accessInfo?.publicDomain,
    },
  });

  return {
    id: `google:${v.id}`,
    source: 'google',
    isbn13,
    isbn10,
    title,
    subtitle: cleanString(info.subtitle),
    authors: contributors.filter((c) => c.role === 'author').map((c) => c.name),
    contributors,
    description: toPlainText(info.description),
    coverUrl: googleCover(info.imageLinks),
    categories: cleanCategories(info.categories ?? []),
    publishedYear: parseYear(info.publishedDate),
    publisher: cleanString(info.publisher),
    pageCount: positiveInt(info.pageCount),
    averageRating: rating(info.averageRating),
    ratingsCount: positiveInt(info.ratingsCount),
    language: languageCode(info.language),
    previewUrl: access.previewUrl,
    readableFullText: access.readableFullText,
    reader: access.reader,
    mature: info.maturityRating === 'MATURE',
    externalLink:
      httpsify(info.canonicalVolumeLink) ??
      httpsify(info.infoLink) ??
      `https://books.google.com/books?id=${encodeURIComponent(v.id)}`,
  };
}

export function toGoogleDetail(b: BookSummary): BookDetail {
  return { ...b, subjects: b.categories };
}

const ORDER: Record<SearchParams['sort'], string | undefined> = {
  relevance: 'relevance',
  newest: 'newest',
  rating: undefined,
  title: undefined,
};

export function buildGoogleQuery(p: Pick<SearchParams, 'q' | 'genre' | 'author'>, genreSubject?: string): string {
  const parts: string[] = [];
  if (p.q) parts.push(p.q);
  if (p.author) parts.push(`inauthor:"${escapeForQuery(p.author)}"`);
  if (genreSubject) parts.push(`subject:"${escapeForQuery(genreSubject)}"`);
  return parts.join(' ');
}

export async function googleSearch(p: SearchParams, genreSubject?: string): Promise<{ items: BookSummary[]; total: number }> {
  const q = buildGoogleQuery(p, genreSubject);
  if (!q) return { items: [], total: 0 };
  const url = new URL(BASE);
  url.searchParams.set('q', q);
  url.searchParams.set('startIndex', String((p.page - 1) * GOOGLE_MAX_RESULTS));
  url.searchParams.set('maxResults', String(GOOGLE_MAX_RESULTS));
  url.searchParams.set('printType', 'books');
  const order = ORDER[p.sort];
  if (order) url.searchParams.set('orderBy', order);
  if (p.language) url.searchParams.set('langRestrict', p.language);
  if (p.readable) url.searchParams.set('filter', 'free-ebooks');
  const data = await fetchJson<GoogleSearchResponse>(withKey(url));
  const items = (data.items ?? []).map(mapGoogleVolume).filter((b): b is BookSummary => b !== null);
  return { items, total: data.totalItems ?? items.length };
}

export async function googleByIsbn(isbn13: string, timeoutMs?: number): Promise<BookSummary[]> {
  const url = new URL(BASE);
  url.searchParams.set('q', `isbn:${isbn13}`);
  url.searchParams.set('maxResults', '5');
  const data = await fetchJson<GoogleSearchResponse>(withKey(url), { revalidate: 86400, timeoutMs });
  return (data.items ?? []).map(mapGoogleVolume).filter((b): b is BookSummary => b !== null);
}

export async function googleVolume(volumeId: string): Promise<BookDetail | null> {
  const data = await fetchJson<GoogleVolume>(withKey(new URL(`${BASE}/${encodeURIComponent(volumeId)}`)), {
    revalidate: 86400,
  });
  const b = mapGoogleVolume(data);
  return b ? toGoogleDetail(b) : null;
}

export async function googleNewest(subject = 'fiction', limit = 20): Promise<BookSummary[]> {
  const url = new URL(BASE);
  url.searchParams.set('q', `subject:${subject}`);
  url.searchParams.set('orderBy', 'newest');
  url.searchParams.set('printType', 'books');
  url.searchParams.set('langRestrict', 'en');
  url.searchParams.set('maxResults', String(Math.min(40, limit)));
  const data = await fetchJson<GoogleSearchResponse>(withKey(url), { revalidate: 21600 });
  return (data.items ?? []).map(mapGoogleVolume).filter((b): b is BookSummary => b !== null);
}
