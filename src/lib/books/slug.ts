/**
 * Book URLs look like `/books/the-hobbit--OL262758W`.
 * Slugs never contain `--`, so the first `--` always separates slug from code,
 * even when a Google volume id itself contains dashes.
 *
 *   google:<volumeId>  <->  g-<volumeId>
 *   ol:<OLID>          <->  OL123W
 *   gutenberg:<n>      <->  pg-<n>
 */

const GOOGLE_ID = /^[A-Za-z0-9_-]{4,40}$/;
const OL_ID = /^OL\d+[WM]$/;
const PG_ID = /^\d{1,7}$/;

export function slugify(input: string, maxLength = 60): string {
  const s = input
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  const cut = s.length > maxLength ? s.slice(0, maxLength).replace(/-[^-]*$/, '') || s.slice(0, maxLength) : s;
  return cut.replace(/-+$/g, '') || 'book';
}

export function isValidBookId(id: string): boolean {
  const [prefix, ...rest] = id.split(':');
  const value = rest.join(':');
  if (prefix === 'google') return GOOGLE_ID.test(value);
  if (prefix === 'ol') return OL_ID.test(value);
  if (prefix === 'gutenberg') return PG_ID.test(value);
  return false;
}

export function idToCode(id: string): string {
  const [prefix, ...rest] = id.split(':');
  const value = rest.join(':');
  if (prefix === 'google') return `g-${value}`;
  if (prefix === 'ol') return value;
  if (prefix === 'gutenberg') return `pg-${value}`;
  throw new Error(`Unknown book id: ${id}`);
}

export function codeToId(code: string): string | null {
  if (code.startsWith('g-')) {
    const v = code.slice(2);
    return GOOGLE_ID.test(v) ? `google:${v}` : null;
  }
  if (code.startsWith('pg-')) {
    const v = code.slice(3);
    return PG_ID.test(v) ? `gutenberg:${v}` : null;
  }
  return OL_ID.test(code) ? `ol:${code}` : null;
}

export function bookSlug(book: { id: string; title: string }): string {
  return `${slugify(book.title)}--${idToCode(book.id)}`;
}

export function bookHref(book: { id: string; title: string }): string {
  return `/books/${bookSlug(book)}`;
}

export function readerHref(book: { id: string; title: string }): string {
  return `/read/${bookSlug(book)}`;
}

function safeDecode(s: string): string {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

/** Parse a `[slug]` route param. Returns null for anything malformed. */
export function parseBookSlug(param: string): { id: string; slug: string } | null {
  const s = safeDecode(param).trim();
  if (!s || s.length > 200) return null;
  const sep = s.indexOf('--');
  const slug = sep === -1 ? '' : s.slice(0, sep);
  const code = sep === -1 ? s : s.slice(sep + 2);
  const id = codeToId(code);
  return id ? { id, slug } : null;
}
