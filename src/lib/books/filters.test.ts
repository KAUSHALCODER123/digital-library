import { describe, expect, it } from 'vitest';
import { applyFilters, buildSearchQuery, MAX_PAGE, parseSearchParams, sortBooks, toSearchParams } from './filters';
import type { BookSummary } from './types';

const b = (p: Partial<BookSummary>): BookSummary => ({
  id: `google:${p.title ?? 'x'}000`,
  source: 'google',
  title: 'Untitled',
  authors: [],
  contributors: [],
  categories: [],
  readableFullText: false,
  mature: false,
  externalLink: 'https://example.org',
  ...p,
});

describe('parseSearchParams', () => {
  it('applies safe defaults for garbage input', () => {
    const p = parseSearchParams({ page: 'abc', sort: 'evil', language: '<script>', yearFrom: 'x', minRating: '9', genre: '../etc' });
    expect(p).toMatchObject({ page: 1, sort: 'relevance', language: undefined, yearFrom: undefined, minRating: undefined, genre: undefined });
  });

  it('clamps pages and takes the first of repeated params', () => {
    expect(parseSearchParams({ page: '9999' }).page).toBe(1);
    expect(parseSearchParams({ page: String(MAX_PAGE) }).page).toBe(MAX_PAGE);
    expect(parseSearchParams({ q: ['dune', 'other'], page: ['2', '3'] })).toMatchObject({ q: 'dune', page: 2 });
  });

  it('swaps a reversed year range', () => {
    expect(parseSearchParams({ yearFrom: '2000', yearTo: '1990' })).toMatchObject({ yearFrom: 1990, yearTo: 2000 });
  });

  it('sanitizes the query and detects ISBNs', () => {
    expect(parseSearchParams({ q: '   9780547928227 ' }).query).toMatchObject({ kind: 'isbn', isbn13: '9780547928227' });
  });

  it('round-trips through the URL without default noise', () => {
    const p = parseSearchParams({ q: 'dune', page: '2', sort: 'newest', readable: '1', minRating: '4' });
    const qs = buildSearchQuery(p);
    expect(qs).toBe('q=dune&readable=1&minRating=4&sort=newest&page=2');
    expect(parseSearchParams(Object.fromEntries(new URLSearchParams(qs)))).toMatchObject({ q: 'dune', page: 2, sort: 'newest', readable: true, minRating: 4 });
    expect(buildSearchQuery(parseSearchParams({ q: 'x' }))).toBe('q=x');
  });

  it('resets to page 1 when overrides change filters', () => {
    const p = parseSearchParams({ q: 'dune', page: '3' });
    expect(buildSearchQuery(p, { sort: 'title', page: 1 })).toBe('q=dune&sort=title');
  });
});

describe('applyFilters', () => {
  const books = [
    b({ title: 'Old', publishedYear: 1900, averageRating: 4.5, language: 'en', readableFullText: true }),
    b({ title: 'New', publishedYear: 2020, averageRating: 3.2, language: 'fr' }),
    b({ title: 'Unknown' }),
  ];
  const base = toSearchParams(parseSearchParams({ q: 'x' }));

  it('filters by year range, excluding undated books', () => {
    expect(applyFilters(books, { ...base, yearFrom: 1950 }).map((x) => x.title)).toEqual(['New']);
    expect(applyFilters(books, { ...base, yearTo: 1950 }).map((x) => x.title)).toEqual(['Old']);
  });
  it('filters by minimum rating and readability', () => {
    expect(applyFilters(books, { ...base, minRating: 4 }).map((x) => x.title)).toEqual(['Old']);
    expect(applyFilters(books, { ...base, readable: true }).map((x) => x.title)).toEqual(['Old']);
  });
  it('keeps books with unknown language when filtering by language', () => {
    expect(applyFilters(books, { ...base, language: 'en' }).map((x) => x.title)).toEqual(['Old', 'Unknown']);
  });
});

describe('sortBooks', () => {
  const books = [
    b({ title: 'The Zebra', publishedYear: 1990, averageRating: 3 }),
    b({ title: 'apple', averageRating: 5, ratingsCount: 2 }),
    b({ title: 'Mango', publishedYear: 2010, averageRating: 5, ratingsCount: 50 }),
  ];
  it('keeps relevance order', () => {
    expect(sortBooks(books, 'relevance')).toBe(books);
  });
  it('sorts newest first with undated last', () => {
    expect(sortBooks(books, 'newest').map((x) => x.title)).toEqual(['Mango', 'The Zebra', 'apple']);
  });
  it('sorts by rating, breaking ties by vote count', () => {
    expect(sortBooks(books, 'rating').map((x) => x.title)).toEqual(['Mango', 'apple', 'The Zebra']);
  });
  it('sorts titles case-insensitively, ignoring leading articles', () => {
    expect(sortBooks(books, 'title').map((x) => x.title)).toEqual(['apple', 'Mango', 'The Zebra']);
  });
});
