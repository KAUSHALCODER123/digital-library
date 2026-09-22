import { describe, expect, it } from 'vitest';
import {
  cleanCategories,
  decodeEntities,
  flipName,
  httpsify,
  isRtl,
  languageCode,
  parseContributors,
  parseYear,
  rating,
  titleAuthorKey,
  toPlainText,
} from './normalize';

describe('toPlainText', () => {
  it('turns Google HTML into plain paragraphs without tags', () => {
    const html = '<p>First <b>bold</b> line.<br>Second line.</p><p>Next &amp; last &#8212; done&hellip;</p>';
    expect(toPlainText(html)).toBe('First bold line.\nSecond line.\n\nNext & last — done…');
  });
  it('drops script-like markup as text, never as HTML', () => {
    expect(toPlainText('<script>alert(1)</script>Safe')).toBe('alert(1)Safe');
  });
  it('reads Open Library {value} descriptions and strips markdown links', () => {
    expect(toPlainText({ type: '/type/text', value: 'See [the wiki](https://example.org) for more.' })).toBe(
      'See the wiki for more.',
    );
  });
  it('returns undefined for empty or non-string input', () => {
    expect(toPlainText('   ')).toBeUndefined();
    expect(toPlainText('<p></p>')).toBeUndefined();
    expect(toPlainText(42)).toBeUndefined();
    expect(toPlainText(null)).toBeUndefined();
  });
});

describe('small helpers', () => {
  it('decodes numeric and named entities, leaves unknown ones', () => {
    expect(decodeEntities('&quot;Hi&quot; &#x41; &unknown;')).toBe('"Hi" A &unknown;');
  });
  it('upgrades http cover URLs and rejects others', () => {
    expect(httpsify('http://books.google.com/x')).toBe('https://books.google.com/x');
    expect(httpsify('javascript:alert(1)')).toBeUndefined();
    expect(httpsify(undefined)).toBeUndefined();
  });
  it('parses years from partial dates', () => {
    expect(parseYear('2012-09-18')).toBe(2012);
    expect(parseYear('c1937')).toBe(1937);
    expect(parseYear('unknown')).toBeUndefined();
    expect(parseYear(99999)).toBeUndefined();
  });
  it('bounds ratings', () => {
    expect(rating(4.456)).toBe(4.5);
    expect(rating(0)).toBeUndefined();
    expect(rating(7)).toBe(5);
    expect(rating(Number.NaN)).toBeUndefined();
  });
  it('normalizes language codes', () => {
    expect(languageCode('en')).toBe('en');
    expect(languageCode('eng')).toBe('en');
    expect(languageCode('pt-BR')).toBe('pt');
    expect(languageCode('xyz')).toBeUndefined();
    expect(isRtl('ar')).toBe(true);
    expect(isRtl('en')).toBe(false);
  });
  it('flips Gutenberg names', () => {
    expect(flipName('Austen, Jane')).toBe('Jane Austen');
    expect(flipName('Homer')).toBe('Homer');
  });
});

describe('parseContributors', () => {
  it('separates roles instead of labelling everyone an author', () => {
    expect(
      parseContributors(['Antoine de Saint-Exupéry', 'Richard Howard (Translator)', 'illustrated by Quentin Blake', 'Jane Doe (ed.)']),
    ).toEqual([
      { name: 'Antoine de Saint-Exupéry', role: 'author' },
      { name: 'Richard Howard', role: 'translator' },
      { name: 'Quentin Blake', role: 'illustrator' },
      { name: 'Jane Doe', role: 'editor' },
    ]);
  });
  it('drops blanks and duplicates', () => {
    expect(parseContributors(['', '  ', 'A. Writer', 'a. writer', 42])).toEqual([{ name: 'A. Writer', role: 'author' }]);
  });
});

describe('cleanCategories', () => {
  it('splits BISAC paths and removes junk subjects', () => {
    expect(cleanCategories(['Fiction / Fantasy / General', 'Accessible book', 'Protected DAISY', 'nyt:bestseller', 'fantasy'])).toEqual([
      'Fiction',
      'Fantasy',
    ]);
  });
  it('respects the limit', () => {
    expect(cleanCategories(['a1', 'b2', 'c3', 'd4'], 2)).toEqual(['A1', 'B2']);
  });
});

describe('titleAuthorKey', () => {
  it('matches the same work across sources despite subtitles, articles and accents', () => {
    expect(titleAuthorKey('The Hobbit: Or There and Back Again', 'J. R. R. Tolkien')).toBe(
      titleAuthorKey('Hobbit', 'J.R.R. Tolkien'),
    );
    expect(titleAuthorKey('Les Misérables', 'Victor Hugo')).toBe(titleAuthorKey('Les Miserables', 'Víctor Hugo'));
  });
  it('keeps different books apart', () => {
    expect(titleAuthorKey('Dune', 'Frank Herbert')).not.toBe(titleAuthorKey('Dune Messiah', 'Frank Herbert'));
    // Regression: a sequel by a relative shares the main title and surname.
    expect(titleAuthorKey('Dune', 'Frank Herbert')).not.toBe(titleAuthorKey('Dune: House Harkonnen', 'Brian Herbert'));
  });
});
