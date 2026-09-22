export const MAX_QUERY_LENGTH = 200;

export type ParsedQuery =
  | { kind: 'empty'; q: '' }
  | { kind: 'invalid'; q: string }
  | { kind: 'isbn'; q: string; isbn13: string }
  | { kind: 'text'; q: string };

/** Characters that break upstream query syntax (Lucene / Google operators) when unbalanced. */
const CONTROL_CHARS = /[\u0000-\u001f\u007f]/g;

export function normalizeWhitespace(s: string): string {
  return s.replace(CONTROL_CHARS, ' ').replace(/\s+/g, ' ').trim();
}

/** Cut long input at a word boundary so a pasted paragraph still makes a sensible query. */
export function truncateQuery(s: string, max = MAX_QUERY_LENGTH): string {
  if (s.length <= max) return s;
  const cut = s.slice(0, max);
  const lastSpace = cut.lastIndexOf(' ');
  return (lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trim();
}

export function parseQuery(raw: string | null | undefined): ParsedQuery {
  const q = truncateQuery(normalizeWhitespace((raw ?? '').normalize('NFC')));
  if (!q) return { kind: 'empty', q: '' };
  // Needs at least one letter or digit in any script; "!!!" or "🙂🙂" can't match a book.
  if (!/[\p{L}\p{N}]/u.test(q)) return { kind: 'invalid', q };
  const isbn = extractIsbn(q);
  if (isbn) return { kind: 'isbn', q, isbn13: isbn };
  return { kind: 'text', q };
}

/** Returns a canonical ISBN-13 if the whole query is a valid ISBN-10/13 (optionally prefixed "isbn"). */
export function extractIsbn(q: string): string | undefined {
  const stripped = q.replace(/^isbn(?:-1[03])?:?\s*/i, '').replace(/[\s-]/g, '').toUpperCase();
  if (/^\d{13}$/.test(stripped) && isValidIsbn13(stripped)) return stripped;
  if (/^\d{9}[\dX]$/.test(stripped) && isValidIsbn10(stripped)) return isbn10To13(stripped);
  return undefined;
}

export function isValidIsbn10(isbn: string): boolean {
  if (!/^\d{9}[\dX]$/.test(isbn)) return false;
  let sum = 0;
  for (let i = 0; i < 10; i++) {
    const c = isbn[i];
    const v = c === 'X' ? 10 : Number(c);
    sum += v * (10 - i);
  }
  return sum % 11 === 0;
}

export function isValidIsbn13(isbn: string): boolean {
  if (!/^\d{13}$/.test(isbn)) return false;
  let sum = 0;
  for (let i = 0; i < 13; i++) sum += Number(isbn[i]) * (i % 2 === 0 ? 1 : 3);
  return sum % 10 === 0;
}

export function isbn10To13(isbn10: string): string {
  const core = '978' + isbn10.slice(0, 9);
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += Number(core[i]) * (i % 2 === 0 ? 1 : 3);
  return core + ((10 - (sum % 10)) % 10);
}

/** Clean an ISBN from upstream data; returns undefined when it isn't a valid one. */
export function cleanIsbn(raw: string | undefined | null): { isbn13?: string; isbn10?: string } {
  if (!raw) return {};
  const s = raw.replace(/[\s-]/g, '').toUpperCase();
  if (isValidIsbn13(s)) return { isbn13: s };
  if (isValidIsbn10(s)) return { isbn10: s, isbn13: isbn10To13(s) };
  return {};
}

/** Escape user text for use inside a quoted upstream query. */
export function escapeForQuery(s: string): string {
  return s.replace(/["\\]/g, ' ').replace(/\s+/g, ' ').trim();
}
