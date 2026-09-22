import Link from 'next/link';
import { BookCard } from '@/components/books/BookCard';
import { buttonClasses } from '@/components/ui/button';
import { CatalogNote } from '@/components/ui/states';
import type { ParsedSearchParams } from '@/lib/books/filters';
import type { SearchResult } from '@/lib/books/types';
import { InfiniteResults } from './InfiniteResults';
import { Pagination } from './Pagination';
import { SortSelect, ViewToggle } from './ResultsToolbar';

/** Result list with sort, layout toggle and paging; shared by genre and author pages. */
export function ResultsBlock({
  params,
  result,
  basePath,
  extra,
  emptyTitle,
  emptyBody,
}: {
  params: ParsedSearchParams;
  result: SearchResult;
  basePath: string;
  extra?: Record<string, string>;
  emptyTitle: string;
  emptyBody: string;
}) {
  const degraded = result.sources.find((s) => !s.ok);
  const n = result.total.toLocaleString('en');
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-rule pb-4">
        <p aria-live="polite" className="text-ui text-ink-muted">
          {result.total === 0 ? 'No books' : `${result.hasMore ? 'About ' : ''}${n} ${result.total === 1 ? 'book' : 'books'}`}
          {params.page > 1 && <span>, page {params.page}</span>}
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <SortSelect params={params} basePath={basePath} />
          <ViewToggle params={params} basePath={basePath} />
        </div>
      </div>
      {degraded && (
        <p role="status" className="mt-4 rounded-xs border-s-2 border-brass bg-brass/10 px-3 py-2 text-caption text-ink">
          One of the book services didn’t respond, so some books may be missing. Reload to try again.
        </p>
      )}
      {result.items.length === 0 ? (
        <CatalogNote
          title={emptyTitle}
          className="mt-8"
          actions={
            <Link href="/search" className={buttonClasses('primary', 'md')}>
              Search the catalog
            </Link>
          }
        >
          {emptyBody}
        </CatalogNote>
      ) : params.view === 'scroll' ? (
        <InfiniteResults params={params} initial={result} extra={extra} />
      ) : (
        <>
          <ol className="divide-y divide-rule" aria-label="Books">
            {result.items.map((b) => (
              <li key={b.id}>
                <BookCard book={b} />
              </li>
            ))}
          </ol>
          <Pagination params={params} total={result.total} pageSize={result.pageSize} hasMore={result.hasMore} basePath={basePath} />
        </>
      )}
    </>
  );
}
