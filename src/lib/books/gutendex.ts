import 'server-only';
import { decideAccess } from './access';
import { fetchJson } from './http';
import { cleanCategories, cleanString, flipName, httpsify, languageCode } from './normalize';
import type { BookDetail, BookSummary, Contributor } from './types';

const BASE = 'https://gutendex.com/books';
/** Gutendex is a small volunteer service and can be slow; give it a little longer. */
const TIMEOUT = 8000;

type GutenPerson = { name?: string; birth_year?: number | null; death_year?: number | null };
export type GutenBook = {
  id?: number;
  title?: string;
  authors?: GutenPerson[];
  translators?: GutenPerson[];
  editors?: GutenPerson[];
  summaries?: string[];
  subjects?: string[];
  bookshelves?: string[];
  languages?: string[];
  copyright?: boolean | null;
  media_type?: string;
  formats?: Record<string, string>;
  download_count?: number;
};
type GutenList = { count?: number; results?: GutenBook[] };

export function pickTextUrl(formats: Record<string, string> | undefined): string | undefined {
  if (!formats) return undefined;
  const entries = Object.entries(formats).filter(([type, url]) => type.startsWith('text/plain') && !/\.zip$/i.test(url));
  const utf8 = entries.find(([type]) => /utf-8/i.test(type));
  const url = httpsify((utf8 ?? entries[0])?.[1]);
  return url && /^https:\/\/(www\.)?gutenberg\.org\//.test(url) ? url : undefined;
}

/** "Frankenstein; Or, The Modern Prometheus" -> title + subtitle. */
export function splitTitle(raw: string): { title: string; subtitle?: string } {
  const t = raw.replace(/\s+/g, ' ').trim();
  const m = t.match(/^(.{2,}?)(?:;|:|\s—)\s+(.+)$/);
  if (!m) return { title: t };
  return { title: m[1].trim(), subtitle: m[2].replace(/^or,?\s+/i, (s) => s.charAt(0).toUpperCase() + s.slice(1)).trim() };
}

export function mapGutenberg(b: GutenBook): BookSummary | null {
  const rawTitle = cleanString(b.title);
  if (!b.id || !rawTitle || (b.media_type && b.media_type !== 'Text')) return null;
  const { title, subtitle } = splitTitle(rawTitle);
  const people = (list: GutenPerson[] | undefined, role: Contributor['role']): Contributor[] =>
    (list ?? []).flatMap((p) => {
      const n = cleanString(p.name);
      return n ? [{ name: flipName(n), role }] : [];
    });
  const contributors = [
    ...people(b.authors, 'author'),
    ...people(b.translators, 'translator'),
    ...people(b.editors, 'editor'),
  ];
  const textUrl = pickTextUrl(b.formats);
  const access = decideAccess({ gutenberg: { id: b.id, copyrighted: b.copyright ?? null, textUrl } });
  const categories = cleanCategories(
    [
      ...(b.bookshelves ?? []).map((s) => s.replace(/^Category:\s*/i, '')),
      ...(b.subjects ?? []).map((s) => s.split(' -- ')[0]),
    ],
    6,
  );
  return {
    id: `gutenberg:${b.id}`,
    source: 'gutenberg',
    title,
    subtitle,
    authors: contributors.filter((c) => c.role === 'author').map((c) => c.name),
    contributors,
    description: cleanString(b.summaries?.[0]),
    coverUrl: httpsify(b.formats?.['image/jpeg']),
    categories,
    language: languageCode(b.languages?.[0]),
    readableFullText: access.readableFullText,
    reader: access.reader,
    mature: false,
    externalLink: `https://www.gutenberg.org/ebooks/${b.id}`,
  };
}

export async function gutenbergPopular(limit = 20): Promise<BookSummary[]> {
  const data = await fetchJson<GutenList>(`${BASE}/?languages=en&copyright=false&sort=popular`, {
    timeoutMs: TIMEOUT,
    revalidate: 86400,
  });
  return (data.results ?? [])
    .map(mapGutenberg)
    .filter((b): b is BookSummary => b !== null && b.readableFullText)
    .slice(0, limit);
}

export async function gutenbergBook(id: number): Promise<BookDetail | null> {
  const b = await fetchJson<GutenBook>(`${BASE}/${id}`, { timeoutMs: TIMEOUT, revalidate: 86400 });
  const mapped = mapGutenberg(b);
  return mapped ? { ...mapped, subjects: mapped.categories } : null;
}

export async function gutenbergByAuthor(name: string, limit = 12): Promise<BookSummary[]> {
  const url = new URL(`${BASE}/`);
  url.searchParams.set('search', name);
  url.searchParams.set('copyright', 'false');
  const data = await fetchJson<GutenList>(url.toString(), { timeoutMs: TIMEOUT, revalidate: 86400 });
  return (data.results ?? []).map(mapGutenberg).filter((b): b is BookSummary => b !== null).slice(0, limit);
}
