import { BookOpen, ExternalLink } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, permanentRedirect } from 'next/navigation';
import { Suspense } from 'react';
import { AccessBadge, Contributors, Rating } from '@/components/books/bits';
import { BookCover } from '@/components/books/BookCover';
import { Expandable } from '@/components/books/Expandable';
import { Reviews } from '@/components/books/Reviews';
import { ShareButton } from '@/components/books/ShareButton';
import { ShelfRow } from '@/components/books/ShelfRow';
import { FavoriteButton, ShelfButton } from '@/components/shelf/ShelfControls';
import { buttonClasses } from '@/components/ui/button';
import { CatalogNote, ShelfRowSkeleton, Skeleton } from '@/components/ui/states';
import { getBook, getEditions, getSimilar } from '@/lib/books';
import { availabilityLinks } from '@/lib/books/availability';
import { isRtl, languageName } from '@/lib/books/normalize';
import { bookHref, bookSlug, parseBookSlug, readerHref } from '@/lib/books/slug';
import type { BookDetail } from '@/lib/books/types';
import { toShelfBook } from '@/lib/shelf/types';
import { bookFallbackDescription, bookJsonLd, metaDescription, serializeJsonLd } from '@/lib/seo';

export const revalidate = 3600;

type Props = { params: Promise<{ slug: string }> };

async function resolve(slug: string) {
  const parsed = parseBookSlug(slug);
  if (!parsed) return null;
  return getBook(parsed.id);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  let found;
  try {
    found = await resolve(slug);
  } catch {
    return { title: 'Book' };
  }
  if (!found || !('book' in found)) return { title: 'Book not found', robots: { index: false } };
  const b = found.book;
  const description = metaDescription(b.description, bookFallbackDescription(b));
  const title = b.authors[0] ? `${b.title} by ${b.authors[0]}` : b.title;
  return {
    title,
    description,
    alternates: { canonical: bookHref(b) },
    openGraph: {
      type: 'book',
      title: b.title,
      description,
      url: bookHref(b),
      images: b.coverUrl && !b.mature ? [{ url: b.coverUrl, alt: `Cover of ${b.title}` }] : undefined,
      ...(b.isbn13 ? { isbn: b.isbn13 } : {}),
      ...(b.authors.length ? { authors: b.authors } : {}),
    },
    twitter: { card: b.coverUrl ? 'summary_large_image' : 'summary', title: b.title, description },
  };
}

