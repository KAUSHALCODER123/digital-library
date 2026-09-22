import Link from 'next/link';
import { bookHref } from '@/lib/books/slug';
import type { BookSummary } from '@/lib/books/types';
import { AccessBadge } from './bits';
import { BookCover } from './BookCover';
import { ShelfScroller } from './ShelfScroller';

type Props = {
  title: string;
  description?: string;
  books: BookSummary[];
  seeAllHref?: string;
  id: string;
};

/** A horizontally scrolling row of covers standing on a shelf ledge. */
export function ShelfRow({ title, description, books, seeAllHref, id }: Props) {
  const headingId = `${id}-heading`;
  return (
    <section aria-labelledby={headingId} className="mt-14 first:mt-0">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 id={headingId} className="text-h3 font-semibold text-ink">
            {title}
          </h2>
          {description && <p className="mt-1 max-w-[62ch] text-ui text-ink-muted">{description}</p>}
        </div>
        {seeAllHref && (
          <Link href={seeAllHref} className="shrink-0 text-ui font-semibold text-forest underline-offset-4 hover:underline">
            See all<span className="sr-only"> {title.toLowerCase()}</span>
          </Link>
        )}
      </div>
      <ShelfScroller label={title}>
        {books.map((b, i) => (
          <li key={b.id} className="w-[112px] shrink-0 snap-start sm:w-[132px]">
            <Link href={bookHref(b)} className="book-lift group block rounded-xs no-underline">
              <div className="flex h-[168px] items-end sm:h-[198px]">
                <BookCover book={b} size="md" className="w-full" preload={i < 2 && id === 'new-arrivals'} decorative />
              </div>
              <p dir="auto" lang={b.language} className="mt-4 line-clamp-2 font-display text-[0.98rem] leading-snug font-semibold text-ink group-hover:underline">
                {b.title}
              </p>
              {b.authors[0] && (
                <p dir="auto" className="mt-0.5 line-clamp-1 text-caption text-ink-muted">
                  {b.authors[0]}
                </p>
              )}
            </Link>
            {b.readableFullText && <AccessBadge book={b} className="mt-1.5" />}
          </li>
        ))}
      </ShelfScroller>
    </section>
  );
}
