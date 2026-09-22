import Link from 'next/link';
import { FavoriteButton, ShelfButton } from '@/components/shelf/ShelfControls';
import { bookHref } from '@/lib/books/slug';
import type { BookSummary } from '@/lib/books/types';
import { isRtl } from '@/lib/books/normalize';
import { toShelfBook } from '@/lib/shelf/types';
import { AccessBadge, Contributors, Rating } from './bits';
import { BookCover } from './BookCover';

/**
 * Search result row. The whole card is clickable through the title link's overlay; the shelf
 * controls and author links sit above that overlay so they stay independently usable.
 */
export function BookCard({ book, headingLevel = 'h2' }: { book: BookSummary; headingLevel?: 'h2' | 'h3' }) {
  const Heading = headingLevel;
  const href = bookHref(book);
  const snippet = book.description?.split('\n')[0];
  const shelfBook = toShelfBook(book);
  return (
    <article className="group relative flex gap-4 py-6 sm:gap-6" lang={book.language} dir={isRtl(book.language) ? 'rtl' : undefined}>
      {/* No hover transform here: it would create a stacking context under the card's link overlay. */}
      <div className="w-[84px] shrink-0 sm:w-[108px]">
        <BookCover book={book} size="md" decorative />
      </div>
      <div className="min-w-0 flex-1">
        <Heading className="font-display text-[1.2rem] leading-snug font-semibold tracking-[-0.005em] text-ink sm:text-[1.32rem]">
          <Link href={href} className="line-clamp-2 no-underline after:absolute after:inset-0 hover:underline" dir="auto">
            {book.title}
          </Link>
        </Heading>
        {book.subtitle && (
          <p dir="auto" className="mt-0.5 line-clamp-1 font-display text-[0.98rem] text-ink-muted italic">
            {book.subtitle}
          </p>
        )}
        <Contributors
          contributors={book.contributors}
          authors={book.authors}
          compactRoles
          className="mt-1.5 text-ui"
        />
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-caption text-ink-muted">
          {book.publishedYear && <span>{book.publishedYear}</span>}
          <Rating value={book.averageRating} count={book.ratingsCount} />
          <AccessBadge book={book} />
        </div>
        {snippet && (
          <p dir="auto" className="mt-2.5 line-clamp-2 max-w-[68ch] text-ui text-ink-muted sm:line-clamp-3">
            {snippet}
          </p>
        )}
        <div className="relative z-10 mt-3 flex items-center gap-1.5">
          <ShelfButton book={shelfBook} variant="compact" />
          <FavoriteButton book={shelfBook} size="sm" />
        </div>
      </div>
    </article>
  );
}
