import 'server-only';
import { decideAccess } from './access';
import { fetchJson } from './http';
import {
  cleanCategories,
  cleanString,
  languageCode,
  parseContributors,
  parseYear,
  positiveInt,
  rating,
  toPlainText,
  uniqueStrings,
} from './normalize';
import { cleanIsbn, escapeForQuery } from './query';
import type { AuthorProfile, BookDetail, BookSummary, Edition, SearchParams } from './types';

const BASE = 'https://openlibrary.org';
export const OL_PAGE_SIZE = 20;

const SEARCH_FIELDS = [
  'key',
  'title',
  'subtitle',
  'author_name',
  'cover_i',
  'first_publish_year',
  'isbn',
  'language',
  'subject',
  'publisher',
  'number_of_pages_median',
  'ratings_average',
  'ratings_count',
  'ebook_access',
  'edition_count',
].join(',');

export type OLSearchDoc = {
  key?: string;
  title?: string;
  subtitle?: string;
  author_name?: string[];
  cover_i?: number;
  first_publish_year?: number;
  isbn?: string[];
  language?: string[];
  subject?: string[];
  publisher?: string[];
  number_of_pages_median?: number;
  ratings_average?: number;
  ratings_count?: number;
  ebook_access?: string;
  edition_count?: number;
  ia?: string[];
};

type OLSearchResponse = { numFound?: number; num_found?: number; docs?: OLSearchDoc[] };

export function olCoverUrl(coverId: number | undefined, size: 'M' | 'L' = 'L'): string | undefined {
  return coverId && coverId > 0 ? `https://covers.openlibrary.org/b/id/${coverId}-${size}.jpg` : undefined;
}

const WORK_KEY = /^\/works\/(OL\d+W)$/;

/** Pick up to `limit` valid ISBN-13s; used to match the same book across sources. */
function isbnSet(raw: string[] | undefined, limit = 30): string[] {
  const out = new Set<string>();
  for (const r of raw ?? []) {
    const c = cleanIsbn(r);
    if (c.isbn13) out.add(c.isbn13);
    if (out.size >= limit) break;
  }
  return [...out];
}

function pickLanguage(langs: string[] | undefined): string | undefined {
  if (!langs?.length) return undefined;
  return languageCode(langs.includes('eng') ? 'eng' : langs[0]);
}

export function mapOLDoc(doc: OLSearchDoc): BookSummary | null {
  const m = doc.key?.match(WORK_KEY);
  const title = cleanString(doc.title);
  if (!m || !title) return null;
  const olid = m[1];
  const isbns = isbnSet(doc.isbn);
  const contributors = parseContributors(doc.author_name ?? []);
  const access = decideAccess({ openLibrary: { ebookAccess: doc.ebook_access } });
  return {
    id: `ol:${olid}`,
    source: 'openlibrary',
    isbn13: isbns[0],
    allIsbns: isbns,
    title,
    subtitle: cleanString(doc.subtitle),
    authors: contributors.filter((c) => c.role === 'author').map((c) => c.name),
    contributors,
    coverUrl: olCoverUrl(doc.cover_i),
    categories: cleanCategories(doc.subject ?? [], 6),
    publishedYear: parseYear(doc.first_publish_year),
    publisher: cleanString(doc.publisher?.[0]),
    pageCount: positiveInt(doc.number_of_pages_median),
    averageRating: rating(doc.ratings_average),
    ratingsCount: positiveInt(doc.ratings_count),
    language: pickLanguage(doc.language),
    readableFullText: access.readableFullText,
    reader: access.reader,
    mature: false,
    externalLink: `${BASE}/works/${olid}`,
  };
}

