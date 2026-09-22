'use client';

import { Loader2, RotateCw } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { BookCard } from '@/components/books/BookCard';
import { buttonClasses } from '@/components/ui/button';
import { buildSearchQuery, MAX_PAGE, type ParsedSearchParams } from '@/lib/books/filters';
import type { BookSummary, SearchResult } from '@/lib/books/types';

type Props = {
  params: ParsedSearchParams;
  initial: SearchResult;
  /** Extra query params the API needs (e.g. author pages). */
  extra?: Record<string, string>;
};

/**
 * Continuous scroll: loads the next page when the sentinel nears the viewport. A visible
 * "Load more" button does the same for keyboard and screen-reader users, and when
 * IntersectionObserver isn't available.
 */
export function InfiniteResults({ params, initial, extra }: Props) {
  const [items, setItems] = useState<BookSummary[]>(initial.items);
  const [page, setPage] = useState(initial.page);
  const [hasMore, setHasMore] = useState(initial.hasMore);
  const [state, setState] = useState<'idle' | 'loading' | 'error'>('idle');
  const [announce, setAnnounce] = useState('');
  const sentinel = useRef<HTMLDivElement>(null);
  const inFlight = useRef(false);

  const key = buildSearchQuery(params, { page: 1 });
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- reset when the query changes */
    setItems(initial.items);
    setPage(initial.page);
    setHasMore(initial.hasMore);
    setState('idle');
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [key, initial]);

  const loadMore = useCallback(async () => {
    if (inFlight.current || !hasMore || page >= MAX_PAGE) return;
    inFlight.current = true;
    setState('loading');
    try {
      const qs = new URLSearchParams(buildSearchQuery(params, { page: page + 1, view: 'pages' }));
      for (const [k, v] of Object.entries(extra ?? {})) qs.set(k, v);
      const res = await fetch(`/api/search?${qs}`);
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as SearchResult;
      const seen = new Set(items.map((b) => b.id));
      const fresh = data.items.filter((b) => !seen.has(b.id));
      setItems([...items, ...fresh]);
      setAnnounce(fresh.length ? `${fresh.length} more books loaded.` : 'No more books found.');
      setPage(data.page);
      setHasMore(data.hasMore && data.items.length > 0);
      setState('idle');
    } catch {
      setState('error');
    } finally {
      inFlight.current = false;
    }
  }, [hasMore, page, params, extra, items]);

  useEffect(() => {
    const el = sentinel.current;
    if (!el || !hasMore || state === 'error' || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver((entries) => entries[0]?.isIntersecting && void loadMore(), { rootMargin: '600px 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, [hasMore, loadMore, state]);

  return (
    <>
      <ol className="divide-y divide-rule" aria-label="Search results">
        {items.map((b) => (
          <li key={b.id}>
            <BookCard book={b} />
          </li>
        ))}
      </ol>
      <p aria-live="polite" className="sr-only">
        {announce}
      </p>
      <div ref={sentinel} className="mt-8 flex min-h-12 justify-center">
        {state === 'error' ? (
          <div className="flex flex-col items-center gap-3 text-center">
            <p className="text-ui text-ink-muted">More results couldn’t be loaded.</p>
            <button type="button" className={buttonClasses('secondary', 'md')} onClick={() => void loadMore()}>
              <RotateCw aria-hidden className="size-4" /> Try again
            </button>
          </div>
        ) : hasMore ? (
          <button type="button" className={buttonClasses('secondary', 'md')} onClick={() => void loadMore()} disabled={state === 'loading'}>
            {state === 'loading' ? <Loader2 aria-hidden className="size-4 animate-spin" /> : null}
            {state === 'loading' ? 'Loading more books' : 'Load more'}
          </button>
        ) : items.length > 0 ? (
          <p className="text-caption text-ink-muted">You’ve reached the end of the results.</p>
        ) : null}
      </div>
    </>
  );
}
