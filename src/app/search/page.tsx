import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { after } from 'next/server';
import { BookCard } from '@/components/books/BookCard';
import { FilterPanel } from '@/components/search/FilterPanel';
import { InfiniteResults } from '@/components/search/InfiniteResults';
import { Pagination } from '@/components/search/Pagination';
import { SortSelect, ViewToggle } from '@/components/search/ResultsToolbar';
import { SearchBox } from '@/components/search/SearchBox';
import { buttonClasses } from '@/components/ui/button';
import { CatalogNote, ResultsSkeleton } from '@/components/ui/states';
import { BooksUnavailableError, lookupIsbn, searchBooks } from '@/lib/books';
import {
  buildSearchQuery,
  hasActiveFilters,
  parseSearchParams,
  toSearchParams,
  type ParsedSearchParams,
  type SearchPageParams,
} from '@/lib/books/filters';
import { bookHref } from '@/lib/books/slug';
import type { SearchResult } from '@/lib/books/types';
import { GENRES, getGenre } from '@/lib/genres';
import { logSearch } from '@/lib/searchLog';

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const p = parseSearchParams(await searchParams);
  const title = p.q ? `Search results for “${p.q}”` : 'Search the catalog';
  return {
    title,
    // Result pages are useful to people, not to search engines.
    robots: { index: false, follow: true },
  };
}