const LANG_2_TO_3: Record<string, string> = {
  en: 'eng', fr: 'fre', de: 'ger', es: 'spa', it: 'ita', pt: 'por', ru: 'rus', ja: 'jpn', zh: 'chi',
  ar: 'ara', he: 'heb', hi: 'hin', ko: 'kor', nl: 'dut', sv: 'swe', pl: 'pol', tr: 'tur', el: 'gre',
  la: 'lat', fa: 'per', ur: 'urd', bn: 'ben', uk: 'ukr', cs: 'cze', da: 'dan', fi: 'fin', no: 'nor',
};

const SORT: Record<SearchParams['sort'], string | undefined> = {
  relevance: undefined,
  newest: 'new',
  rating: 'rating',
  title: 'title',
};

export function buildOLQuery(p: SearchParams, genreSubject?: string): string {
  const parts: string[] = [];
  if (p.q) parts.push(p.q);
  if (p.author) parts.push(`author:"${escapeForQuery(p.author)}"`);
  if (genreSubject) parts.push(`subject:"${escapeForQuery(genreSubject)}"`);
  if (p.yearFrom || p.yearTo) parts.push(`first_publish_year:[${p.yearFrom ?? '*'} TO ${p.yearTo ?? '*'}]`);
  if (p.readable) parts.push('ebook_access:public');
  return parts.join(' ');
}

export async function olSearch(p: SearchParams, genreSubject?: string): Promise<{ items: BookSummary[]; total: number }> {
  const q = buildOLQuery(p, genreSubject);
  if (!q) return { items: [], total: 0 };
  const url = new URL(`${BASE}/search.json`);
  url.searchParams.set('q', q);
  url.searchParams.set('page', String(p.page));
  url.searchParams.set('limit', String(OL_PAGE_SIZE));
  url.searchParams.set('fields', SEARCH_FIELDS);
  const sort = SORT[p.sort];
  if (sort) url.searchParams.set('sort', sort);
  const lang = p.language ? LANG_2_TO_3[p.language] : undefined;
  if (lang) url.searchParams.set('language', lang);
  const data = await fetchJson<OLSearchResponse>(url.toString());
  const items = (data.docs ?? []).map(mapOLDoc).filter((b): b is BookSummary => b !== null);
  return { items, total: data.numFound ?? data.num_found ?? items.length };
}

export async function olByIsbn(isbn13: string, timeoutMs?: number): Promise<BookSummary[]> {
  const url = new URL(`${BASE}/search.json`);
  url.searchParams.set('isbn', isbn13);
  url.searchParams.set('limit', '3');
  url.searchParams.set('fields', SEARCH_FIELDS);
  const data = await fetchJson<OLSearchResponse>(url.toString(), { revalidate: 86400, timeoutMs });
  return (data.docs ?? []).map(mapOLDoc).filter((b): b is BookSummary => b !== null);
}

export async function olByTitleAuthor(title: string, author?: string, timeoutMs?: number): Promise<BookSummary[]> {
  const url = new URL(`${BASE}/search.json`);
  url.searchParams.set('title', title);
  if (author) url.searchParams.set('author', author);
  url.searchParams.set('limit', '3');
  url.searchParams.set('fields', `${SEARCH_FIELDS},ia`);
  const data = await fetchJson<OLSearchResponse>(url.toString(), { revalidate: 86400, timeoutMs });
  return (data.docs ?? []).map(mapOLDoc).filter((b): b is BookSummary => b !== null);
}

type OLWork = {
  key?: string;
  title?: string;
  subtitle?: string;
  description?: string | { value?: string };
  subjects?: string[];
  covers?: number[];
  first_publish_date?: string;
};

type OLEditionJson = { works?: Array<{ key?: string }> };

/** Open Library edition ids (…M) are resolved to their work. */
export async function olEditionToWork(olidM: string): Promise<string | null> {
  const ed = await fetchJson<OLEditionJson>(`${BASE}/books/${olidM}.json`, { revalidate: 86400 });
  const key = ed.works?.[0]?.key?.match(WORK_KEY);
  return key ? key[1] : null;
}

