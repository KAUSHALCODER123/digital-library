import { describe, expect, it } from 'vitest';
import { buildGoogleQuery, mapGoogleVolume } from './google';
import { mapGutenberg, pickTextUrl, splitTitle } from './gutendex';
import { buildOLQuery, mapOLDoc } from './openlibrary';

describe('mapGoogleVolume', () => {
  const raw = {
    id: 'hFfhrCWiLSMC',
    volumeInfo: {
      title: 'The Hobbit',
      subtitle: 'Or There and Back Again',
      authors: ['J. R. R. Tolkien', 'Alan Lee (Illustrator)'],
      publisher: 'HarperCollins',
      publishedDate: '2012-02-15',
      description: '<p>A <i>great</i> adventure.</p>',
      industryIdentifiers: [
        { type: 'ISBN_10', identifier: '0547928246' },
        { type: 'ISBN_13', identifier: '9780547928241' },
      ],
      pageCount: 300,
      categories: ['Juvenile Fiction / Fantasy & Magic'],
      averageRating: 4.5,
      ratingsCount: 120,
      maturityRating: 'NOT_MATURE',
      imageLinks: { thumbnail: 'http://books.google.com/books/content?id=hFfhrCWiLSMC&printsec=frontcover&img=1&zoom=1&edge=curl&source=gbs_api' },
      language: 'en',
      canonicalVolumeLink: 'https://books.google.com/books/about/The_Hobbit.html?id=hFfhrCWiLSMC',
    },
    accessInfo: { viewability: 'PARTIAL', embeddable: true, publicDomain: false },
  };

  it('normalizes a full record', () => {
    const b = mapGoogleVolume(raw)!;
    expect(b).toMatchObject({
      id: 'google:hFfhrCWiLSMC',
      source: 'google',
      isbn13: '9780547928241',
      isbn10: '0547928246',
      title: 'The Hobbit',
      authors: ['J. R. R. Tolkien'],
      description: 'A great adventure.',
      categories: ['Juvenile Fiction', 'Fantasy & Magic'],
      publishedYear: 2012,
      pageCount: 300,
      averageRating: 4.5,
      language: 'en',
      readableFullText: false,
      mature: false,
    });
    expect(b.contributors).toContainEqual({ name: 'Alan Lee', role: 'illustrator' });
    expect(b.coverUrl).toMatch(/^https:\/\//);
    expect(b.coverUrl).not.toContain('edge=curl');
    expect(b.reader).toEqual({ kind: 'google', volumeId: 'hFfhrCWiLSMC', full: false });
  });

  it('flags mature content', () => {
    expect(mapGoogleVolume({ ...raw, volumeInfo: { ...raw.volumeInfo, maturityRating: 'MATURE' } })!.mature).toBe(true);
  });

  it('survives sparse records and hides missing fields', () => {
    const b = mapGoogleVolume({ id: 'abcd1234', volumeInfo: { title: 'Bare' } })!;
    expect(b).toMatchObject({ title: 'Bare', authors: [], categories: [], readableFullText: false });
    expect(b.description).toBeUndefined();
    expect(b.coverUrl).toBeUndefined();
    expect(b.externalLink).toContain('abcd1234');
  });

  it('skips records without id or title', () => {
    expect(mapGoogleVolume({ volumeInfo: { title: 'X' } })).toBeNull();
    expect(mapGoogleVolume({ id: 'x1234', volumeInfo: { title: '   ' } })).toBeNull();
  });

  it('builds upstream queries with escaped operators', () => {
    expect(buildGoogleQuery({ q: 'dragons', author: 'Ursula "K" Le Guin' }, 'Fiction / Fantasy')).toBe(
      'dragons inauthor:"Ursula K Le Guin" subject:"Fiction / Fantasy"',
    );
  });
});

describe('mapOLDoc', () => {
  it('normalizes a search doc and keeps every ISBN for dedupe', () => {
    const b = mapOLDoc({
      key: '/works/OL262758W',
      title: 'The Hobbit',
      author_name: ['J.R.R. Tolkien'],
      cover_i: 14627509,
      first_publish_year: 1937,
      isbn: ['0547928246', '9780547928241', 'bogus'],
      language: ['fre', 'eng'],
      subject: ['Fantasy fiction', 'Accessible book'],
      number_of_pages_median: 310,
      ratings_average: 4.25,
      ratings_count: 400,
      ebook_access: 'borrowable',
    })!;
    expect(b).toMatchObject({
      id: 'ol:OL262758W',
      isbn13: '9780547928241',
      allIsbns: ['9780547928241'],
      coverUrl: 'https://covers.openlibrary.org/b/id/14627509-L.jpg',
      categories: ['Fantasy fiction'],
      language: 'en',
      readableFullText: false,
      externalLink: 'https://openlibrary.org/works/OL262758W',
    });
  });

  it('marks public scans readable without inventing an identifier', () => {
    const b = mapOLDoc({ key: '/works/OL1W', title: 'Emma', ebook_access: 'public' })!;
    expect(b.readableFullText).toBe(true);
    expect(b.reader).toBeUndefined();
  });

  it('rejects non-work keys', () => {
    expect(mapOLDoc({ key: '/books/OL1M', title: 'X' })).toBeNull();
  });

  it('builds Lucene queries for filters', () => {
    expect(buildOLQuery({ q: 'emma', page: 1, sort: 'relevance', yearFrom: 1800, readable: true }, 'romance')).toBe(
      'emma subject:"romance" first_publish_year:[1800 TO *] ebook_access:public',
    );
  });
});

describe('Gutendex mapping', () => {
  const raw = {
    id: 84,
    title: 'Frankenstein; Or, The Modern Prometheus',
    authors: [{ name: 'Shelley, Mary Wollstonecraft' }],
    translators: [{ name: 'Doe, John' }],
    summaries: ['A creature is made.'],
    subjects: ['Science fiction -- Fiction', 'Monsters -- Fiction'],
    bookshelves: ['Category: Classics of Literature'],
    languages: ['en'],
    copyright: false,
    media_type: 'Text',
    formats: {
      'text/plain; charset=us-ascii': 'https://www.gutenberg.org/ebooks/84.txt.noimages',
      'text/plain; charset=utf-8': 'https://www.gutenberg.org/ebooks/84.txt.utf-8',
      'image/jpeg': 'https://www.gutenberg.org/cache/epub/84/pg84.cover.medium.jpg',
    },
  };

  it('maps authors, translators and the reader', () => {
    const b = mapGutenberg(raw)!;
    expect(b.title).toBe('Frankenstein');
    expect(b.subtitle).toBe('Or, The Modern Prometheus');
    expect(b.authors).toEqual(['Mary Wollstonecraft Shelley']);
    expect(b.contributors).toContainEqual({ name: 'John Doe', role: 'translator' });
    expect(b.categories).toEqual(['Classics of Literature', 'Science fiction', 'Monsters']);
    expect(b.reader).toEqual({ kind: 'gutenberg', gutenbergId: 84, textUrl: 'https://www.gutenberg.org/ebooks/84.txt.utf-8' });
  });

  it('refuses a reader for copyrighted or non-text items', () => {
    expect(mapGutenberg({ ...raw, copyright: true })!.readableFullText).toBe(false);
    expect(mapGutenberg({ ...raw, media_type: 'Sound' })).toBeNull();
  });

  it('only accepts gutenberg.org text URLs', () => {
    expect(pickTextUrl({ 'text/plain': 'https://evil.example/x.txt' })).toBeUndefined();
    expect(pickTextUrl({ 'text/plain': 'https://www.gutenberg.org/files/1/1.zip' })).toBeUndefined();
  });

  it('splits titles only at real separators', () => {
    expect(splitTitle('Moby Dick; Or, The Whale')).toEqual({ title: 'Moby Dick', subtitle: 'Or, The Whale' });
    expect(splitTitle('Emma')).toEqual({ title: 'Emma' });
  });
});