export default async function SearchPage({ searchParams }: Props) {
  const params = parseSearchParams(await searchParams);
  const { query } = params;
  const genre = getGenre(params.genre);

  if (query.kind === 'isbn') {
    const found = await lookupIsbn(query.isbn13).catch(() => null);
    if (found?.length === 1) redirect(bookHref(found[0]));
    if (found) {
      return (
        <Shell params={params}>
          <ResultsHeader params={params} count={found.length} label={`ISBN ${query.isbn13}`} />
          {found.length ? <ResultList items={found} /> : <NoResults params={params} />}
        </Shell>
      );
    }
    return (
      <Shell params={params}>
        <Unavailable params={params} />
      </Shell>
    );
  }

  if (query.kind === 'invalid') {
    return (
      <Shell params={params}>
        <CatalogNote title="That search has no letters or numbers" className="mt-10">
          Symbols and emoji on their own can’t match a book. Try a title, an author’s name, a subject or an ISBN.
        </CatalogNote>
      </Shell>
    );
  }

  if (query.kind === 'empty' && !genre) {
    return (
      <Shell params={params} autoFocus>
        <section aria-labelledby="start-heading" className="mt-10 max-w-3xl">
          <h2 id="start-heading" className="text-h3 font-semibold">
            Start with a genre
          </h2>
          <ul className="mt-5 flex flex-wrap gap-2">
            {GENRES.map((g) => (
              <li key={g.slug}>
                <Link
                  href={`/genres/${g.slug}`}
                  className="inline-block rounded-full border border-rule-strong px-3.5 py-1.5 text-ui text-ink no-underline hover:border-ink-muted hover:bg-paper-raised"
                >
                  {g.label}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </Shell>
    );
  }

  // Results stream into their own boundary so the search box above keeps focus while typing.
  return (
    <Shell params={params}>
      <Suspense key={buildSearchQuery(params)} fallback={<ResultsFallback />}>
        <Results params={params} />
      </Suspense>
    </Shell>
  );
}

function ResultsFallback() {
  return (
    <div className="mt-8 grid gap-10 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-14">
      <div className="hidden lg:block" />
      <div>
        <div className="h-[57px] border-b border-rule" />
        <ResultsSkeleton />
      </div>
    </div>
  );
}

async function Results({ params }: { params: SearchPageParams }) {
  const { query } = params;
  const genre = getGenre(params.genre);
  let result: SearchResult;
  try {
    result = await searchBooks(toSearchParams(params));
  } catch (err) {
    if (!(err instanceof BooksUnavailableError)) console.error('[search]', err);
    return <Unavailable params={params} />;
  }

  if (params.page === 1 && query.kind === 'text') after(() => logSearch(query.q));

  const degraded = result.sources.find((s) => !s.ok);
  const label = params.q || genre?.label || '';

  return (
    <div className="mt-8 grid gap-10 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-14">
      <FilterPanel params={params} />
      <div className="min-w-0">
        <ResultsHeader params={params} count={result.total} label={label} approximate={result.hasMore} />
        {degraded && (
          <p
            role="status"
            className="mt-4 rounded-xs border-s-2 border-brass bg-brass/10 px-3 py-2 text-caption text-ink"
          >
            {degraded.source === 'google' ? 'Google Books' : 'Open Library'} didn’t respond, so these results come from{' '}
            {degraded.source === 'google' ? 'Open Library' : 'Google Books'} only.
          </p>
        )}
        {result.items.length === 0 ? (
          params.page > 1 ? (
            <CatalogNote title="No more results" className="mt-8">
              You’ve reached the end of what the catalog returned for this search.{' '}
              <Link href={`/search?${buildSearchQuery(params, { page: 1 })}`}>Back to the first page</Link>
            </CatalogNote>
          ) : (
            <NoResults params={params} />
          )
        ) : params.view === 'scroll' ? (
          <InfiniteResults params={params} initial={result} />
        ) : (
          <>
            <ResultList items={result.items} />
            <Pagination params={params} total={result.total} pageSize={result.pageSize} hasMore={result.hasMore} />
          </>
        )}
      </div>
    </div>
  );
}

function Shell({
  params,
  children,
  autoFocus,
}: {
  params: ParsedSearchParams;
  children: React.ReactNode;
  autoFocus?: boolean;
}) {
  return (
    <div className="mx-auto max-w-[1200px] px-4 pt-8 pb-4 sm:px-6 sm:pt-12">
      <h1 className="text-h2 font-semibold">Search the catalog</h1>
      <SearchBox
        variant="page"
        live
        defaultValue={params.q}
        params={params}
        autoFocus={autoFocus}
        className="mt-5 max-w-2xl"
      />
      {children}
    </div>
  );
}

function ResultsHeader({
  params,
  count,
  label,
  approximate,
}: {
  params: ParsedSearchParams;
  count: number;
  label: string;
  approximate?: boolean;
}) {
  const n = count.toLocaleString('en');
  const text = count === 0 ? 'No results' : `${approximate ? 'About ' : ''}${n} ${count === 1 ? 'result' : 'results'}`;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-rule pb-4">
      <p aria-live="polite" className="text-ui text-ink-muted">
        {text}
        {label && (
          <>
            {' '}
            for{' '}
            <span className="font-semibold text-ink" dir="auto">
              “{label}”
            </span>
          </>
        )}
        {params.page > 1 && <span>, page {params.page}</span>}
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <SortSelect params={params} />
        <ViewToggle params={params} />
      </div>
    </div>
  );
}

function ResultList({ items }: { items: SearchResult['items'] }) {
  return (
    <ol className="divide-y divide-rule" aria-label="Search results">
      {items.map((b) => (
        <li key={b.id}>
          <BookCard book={b} />
        </li>
      ))}
    </ol>
  );
}

function NoResults({ params }: { params: ParsedSearchParams }) {
  const filtered = hasActiveFilters(params);
  const clearQs = buildSearchQuery({ q: params.q });
  return (
    <CatalogNote title="We couldn’t find that title" className="mt-8">
      <p>Try a different search, or browse by genre. Some tips:</p>
      <ul className="list-disc ps-5">
        <li>Check the spelling, or search for just the author’s surname.</li>
        <li>Use fewer words: “le guin earthsea” instead of the full title.</li>
        {filtered && (
          <li>
            Remove some filters. <Link href={`/search?${clearQs}`}>Search again without filters</Link>
          </li>
        )}
      </ul>
      <p className="mt-2">
        <Link href="/genres">Browse by genre</Link>
      </p>
    </CatalogNote>
  );
}

function Unavailable({ params }: { params: ParsedSearchParams }) {
  const qs = buildSearchQuery(params);
  return (
    <CatalogNote
      tone="error"
      title="The catalog didn’t respond"
      className="mt-10"
      actions={
        <a href={`/search?${qs}`} className={buttonClasses('primary', 'md')}>
          Try again
        </a>
      }
    >
      Google Books and Open Library both failed to answer just now, usually because of a brief outage or too many
      requests. Wait a moment, then try again.
    </CatalogNote>
  );
}