export async function olWork(olid: string): Promise<(BookDetail & { iaCandidates: string[] }) | null> {
  const searchUrl = new URL(`${BASE}/search.json`);
  searchUrl.searchParams.set('q', `key:/works/${olid}`);
  searchUrl.searchParams.set('fields', `${SEARCH_FIELDS},ia`);
  searchUrl.searchParams.set('limit', '1');

  const [work, search] = await Promise.all([
    fetchJson<OLWork>(`${BASE}/works/${olid}.json`, { revalidate: 86400 }),
    fetchJson<OLSearchResponse>(searchUrl.toString(), { revalidate: 86400 }).catch(() => null),
  ]);

  const doc: OLSearchDoc = search?.docs?.[0] ?? {
    key: `/works/${olid}`,
    title: work.title,
    cover_i: work.covers?.find((c) => c > 0),
    first_publish_year: parseYear(work.first_publish_date),
  };
  if (!doc.title && work.title) doc.title = work.title;
  const base = mapOLDoc(doc);
  if (!base) return null;

  const subjects = cleanCategories(uniqueStrings([...(work.subjects ?? []), ...(doc.subject ?? [])]), 12);
  return {
    ...base,
    subtitle: base.subtitle ?? cleanString(work.subtitle),
    description: toPlainText(work.description),
    coverUrl: base.coverUrl ?? olCoverUrl(work.covers?.find((c) => c > 0)),
    categories: subjects.slice(0, 6),
    subjects,
    workKey: olid,
    editionCount: positiveInt(doc.edition_count),
    olEbookAccess: isEbookAccess(doc.ebook_access) ? doc.ebook_access : undefined,
    iaCandidates: (doc.ia ?? []).slice(0, 40),
  };
}

function isEbookAccess(v: unknown): v is NonNullable<BookDetail['olEbookAccess']> {
  return v === 'public' || v === 'borrowable' || v === 'printdisabled' || v === 'no_ebook';
}

type IASearch = { response?: { docs?: Array<{ identifier?: string }> } };

/**
 * Open Library's work-level `ia` list mixes public scans with lending-only ones.
 * Ask archive.org which candidates are unrestricted and take the most-read one.
 */
export async function resolvePublicIaId(candidates: string[]): Promise<string | undefined> {
  const ids = candidates.filter((id) => /^[A-Za-z0-9._-]{3,100}$/.test(id)).slice(0, 40);
  if (!ids.length) return undefined;
  const url = new URL('https://archive.org/advancedsearch.php');
  url.searchParams.set(
    'q',
    `identifier:(${ids.join(' OR ')}) AND mediatype:texts AND NOT access-restricted-item:true`,
  );
  url.searchParams.append('fl[]', 'identifier');
  url.searchParams.append('sort[]', 'downloads desc');
  url.searchParams.set('rows', '1');
  url.searchParams.set('output', 'json');
  const data = await fetchJson<IASearch>(url.toString(), { revalidate: 86400, timeoutMs: 3500 });
  const id = data.response?.docs?.[0]?.identifier;
  return id && ids.includes(id) ? id : undefined;
}

type OLEditionsResponse = {
  entries?: Array<{
    key?: string;
    title?: string;
    publishers?: string[];
    publish_date?: string;
    isbn_13?: string[];
    isbn_10?: string[];
    languages?: Array<{ key?: string }>;
    covers?: number[];
    number_of_pages?: number;
  }>;
};

export async function olEditions(olid: string, limit = 24): Promise<Edition[]> {
  const data = await fetchJson<OLEditionsResponse>(`${BASE}/works/${olid}/editions.json?limit=${limit}`, {
    revalidate: 86400,
  });
  const out: Edition[] = [];
  for (const e of data.entries ?? []) {
    const key = e.key?.match(/^\/books\/(OL\d+M)$/)?.[1];
    const title = cleanString(e.title);
    if (!key || !title) continue;
    const isbn = cleanIsbn(e.isbn_13?.[0]).isbn13 ?? cleanIsbn(e.isbn_10?.[0]).isbn13;
    out.push({
      key,
      title,
      publisher: cleanString(e.publishers?.[0]),
      publishedYear: parseYear(e.publish_date),
      isbn13: isbn,
      language: languageCode(e.languages?.[0]?.key?.replace('/languages/', '')),
      coverUrl: olCoverUrl(e.covers?.find((c) => c > 0), 'M'),
      pageCount: positiveInt(e.number_of_pages),
      link: `${BASE}/books/${key}`,
    });
  }
  // Newest first, undated last.
  return out.sort((a, b) => (b.publishedYear ?? 0) - (a.publishedYear ?? 0));
}