export default async function BookPage({ params }: Props) {
  const { slug } = await params;
  const parsed = parseBookSlug(slug);
  if (!parsed) notFound();

  let found;
  try {
    found = await getBook(parsed.id);
  } catch {
    return (
      <div className="mx-auto max-w-[1200px] px-4 py-16 sm:px-6">
        <CatalogNote
          tone="error"
          headingLevel="h1"
          title="This book’s details didn’t load"
          actions={
            <a href={`/books/${slug}`} className={buttonClasses('primary', 'md')}>
              Try again
            </a>
          }
        >
          The book service didn’t respond in time. It’s usually back within a minute.
        </CatalogNote>
      </div>
    );
  }
  if (!found) notFound();
  if ('redirectTo' in found) permanentRedirect(`/books/${bookSlug({ id: found.redirectTo, title: 'book' })}`);

  const book = found.book;
  // Keep one canonical URL per book, even if someone edits the slug part.
  if (decodeURIComponent(slug) !== bookSlug(book)) permanentRedirect(bookHref(book));

  const rtl = isRtl(book.language);
  const shelfBook = toShelfBook(book);
  const paragraphs = book.description?.split(/\n{2,}/).filter(Boolean) ?? [];
  const hasReader = !!book.reader;
  const external = availabilityLinks(book);

  return (
    <div className="mx-auto max-w-[1200px] px-4 pt-8 sm:px-6 sm:pt-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(bookJsonLd(book)) }} />

      <div className="grid gap-8 md:grid-cols-[minmax(0,260px)_minmax(0,1fr)] md:gap-14">
        <div className="mx-auto w-[180px] md:mx-0 md:w-full">
          <BookCover book={book} size="xl" preload className="w-full" />
        </div>

        <div className="min-w-0" lang={book.language} dir={rtl ? 'rtl' : undefined}>
          <h1 dir="auto" className="text-[2rem] leading-[1.1] font-semibold break-words text-ink sm:text-h1">
            {book.title}
          </h1>
          {book.subtitle && (
            <p dir="auto" className="mt-2 font-display text-lead text-ink-muted italic">
              {book.subtitle}
            </p>
          )}
          <Contributors contributors={book.contributors} authors={book.authors} max={6} className="mt-4 text-body" />
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Rating value={book.averageRating} count={book.ratingsCount} className="text-ui" />
            <AccessBadge book={book} />
          </div>

          <div className="mt-7 flex flex-wrap items-center gap-2.5">
            {hasReader ? (
              <Link href={readerHref(book)} className={buttonClasses('primary', 'lg')}>
                <BookOpen aria-hidden className="size-[18px]" strokeWidth={1.8} />
                {book.readableFullText ? 'Read now' : 'Read a preview'}
              </Link>
            ) : (
              <a href={external[0].href} target="_blank" rel="noopener noreferrer" className={buttonClasses('primary', 'lg')}>
                Check availability
                <ExternalLink aria-hidden className="size-4" strokeWidth={1.8} />
                <span className="sr-only">(opens WorldCat in a new tab)</span>
              </a>
            )}
            <ShelfButton book={shelfBook} emphasis={hasReader ? "secondary" : "primary"} />
            <FavoriteButton book={shelfBook} />
            <ShareButton title={book.title} path={bookHref(book)} />
          </div>
          {hasReader && !book.readableFullText && (
            <p className="mt-3 text-caption text-ink-muted">The publisher shares some pages as a preview. The full book isn’t free to read.</p>
          )}

          {paragraphs.length > 0 && (
            <section aria-labelledby="about-heading" className="mt-10">
              <h2 id="about-heading" className="sr-only">
                About this book
              </h2>
              <Expandable paragraphs={paragraphs} lang={book.language} />
            </section>
          )}

          <Details book={book} />

          {book.categories.length > 0 && (
            <section aria-labelledby="subjects-heading" className="mt-8">
              <h2 id="subjects-heading" className="font-sans text-ui font-semibold tracking-normal text-ink">
                Subjects
              </h2>
              <ul className="mt-3 flex flex-wrap gap-2">
                {book.categories.map((c) => (
                  <li key={c}>
                    <Link
                      href={`/search?q=${encodeURIComponent(c)}`}
                      className="inline-block rounded-full border border-rule-strong px-3 py-1 text-caption text-ink no-underline hover:border-ink-muted hover:bg-paper-raised"
                    >
                      {c}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section aria-labelledby="where-heading" className="mt-10">
            <h2 id="where-heading" className="font-sans text-ui font-semibold tracking-normal text-ink">
              {hasReader ? 'Elsewhere' : 'Where to find it'}
            </h2>
            <ul className="mt-2 divide-y divide-rule border-y border-rule">
              {external.map((l) => (
                <li key={l.href}>
                  <a href={l.href} target="_blank" rel="noopener noreferrer" className="group flex items-center justify-between gap-4 py-3 no-underline">
                    <span>
                      <span className="block text-ui font-semibold text-ink group-hover:underline">{l.label}</span>
                      <span className="block text-caption text-ink-muted">{l.description}</span>
                    </span>
                    <ExternalLink aria-hidden className="size-4 shrink-0 text-ink-muted" strokeWidth={1.7} />
                    <span className="sr-only">(opens in a new tab)</span>
                  </a>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>

      <Suspense fallback={<EditionsSkeleton />}>
        <Editions book={book} />
      </Suspense>

      <Suspense fallback={<div className="mt-16"><ShelfRowSkeleton title="More like this" /></div>}>
        <Similar book={book} />
      </Suspense>

      <Reviews bookId={book.id} title={book.title} />
    </div>
  );
}

function Details({ book }: { book: BookDetail }) {
  const rows: Array<[string, string]> = [];
  if (book.publishedYear) rows.push([book.source === 'openlibrary' ? 'First published' : 'Published', String(book.publishedYear)]);
  if (book.publisher) rows.push(['Publisher', book.publisher]);
  if (book.pageCount) rows.push(['Pages', book.pageCount.toLocaleString('en')]);
  const lang = languageName(book.language);
  if (lang) rows.push(['Language', lang]);
  if (book.isbn13) rows.push(['ISBN-13', book.isbn13]);
  if (book.isbn10) rows.push(['ISBN-10', book.isbn10]);
  if (book.editionCount && book.editionCount > 1) rows.push(['Editions', book.editionCount.toLocaleString('en')]);
  if (!rows.length) return null;
  return (
    <section aria-labelledby="details-heading" className="mt-10">
      <h2 id="details-heading" className="sr-only">
        Details
      </h2>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-4 border-t border-rule pt-5 sm:grid-cols-3">
        {rows.map(([k, v]) => (
          <div key={k}>
            <dt className="text-caption text-ink-muted">{k}</dt>
            <dd className="mt-0.5 text-ui text-ink tabular-nums" dir="auto">
              {v}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

async function Editions({ book }: { book: BookDetail }) {
  const editions = await getEditions(book.workKey);
  if (editions.length < 2) return null;
  return (
    <section aria-labelledby="editions-heading" className="mt-20">
      <h2 id="editions-heading" className="text-h3 font-semibold">
        Editions
      </h2>
      <p className="mt-1 text-ui text-ink-muted">
        {book.editionCount && book.editionCount > editions.length
          ? `Showing ${editions.length} of ${book.editionCount.toLocaleString('en')} editions listed on Open Library.`
          : 'Editions listed on Open Library.'}
      </p>
      <div className="mt-5 overflow-x-auto">
        <table className="w-full min-w-[560px] border-collapse text-left text-ui">
          <thead>
            <tr className="border-b border-rule-strong text-caption text-ink-muted">
              <th scope="col" className="py-2 pe-4 font-semibold">Title</th>
              <th scope="col" className="py-2 pe-4 font-semibold">Year</th>
              <th scope="col" className="py-2 pe-4 font-semibold">Publisher</th>
              <th scope="col" className="py-2 pe-4 font-semibold">Language</th>
              <th scope="col" className="py-2 font-semibold">ISBN</th>
            </tr>
          </thead>
          <tbody>
            {editions.map((e) => (
              <tr key={e.key} className="border-b border-rule align-top">
                <td className="py-2.5 pe-4">
                  <a href={e.link} target="_blank" rel="noopener noreferrer" className="text-ink" dir="auto" lang={e.language}>
                    {e.title}
                    <span className="sr-only"> (opens Open Library in a new tab)</span>
                  </a>
                </td>
                <td className="py-2.5 pe-4 tabular-nums text-ink-muted">{e.publishedYear ?? ''}</td>
                <td className="py-2.5 pe-4 text-ink-muted" dir="auto">{e.publisher ?? ''}</td>
                <td className="py-2.5 pe-4 text-ink-muted">{languageName(e.language) ?? ''}</td>
                <td className="py-2.5 tabular-nums text-ink-muted">{e.isbn13 ?? ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function EditionsSkeleton() {
  return (
    <div className="mt-20 space-y-3" aria-hidden>
      <Skeleton className="h-7 w-40" />
      <Skeleton className="h-4 w-72" />
      <Skeleton className="h-40 w-full" />
    </div>
  );
}

async function Similar({ book }: { book: BookDetail }) {
  let books;
  try {
    books = await getSimilar(book);
  } catch {
    return null;
  }
  if (books.length < 3) return null;
  return (
    <div className="mt-20">
      <ShelfRow id="similar" title="More like this" description="Books that share a subject or an author." books={books} />
    </div>
  );
}
