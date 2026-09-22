import type { BookDetail } from '@/lib/books/types';
import { bookHref } from '@/lib/books/slug';

export function siteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
  return raw.replace(/\/+$/, '');
}

/** Meta descriptions come from the book's own text, trimmed at a sentence or word boundary. */
export function metaDescription(text: string | undefined, fallback: string, max = 158): string {
  const t = (text ?? '').replace(/\s+/g, ' ').trim();
  if (!t) return fallback;
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  const sentence = cut.lastIndexOf('. ');
  if (sentence > max * 0.6) return cut.slice(0, sentence + 1);
  return `${cut.slice(0, cut.lastIndexOf(' ')).replace(/[,;:]$/, '')}…`;
}

export function bookFallbackDescription(b: Pick<BookDetail, 'title' | 'authors' | 'publishedYear'>): string {
  const by = b.authors.length ? ` by ${b.authors.slice(0, 2).join(' and ')}` : '';
  const year = b.publishedYear ? `, first published ${b.publishedYear}` : '';
  return `${b.title}${by}${year}. Find details, editions and where to read it.`;
}

/** schema.org Book structured data. Only fields we actually have are included. */
export function bookJsonLd(b: BookDetail): Record<string, unknown> {
  const url = `${siteUrl()}${bookHref(b)}`;
  const data: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Book',
    '@id': url,
    url,
    name: b.title,
    sameAs: b.externalLink,
  };
  if (b.subtitle) data.alternateName = b.subtitle;
  const authors = b.contributors.filter((c) => c.role === 'author');
  if (authors.length) data.author = authors.map((a) => ({ '@type': 'Person', name: a.name }));
  const translators = b.contributors.filter((c) => c.role === 'translator');
  if (translators.length) data.translator = translators.map((a) => ({ '@type': 'Person', name: a.name }));
  const illustrators = b.contributors.filter((c) => c.role === 'illustrator');
  if (illustrators.length) data.illustrator = illustrators.map((a) => ({ '@type': 'Person', name: a.name }));
  if (b.description) data.description = metaDescription(b.description, '', 500);
  if (b.coverUrl) data.image = b.coverUrl;
  if (b.isbn13) data.isbn = b.isbn13;
  if (b.publishedYear) data.datePublished = String(b.publishedYear);
  if (b.publisher) data.publisher = { '@type': 'Organization', name: b.publisher };
  if (b.pageCount) data.numberOfPages = b.pageCount;
  if (b.language) data.inLanguage = b.language;
  if (b.categories.length) data.genre = b.categories.slice(0, 5);
  if (b.averageRating && b.ratingsCount) {
    data.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: b.averageRating,
      ratingCount: b.ratingsCount,
      bestRating: 5,
      worstRating: 1,
    };
  }
  if (b.readableFullText) data.isAccessibleForFree = true;
  return data;
}

/** Safe to inline inside <script type="application/ld+json">: `<` can't close the tag. */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}
