import Link from 'next/link';
import { Suspense } from 'react';
import { ShelfRow } from '@/components/books/ShelfRow';
import { RowError } from '@/components/home/RowError';
import { SearchBox } from '@/components/search/SearchBox';
import { ShelfRowSkeleton } from '@/components/ui/states';
import { getShelfRow } from '@/lib/books';
import type { BookSummary, ShelfRowKey } from '@/lib/books/types';
import { getCuratedBooks } from '@/lib/curated';
import { GENRES } from '@/lib/genres';

export const revalidate = 3600;

const TRY = [
  { label: 'Ursula K. Le Guin', q: 'Ursula K. Le Guin' },
  { label: 'Middlemarch', q: 'Middlemarch' },
  { label: 'Books about birds', q: 'birds' },
  { label: '9780141439518', q: '9780141439518' },
];

export default function HomePage() {
  return (
    <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
      <Hero />
      <div className="mt-16 sm:mt-24">
        <Row id="new-arrivals" title="New arrivals" description="Recently added to the collection." seeAll="/search?q=fiction&sort=newest" />
        <Row
          id="classics"
          title="Classics you can read free"
          description="Public-domain books that open right here in the reader. No sign-in, no due date."
          seeAll="/search?q=classics&readable=1"
        />
      </div>
      <GenreGrid />
      <div className="mt-20">
        <Row id="trending" title="Trending today" description="What readers on Open Library are opening today." />
        <Row id="staff-picks" title="Staff picks" description="Recommendations from the library team." />
      </div>
    </div>
  );
}

function Hero() {
  return (
    <section aria-labelledby="hero-heading" className="grid items-center gap-10 pt-10 sm:pt-16 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-14">
      <div>
        <h1 id="hero-heading" className="max-w-[14ch] text-[2.5rem] leading-[1.04] font-semibold text-ink sm:text-display">
          Look up any book. Read the free ones here.
        </h1>
        <p className="mt-5 max-w-[46ch] text-lead text-ink-muted">
          Search millions of titles from Google Books and Open Library. Public-domain classics open in the reader, no
          library card needed.
        </p>
      </div>

      <div className="index-card relative rounded-xs px-5 pt-3 pb-10 sm:px-8 lg:-rotate-[0.6deg]">
        <div className="index-card-header -mx-5 flex h-12 items-end justify-between px-5 pb-2 sm:-mx-8 sm:px-8">
          <span className="font-typed text-caption text-ink-muted">Title, author or subject</span>
          <span aria-hidden className="font-typed text-caption text-ink-muted">
            025.04 BIB
          </span>
        </div>
        <SearchBox variant="hero" className="mt-8" />
        <div className="mt-6 flex flex-wrap items-baseline gap-x-4 gap-y-2 text-ui">
          <span className="font-typed text-caption text-ink-muted">Try</span>
          {TRY.map((t) => (
            <Link
              key={t.q}
              href={`/search?q=${encodeURIComponent(t.q)}`}
              className="text-forest underline decoration-forest/30 underline-offset-4 hover:decoration-forest"
            >
              {t.label}
            </Link>
          ))}
        </div>
        <div aria-hidden className="punch-hole absolute bottom-3 left-1/2 -translate-x-1/2" />
      </div>
    </section>
  );
}

function Row({ id, title, description, seeAll }: { id: ShelfRowKey; title: string; description: string; seeAll?: string }) {
  return (
    <Suspense fallback={<ShelfRowSkeleton title={title} />}>
      <RowContent id={id} title={title} description={description} seeAll={seeAll} />
    </Suspense>
  );
}

async function loadRow(id: ShelfRowKey): Promise<BookSummary[]> {
  // Staff-curated shelves win; the live APIs fill in until staff pin something.
  if (id === 'staff-picks' || id === 'new-arrivals') {
    const curated = await getCuratedBooks(id === 'staff-picks' ? 'staff_picks' : 'new_arrivals');
    if (curated.length >= 4) return curated;
  }
  return getShelfRow(id);
}

async function RowContent({ id, title, description, seeAll }: { id: ShelfRowKey; title: string; description: string; seeAll?: string }) {
  let books: BookSummary[];
  try {
    books = await loadRow(id);
  } catch {
    return <RowError title={title} />;
  }
  if (!books.length) return null;
  return <ShelfRow id={id} title={title} description={description} books={books} seeAllHref={seeAll} />;
}

function GenreGrid() {
  return (
    <section aria-labelledby="genres-heading" className="mt-20">
      <div className="flex items-end justify-between gap-4">
        <h2 id="genres-heading" className="text-h3 font-semibold">
          Browse by genre
        </h2>
        <Link href="/genres" className="text-ui font-semibold text-forest underline-offset-4 hover:underline">
          All genres
        </Link>
      </div>
      <ul className="mt-6 grid grid-cols-2 gap-x-6 gap-y-1 sm:grid-cols-3 lg:grid-cols-4">
        {GENRES.slice(0, 12).map((g) => (
          <li key={g.slug}>
            <Link
              href={`/genres/${g.slug}`}
              className="group flex items-center gap-3 border-b border-rule py-3.5 no-underline"
            >
              <span aria-hidden className="h-9 w-2.5 shrink-0 rounded-[1px] shadow-[inset_-2px_0_0_rgb(0_0_0/0.18)]" style={{ backgroundColor: g.cloth }} />
              <span className="font-display text-[1.12rem] text-ink group-hover:underline">{g.label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