type OLTrending = { works?: OLSearchDoc[] };

export async function olTrending(limit = 20): Promise<BookSummary[]> {
  const data = await fetchJson<OLTrending>(`${BASE}/trending/daily.json?limit=${limit}`, { revalidate: 3600 });
  return (data.works ?? []).map(mapOLDoc).filter((b): b is BookSummary => b !== null);
}

export async function olPublicDomain(limit = 20): Promise<BookSummary[]> {
  const url = new URL(`${BASE}/search.json`);
  url.searchParams.set('q', 'ebook_access:public subject:classics');
  url.searchParams.set('sort', 'rating');
  url.searchParams.set('limit', String(limit));
  url.searchParams.set('fields', SEARCH_FIELDS);
  const data = await fetchJson<OLSearchResponse>(url.toString(), { revalidate: 86400 });
  return (data.docs ?? []).map(mapOLDoc).filter((b): b is BookSummary => b !== null);
}

/** Recent fiction with covers; the fallback for "New arrivals" when Google is unavailable. */
export async function olRecent(limit = 20): Promise<BookSummary[]> {
  const url = new URL(`${BASE}/search.json`);
  const from = new Date().getFullYear() - 2;
  url.searchParams.set('q', `subject:fiction first_publish_year:[${from} TO ${from + 2}] language:eng`);
  url.searchParams.set('sort', 'new');
  url.searchParams.set('limit', String(limit * 2));
  url.searchParams.set('fields', SEARCH_FIELDS);
  const data = await fetchJson<OLSearchResponse>(url.toString(), { revalidate: 21600 });
  return (data.docs ?? [])
    .map(mapOLDoc)
    .filter((b): b is BookSummary => b !== null && !!b.coverUrl)
    .slice(0, limit);
}

type OLAuthorSearch = { docs?: Array<{ key?: string; name?: string; work_count?: number }> };
type OLAuthor = {
  name?: string;
  bio?: string | { value?: string };
  birth_date?: string;
  death_date?: string;
  photos?: number[];
};

export async function olAuthor(name: string): Promise<AuthorProfile | null> {
  const url = new URL(`${BASE}/search/authors.json`);
  url.searchParams.set('q', name);
  url.searchParams.set('limit', '5');
  const found = await fetchJson<OLAuthorSearch>(url.toString(), { revalidate: 86400 });
  // Prefer an exact name match, then the most prolific namesake.
  const target = name.toLowerCase();
  const docs = found.docs ?? [];
  const match =
    docs.find((d) => d.name?.toLowerCase() === target) ??
    [...docs].sort((a, b) => (b.work_count ?? 0) - (a.work_count ?? 0))[0];
  const key = match?.key?.replace('/authors/', '');
  if (!key || !/^OL\d+A$/.test(key)) return null;
  const a = await fetchJson<OLAuthor>(`${BASE}/authors/${key}.json`, { revalidate: 86400 });
  const photo = a.photos?.find((p) => p > 0);
  return {
    name: cleanString(a.name) ?? name,
    key,
    bio: toPlainText(a.bio),
    birthDate: cleanString(a.birth_date),
    deathDate: cleanString(a.death_date),
    photoUrl: photo ? `https://covers.openlibrary.org/a/id/${photo}-M.jpg` : undefined,
    link: `${BASE}/authors/${key}`,
  };
}
