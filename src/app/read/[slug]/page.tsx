import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, permanentRedirect } from 'next/navigation';
import { GoogleReader, IAReader } from '@/components/reader/EmbedReaders';
import { GutenbergReader } from '@/components/reader/GutenbergReader';
import { ReaderShell } from '@/components/reader/ReaderShell';
import { buttonClasses } from '@/components/ui/button';
import { CatalogNote } from '@/components/ui/states';
import { getBook } from '@/lib/books';
import { availabilityLinks } from '@/lib/books/availability';
import { bookHref, bookSlug, parseBookSlug, readerHref } from '@/lib/books/slug';
import { toShelfBook } from '@/lib/shelf/types';

export const revalidate = 3600;

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const parsed = parseBookSlug(slug);
  const found = parsed ? await getBook(parsed.id).catch(() => null) : null;
  if (!found || !('book' in found)) return { title: 'Reader', robots: { index: false } };
  return {
    title: `Reading ${found.book.title}`,
    // The book page is the canonical, indexable page.
    robots: { index: false, follow: true },
    alternates: { canonical: bookHref(found.book) },
  };
}

export default async function ReadPage({ params }: Props) {
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
          title="The reader couldn’t open this book"
          actions={
            <a href={`/read/${slug}`} className={buttonClasses('primary', 'md')}>
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
  if ('redirectTo' in found) permanentRedirect(`/read/${bookSlug({ id: found.redirectTo, title: 'book' })}`);
  const book = found.book;
  if (decodeURIComponent(slug) !== bookSlug(book)) permanentRedirect(readerHref(book));

  const reader = book.reader;
  const shelfBook = toShelfBook(book);
  const detailsHref = bookHref(book);

  // Copyright gate: no reader source means nothing can be shown in the app.
  if (!reader) {
    const where = availabilityLinks(book)[0];
    return (
      <div className="mx-auto max-w-[1200px] px-4 py-16 sm:px-6">
        <CatalogNote
          headingLevel="h1"
          title="This book can’t be read here"
          actions={
            <>
              <a href={where.href} target="_blank" rel="noopener noreferrer" className={buttonClasses('primary', 'md')}>
                {where.label}
              </a>
              <Link href={detailsHref} className={buttonClasses('secondary', 'md')}>
                Back to book details
              </Link>
            </>
          }
        >
          It isn’t in the public domain and the publisher hasn’t shared a preview, so there’s no legal copy to open.
          Your library may have it.
        </CatalogNote>
      </div>
    );
  }

  if (reader.kind === 'gutenberg') {
    return (
      <GutenbergReader
        book={shelfBook}
        gutenbergId={reader.gutenbergId}
        bookHref={detailsHref}
        sourceHref={`https://www.gutenberg.org/ebooks/${reader.gutenbergId}`}
      />
    );
  }

  if (reader.kind === 'ia') {
    return (
      <ReaderShell
        book={shelfBook}
        bookHref={detailsHref}
        externalHref={`https://archive.org/details/${encodeURIComponent(reader.identifier)}`}
        externalLabel="Open on archive.org"
      >
        <IAReader identifier={reader.identifier} title={book.title} />
      </ReaderShell>
    );
  }

  const googleHref = book.source === 'google' ? book.externalLink : `https://books.google.com/books?id=${encodeURIComponent(reader.volumeId)}`;
  return (
    <ReaderShell book={shelfBook} bookHref={detailsHref} externalHref={googleHref} externalLabel="Open on Google Books">
      <GoogleReader volumeId={reader.volumeId} title={book.title} fallbackHref={googleHref} />
    </ReaderShell>
  );
}
