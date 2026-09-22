import { describe, expect, it } from 'vitest';
import { cleanIsbn, extractIsbn, isbn10To13, isValidIsbn10, isValidIsbn13, parseQuery, truncateQuery } from './query';

describe('parseQuery', () => {
  it('treats empty and whitespace-only input as empty', () => {
    expect(parseQuery('')).toEqual({ kind: 'empty', q: '' });
    expect(parseQuery('   \t\n ')).toEqual({ kind: 'empty', q: '' });
    expect(parseQuery(null)).toEqual({ kind: 'empty', q: '' });
    expect(parseQuery(undefined)).toEqual({ kind: 'empty', q: '' });
  });

  it('trims and collapses whitespace', () => {
    expect(parseQuery('  the   hobbit  ')).toEqual({ kind: 'text', q: 'the hobbit' });
  });

  it('strips control characters', () => {
    expect(parseQuery('dune\u0000\u0007 messiah')).toEqual({ kind: 'text', q: 'dune messiah' });
  });

  it('rejects symbol-only and emoji-only queries', () => {
    expect(parseQuery('!!!???').kind).toBe('invalid');
    expect(parseQuery('🙂📚✨').kind).toBe('invalid');
    expect(parseQuery('*&^%$').kind).toBe('invalid');
  });

  it('keeps queries that mix emoji and words', () => {
    expect(parseQuery('📚 dragons')).toEqual({ kind: 'text', q: '📚 dragons' });
  });

  it('accepts non-Latin scripts', () => {
    expect(parseQuery('ノルウェイの森').kind).toBe('text');
    expect(parseQuery('كتاب الأغاني').kind).toBe('text');
  });

  it('caps very long queries at a word boundary', () => {
    const long = 'word '.repeat(200);
    const parsed = parseQuery(long);
    expect(parsed.q.length).toBeLessThanOrEqual(200);
    expect(parsed.q.endsWith('word')).toBe(true);
  });

  it('routes ISBN queries to an exact lookup', () => {
    expect(parseQuery('978-0-547-92822-7')).toEqual({ kind: 'isbn', q: '978-0-547-92822-7', isbn13: '9780547928227' });
    expect(parseQuery('ISBN: 0547928246')).toMatchObject({ kind: 'isbn', isbn13: '9780547928241' });
    expect(parseQuery('isbn 0-8044-2957-X')).toMatchObject({ kind: 'isbn', isbn13: '9780804429573' });
  });

  it('does not treat invalid checksums or plain numbers as ISBNs', () => {
    expect(parseQuery('9780547928228').kind).toBe('text');
    expect(parseQuery('1984').kind).toBe('text');
  });
});

describe('ISBN helpers', () => {
  it('validates checksums', () => {
    expect(isValidIsbn13('9780547928227')).toBe(true);
    expect(isValidIsbn13('9780547928220')).toBe(false);
    expect(isValidIsbn10('080442957X')).toBe(true);
    expect(isValidIsbn10('0804429570')).toBe(false);
  });

  it('converts ISBN-10 to ISBN-13', () => {
    expect(isbn10To13('0547928246')).toBe('9780547928241');
    expect(isbn10To13('080442957X')).toBe('9780804429573');
  });

  it('cleans upstream identifiers', () => {
    expect(cleanIsbn('978-0-547-92822-7')).toEqual({ isbn13: '9780547928227' });
    expect(cleanIsbn('0547928246')).toEqual({ isbn10: '0547928246', isbn13: '9780547928241' });
    expect(cleanIsbn('UOM:39015012345678')).toEqual({});
    expect(cleanIsbn(undefined)).toEqual({});
  });

  it('extracts nothing from text', () => {
    expect(extractIsbn('the hobbit')).toBeUndefined();
  });
});

describe('truncateQuery', () => {
  it('leaves short input alone', () => {
    expect(truncateQuery('short')).toBe('short');
  });
  it('hard-cuts a single enormous token', () => {
    expect(truncateQuery('a'.repeat(500)).length).toBe(200);
  });
});
