import { describe, expect, it } from 'vitest';
import { dedupeBooks, interleave, mergeBooks } from './dedupe';
import type { BookSummary } from './types';

function book(p: Partial<BookSummary> & Pick<BookSummary, 'id' | 'title'>): BookSummary {
  return {
    source: p.id.startsWith('google') ? 'google' : p.id.startsWith('ol') ? 'openlibrary' : 'gutenberg',
    authors: ['Jane Austen'],
    contributors: [{ name: 'Jane Austen', role: 'author' }],
    categories: [],
    readableFullText: false,
    mature: false,
    externalLink: 'https://example.org',
    ...p,
  };
}

describe('dedupeBooks', () => {
  it('merges by ISBN-13 first', () => {
    const out = dedupeBooks([
      book({ id: 'google:aaaa1', title: 'Emma', isbn13: '9780141439587' }),
      book({ id: 'ol:OL1W', title: 'Emma (Penguin Classics)', allIsbns: ['9780000000002', '9780141439587'] }),
    ]);
    expect(out).toHaveLength(1);
  });

  it('merges by ISBN-10 converted to ISBN-13', () => {
    // Google gives both; Open Library only the ISBN-13 of the same edition.
    const out = dedupeBooks([
      book({ id: 'google:bbbb1', title: 'The Hobbit', authors: ['J.R.R. Tolkien'], isbn10: '0547928246', isbn13: '9780547928241' }),
      book({ id: 'ol:OL2W', title: 'Hobbit', authors: ['Tolkien'], allIsbns: ['9780547928241'] }),
    ]);
    expect(out).toHaveLength(1);
  });

  it('falls back to normalized title + author when ISBNs are missing', () => {
    const out = dedupeBooks([
      book({ id: 'google:cccc1', title: 'Pride and Prejudice' }),
      book({ id: 'ol:OL3W', title: 'Pride & Prejudice'.replace('&', 'and') }),
      book({ id: 'gutenberg:1342', title: 'Pride and Prejudice' }),
    ]);
    expect(out).toHaveLength(1);
  });

  it('keeps genuinely different books apart', () => {
    const out = dedupeBooks([
      book({ id: 'google:dddd1', title: 'Emma', isbn13: '9780141439587' }),
      book({ id: 'google:dddd2', title: 'Persuasion', isbn13: '9780141439686' }),
      book({ id: 'google:dddd3', title: 'Emma', authors: ['Someone Else'] }),
    ]);
    expect(out).toHaveLength(3);
  });

  it('preserves relevance order', () => {
    const out = dedupeBooks([
      book({ id: 'google:e1111', title: 'A', authors: ['X'] }),
      book({ id: 'google:e2222', title: 'B', authors: ['Y'] }),
      book({ id: 'ol:OL4W', title: 'A', authors: ['X'] }),
    ]);
    expect(out.map((b) => b.title)).toEqual(['A', 'B']);
  });
});

describe('mergeBooks', () => {
  const google = book({
    id: 'google:ffff1',
    title: 'Emma',
    description: 'A long and helpful description of the novel that is clearly richer than nothing at all.',
    coverUrl: 'https://books.google.com/small.jpg',
    averageRating: 4,
    ratingsCount: 10,
    categories: ['Fiction'],
    publishedYear: 2003,
  });
  const ol = book({
    id: 'ol:OL5W',
    title: 'Emma',
    coverUrl: 'https://covers.openlibrary.org/b/id/1-L.jpg',
    averageRating: 3.9,
    ratingsCount: 900,
    categories: ['Romance', 'fiction'],
    publishedYear: 1815,
    pageCount: 474,
  });

  it('prefers the richer value per field instead of one source wholesale', () => {
    const m = mergeBooks(google, ol);
    expect(m.id).toBe('google:ffff1'); // richer record keeps identity
    expect(m.description).toBe(google.description);
    expect(m.coverUrl).toBe(ol.coverUrl); // larger Open Library cover
    expect(m.ratingsCount).toBe(900); // rating with more votes
    expect(m.averageRating).toBe(3.9);
    expect(m.publishedYear).toBe(1815); // first publication
    expect(m.pageCount).toBe(474);
    expect(m.categories).toEqual(['Fiction', 'Romance']);
  });

  it('keeps the URL identity when enriching a detail page', () => {
    const m = mergeBooks(ol, google, { keepIdentity: true });
    expect(m.id).toBe('ol:OL5W');
    expect(m.description).toBe(google.description);
  });

  it('keeps the best reader and treats mature as sticky', () => {
    const a = book({ id: 'google:g1111', title: 'X', reader: { kind: 'google', volumeId: 'g1111', full: false }, mature: true });
    const b = book({ id: 'gutenberg:5', title: 'X', reader: { kind: 'gutenberg', gutenbergId: 5, textUrl: 'https://www.gutenberg.org/x.txt' }, readableFullText: true });
    const m = mergeBooks(a, b);
    expect(m.reader?.kind).toBe('gutenberg');
    expect(m.readableFullText).toBe(true);
    expect(m.mature).toBe(true);
  });

  it('merges contributors without duplicating people', () => {
    const a = book({ id: 'google:h1111', title: 'X', contributors: [{ name: 'J. Doe', role: 'author' }] });
    const b = book({
      id: 'ol:OL6W',
      title: 'X',
      contributors: [
        { name: 'J Doe', role: 'author' },
        { name: 'R. Roe', role: 'translator' },
      ],
    });
    expect(mergeBooks(a, b).contributors).toEqual([
      { name: 'J. Doe', role: 'author' },
      { name: 'R. Roe', role: 'translator' },
    ]);
  });
});

describe('interleave', () => {
  it('alternates and appends the remainder', () => {
    expect(interleave([1, 3, 5, 7], [2, 4])).toEqual([1, 2, 3, 4, 5, 7]);
  });
});
