import { ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { buildSearchQuery, MAX_PAGE, type ParsedSearchParams } from '@/lib/books/filters';
import { cn } from '@/lib/cn';

/** Page numbers around the current page. Totals from the APIs are estimates, so we never promise a last page we can't serve. */
export function pageWindow(current: number, lastKnown: number): Array<number | 'gap'> {
  const last = Math.max(current, Math.min(lastKnown, MAX_PAGE));
  const pages = new Set<number>([1, last, current - 1, current, current + 1].filter((p) => p >= 1 && p <= last));
  const sorted = [...pages].sort((a, b) => a - b);
  const out: Array<number | 'gap'> = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) out.push('gap');
    out.push(p);
  });
  return out;
}

export function Pagination({
  params,
  total,
  pageSize,
  hasMore,
  basePath = '/search',
}: {
  params: ParsedSearchParams;
  total: number;
  pageSize: number;
  hasMore: boolean;
  basePath?: string;
}) {
  const current = params.page;
  if (current === 1 && !hasMore) return null;
  const lastKnown = hasMore ? Math.max(current + 1, Math.ceil(total / pageSize)) : current;
  const href = (page: number) => {
    const qs = buildSearchQuery(params, { page });
    return qs ? `${basePath}?${qs}` : basePath;
  };
  const cell = 'grid h-10 min-w-10 place-items-center rounded-sm px-3 text-ui no-underline';

  return (
    <nav aria-label="Pages" className="mt-10 flex flex-wrap items-center justify-center gap-1.5">
      {current > 1 ? (
        <Link href={href(current - 1)} rel="prev" className={cn(cell, 'gap-1 text-ink hover:bg-ink/[0.06]')}>
          <span className="flex items-center gap-1">
            <ChevronLeft aria-hidden className="size-4" /> Previous
          </span>
        </Link>
      ) : null}
      <ul className="flex items-center gap-1">
        {pageWindow(current, lastKnown).map((p, i) =>
          p === 'gap' ? (
            <li key={`gap-${i}`} aria-hidden className="px-1 text-ink-muted">
              …
            </li>
          ) : (
            <li key={p}>
              <Link
                href={href(p)}
                aria-current={p === current ? 'page' : undefined}
                aria-label={`Page ${p}`}
                className={cn(cell, p === current ? 'bg-ink font-semibold text-paper' : 'text-ink hover:bg-ink/[0.06]')}
              >
                {p}
              </Link>
            </li>
          ),
        )}
      </ul>
      {hasMore ? (
        <Link href={href(current + 1)} rel="next" className={cn(cell, 'text-ink hover:bg-ink/[0.06]')}>
          <span className="flex items-center gap-1">
            Next <ChevronRight aria-hidden className="size-4" />
          </span>
        </Link>
      ) : null}
    </nav>
  );
}
