import { describe, expect, it } from 'vitest';
import { bookHref, codeToId, idToCode, isValidBookId, parseBookSlug, slugify } from './slug';

describe('slugify', () => {
  it('makes readable slugs', () => {
    expect(slugify('The Hobbit: Or There and Back Again')).toBe('the-hobbit-or-there-and-back-again');
    expect(slugify('Café & Crème')).toBe('cafe-and-creme');
  });
  it('never produces a double dash or empty slug', () => {
    expect(slugify('A -- B')).toBe('a-b');
    expect(slugify('ノルウェイの森')).toBe('book');
    expect(slugify('!!!')).toBe('book');
  });
  it('caps length without a trailing dash', () => {
    const s = slugify('word '.repeat(40));
    expect(s.length).toBeLessThanOrEqual(60);
    expect(s.endsWith('-')).toBe(false);
  });
});

describe('book ids and codes', () => {
  const cases: Array<[string, string]> = [
    ['google:zyTCAlFPjgYC', 'g-zyTCAlFPjgYC'],
    ['google:a-b--c_d1234', 'g-a-b--c_d1234'],
    ['ol:OL262758W', 'OL262758W'],
    ['gutenberg:1342', 'pg-1342'],
  ];
  it.each(cases)('round-trips %s', (id, code) => {
    expect(idToCode(id)).toBe(code);
    expect(codeToId(code)).toBe(id);
    expect(isValidBookId(id)).toBe(true);
  });

  it('round-trips through the URL, even when the id contains dashes', () => {
    for (const [id] of cases) {
      const href = bookHref({ id, title: 'Some Title -- With Dashes' });
      const param = href.replace('/books/', '');
      expect(parseBookSlug(param)).toEqual({ id, slug: 'some-title-with-dashes' });
    }
  });

  it('accepts a bare code and URL-encoded params', () => {
    expect(parseBookSlug('OL262758W')).toEqual({ id: 'ol:OL262758W', slug: '' });
    expect(parseBookSlug(encodeURIComponent('the-hobbit--OL262758W'))).toEqual({ id: 'ol:OL262758W', slug: 'the-hobbit' });
  });

  it('rejects malformed input', () => {
    expect(parseBookSlug('')).toBeNull();
    expect(parseBookSlug('the-hobbit--nope')).toBeNull();
    expect(parseBookSlug('x--g-')).toBeNull();
    expect(parseBookSlug('x--pg-abc')).toBeNull();
    expect(parseBookSlug('%E0%A4%A')).toBeNull();
    expect(parseBookSlug('a'.repeat(300))).toBeNull();
    expect(isValidBookId('amazon:123')).toBe(false);
  });
});
