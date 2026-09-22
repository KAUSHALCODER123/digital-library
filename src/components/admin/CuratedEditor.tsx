'use client';

import { ArrowDown, ArrowUp, Plus, Search, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useId, useState, useTransition, type FormEvent } from 'react';
import { toast } from 'sonner';
import { pinBook, reorderShelf, unpinBook } from '@/app/admin/actions';
import { BookCover } from '@/components/books/BookCover';
import { buttonClasses } from '@/components/ui/button';
import type { BookSummary, SearchResult } from '@/lib/books/types';
import type { CuratedBook } from '@/lib/curated';

export type CuratedRow = { id: string; shelf: 'staff_picks' | 'new_arrivals'; position: number; book: CuratedBook };

function toCurated(b: BookSummary): CuratedBook {
  return {
    id: b.id,
    title: b.title.slice(0, 300),
    authors: b.authors.slice(0, 5).map((a) => a.slice(0, 120)),
    coverUrl: b.coverUrl && b.coverUrl.length <= 500 ? b.coverUrl : undefined,
    categories: b.categories.slice(0, 6).map((c) => c.slice(0, 60)),
    publishedYear: b.publishedYear,
    language: b.language,
    readableFullText: b.readableFullText,
    mature: b.mature,
  };
}

export function CuratedEditor({ shelf, title, rows }: { shelf: CuratedRow['shelf']; title: string; rows: CuratedRow[] }) {
  const router = useRouter();
  const id = useId();
  const [pending, start] = useTransition();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<BookSummary[] | null>(null);
  const [searching, setSearching] = useState(false);

  function run(action: () => Promise<{ ok: boolean; error?: string }>, success: string) {
    start(async () => {
      const r = await action();
      if (!r.ok) toast.error(r.error ?? 'That didn’t work. Try again.');
      else {
        toast.success(success);
        router.refresh();
      }
    });
  }

  async function search(e: FormEvent) {
    e.preventDefault();
    if (query.trim().length < 2) return;
    setSearching(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}`);
      const data = (await res.json()) as SearchResult;
      setResults(res.ok ? data.items.slice(0, 8) : []);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  }

  const pinnedIds = new Set(rows.map((r) => r.book.id));

  function move(index: number, dir: -1 | 1) {
    const ids = rows.map((r) => r.id);
    const j = index + dir;
    if (j < 0 || j >= ids.length) return;
    [ids[index], ids[j]] = [ids[j], ids[index]];
    run(() => reorderShelf(shelf, ids), 'Order saved');
  }

  return (
    <section aria-labelledby={`${id}-h`} aria-busy={pending}>
      <h2 id={`${id}-h`} className="text-h3 font-semibold">
        {title} <span className="text-ui font-normal text-ink-muted">({rows.length})</span>
      </h2>
      {rows.length > 0 && rows.length < 4 && (
        <p className="mt-1 text-caption text-brass-ink">Add {4 - rows.length} more to show this shelf on the home page.</p>
      )}

      <ol className="mt-4 divide-y divide-rule border-y border-rule">
        {rows.length === 0 && <li className="py-4 text-ui text-ink-muted">No books pinned. The home page picks books automatically.</li>}
        {rows.map((r, i) => (
          <li key={r.id} className="flex items-center gap-3 py-3">
            <BookCover book={r.book} size="xs" decorative className="w-9" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-display text-[1.02rem] font-semibold text-ink" dir="auto">
                {r.book.title}
              </p>
              {r.book.authors[0] && <p className="truncate text-caption text-ink-muted">{r.book.authors[0]}</p>}
            </div>
            <div className="flex shrink-0 gap-0.5">
              <button type="button" className={buttonClasses('quiet', 'icon', 'size-8')} disabled={i === 0 || pending} onClick={() => move(i, -1)} aria-label={`Move ${r.book.title} up`}>
                <ArrowUp aria-hidden className="size-4" />
              </button>
              <button type="button" className={buttonClasses('quiet', 'icon', 'size-8')} disabled={i === rows.length - 1 || pending} onClick={() => move(i, 1)} aria-label={`Move ${r.book.title} down`}>
                <ArrowDown aria-hidden className="size-4" />
              </button>
              <button type="button" className={buttonClasses('quiet', 'icon', 'size-8', )} disabled={pending} onClick={() => run(() => unpinBook(r.id), 'Removed from shelf')} aria-label={`Remove ${r.book.title}`}>
                <Trash2 aria-hidden className="size-4 text-danger" />
              </button>
            </div>
          </li>
        ))}
      </ol>

      <form onSubmit={search} className="mt-5 flex gap-2" role="search">
        <label htmlFor={`${id}-q`} className="sr-only">
          Find a book to add to {title}
        </label>
        <input
          id={`${id}-q`}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Find a book to add"
          className="h-10 min-w-0 flex-1 rounded-sm border border-rule-strong bg-paper-raised px-3 text-ui focus:border-forest focus:outline-none"
        />
        <button type="submit" className={buttonClasses('secondary', 'md')} disabled={searching}>
          <Search aria-hidden className="size-4" /> {searching ? 'Searching…' : 'Search'}
        </button>
      </form>
      {results && (
        <ul className="mt-3 divide-y divide-rule rounded-xs border border-rule bg-paper-raised">
          {results.length === 0 && <li className="px-3 py-3 text-ui text-ink-muted">No matches.</li>}
          {results.map((b) => (
            <li key={b.id} className="flex items-center gap-3 px-3 py-2">
              <div className="min-w-0 flex-1">
                <p className="truncate text-ui font-semibold text-ink" dir="auto">
                  {b.title}
                </p>
                <p className="truncate text-caption text-ink-muted">{[b.authors[0], b.publishedYear].filter(Boolean).join(', ')}</p>
              </div>
              <button
                type="button"
                className={buttonClasses('secondary', 'sm')}
                disabled={pending || pinnedIds.has(b.id)}
                onClick={() => run(() => pinBook(shelf, toCurated(b)), `Added to ${title}`)}
              >
                <Plus aria-hidden className="size-3.5" /> {pinnedIds.has(b.id) ? 'Added' : 'Add'}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
