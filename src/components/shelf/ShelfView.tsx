'use client';

import * as Tabs from '@radix-ui/react-tabs';
import { Trash2, X } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useId, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { BookCover } from '@/components/books/BookCover';
import { buttonClasses } from '@/components/ui/button';
import { CatalogNote, Skeleton } from '@/components/ui/states';
import { useAuth } from '@/lib/auth/store';
import { bookHref } from '@/lib/books/slug';
import { cn } from '@/lib/cn';
import { shelfStats } from '@/lib/shelf/stats';
import { useShelf, useShelfHydrated } from '@/lib/shelf/store';
import { READING_STATUSES, type ReadingStatus, type ShelfItem } from '@/lib/shelf/types';
import { readStorage, writeStorage } from '@/lib/storage';
import { FavoriteButton } from './ShelfControls';

type TabKey = ReadingStatus | 'FAVORITE';
const TABS: Array<{ key: TabKey; label: string; empty: string }> = [
  { key: 'WANT_TO_READ', label: 'Want to read', empty: 'Books you want to read will wait for you here.' },
  { key: 'READING', label: 'Currently reading', empty: 'Books you’re reading, with your progress, show up here.' },
  { key: 'READ', label: 'Read', empty: 'Mark books as read to build your reading history.' },
  { key: 'FAVORITE', label: 'Favorites', empty: 'Tap the heart on any book to keep it here.' },
];
const BANNER_KEY = 'bib-guest-banner-dismissed';

function tabFromUrl(): TabKey {
  if (typeof window === 'undefined') return 'WANT_TO_READ';
  const t = new URLSearchParams(window.location.search).get('tab');
  return TABS.some((x) => x.key === t) ? (t as TabKey) : 'WANT_TO_READ';
}

export function ShelfView() {
  const hydrated = useShelfHydrated();
  const itemsMap = useShelf((s) => s.items);
  const { status, enabled } = useAuth();
  const [tab, setTab] = useState<TabKey>('WANT_TO_READ');
  const [bannerDismissed, setBannerDismissed] = useState(true);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- read browser-only state after mount */
    setTab(tabFromUrl());
    setBannerDismissed(readStorage(BANNER_KEY) === '1');
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  const items = useMemo(
    () => Object.values(itemsMap).sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt)),
    [itemsMap],
  );
  const stats = useMemo(() => shelfStats(items), [items]);
  const byTab = (k: TabKey) => items.filter((i) => (k === 'FAVORITE' ? i.favorite : i.status === k));

  function changeTab(v: string) {
    const next = v as TabKey;
    setTab(next);
    const url = new URL(window.location.href);
    if (next === 'WANT_TO_READ') url.searchParams.delete('tab');
    else url.searchParams.set('tab', next);
    window.history.replaceState(null, '', url);
  }

  const showBanner = enabled && status === 'guest' && !bannerDismissed;

  return (
    <div className="mx-auto max-w-[1200px] px-4 pt-8 sm:px-6 sm:pt-12">
      <h1 className="text-h2 font-semibold">My shelf</h1>

      {showBanner && (
        <div role="region" aria-label="Save your shelf" className="mt-5 flex items-start gap-4 rounded-xs border border-rule bg-paper-raised px-4 py-3 sm:items-center">
          <p className="flex-1 text-ui text-ink">
            Your shelf is saved in this browser.{' '}
            <Link href="/login?next=/shelf" className="font-semibold text-forest">
              Sign in
            </Link>{' '}
            to keep it on every device.
          </p>
          <button
            type="button"
            className={buttonClasses('quiet', 'icon', 'size-8')}
            aria-label="Dismiss"
            onClick={() => {
              setBannerDismissed(true);
              writeStorage(BANNER_KEY, '1');
            }}
          >
            <X aria-hidden className="size-4" />
          </button>
        </div>
      )}

      <dl className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-xs border border-rule bg-rule sm:grid-cols-4">
        {[
          { label: `Read in ${new Date().getFullYear()}`, value: stats.readThisYear },
          { label: 'Pages read this year (estimate)', value: stats.pagesReadEstimate },
          { label: 'Currently reading', value: stats.reading },
          { label: 'On your shelf', value: items.length },
        ].map((s) => (
          <div key={s.label} className="bg-paper-raised px-4 py-4">
            <dt className="text-caption text-ink-muted">{s.label}</dt>
            <dd className="mt-1 font-display text-h3 font-semibold text-ink tabular-nums">
              {hydrated ? s.value.toLocaleString('en') : <Skeleton className="h-7 w-10" />}
            </dd>
          </div>
        ))}
      </dl>

      <Tabs.Root value={tab} onValueChange={changeTab} className="mt-10">
        <Tabs.List aria-label="Shelves" className="scrollbar-none -mx-4 flex gap-1 overflow-x-auto border-b border-rule px-4 sm:mx-0 sm:px-0">
          {TABS.map((t) => (
            <Tabs.Trigger
              key={t.key}
              value={t.key}
              className="relative shrink-0 px-3 py-3 text-ui font-semibold text-ink-muted hover:text-ink data-[state=active]:text-ink data-[state=active]:after:absolute data-[state=active]:after:inset-x-3 data-[state=active]:after:-bottom-px data-[state=active]:after:h-0.5 data-[state=active]:after:bg-brass"
            >
              {t.label}
              <span className="ms-1.5 rounded-full bg-ink/[0.07] px-1.5 py-0.5 text-caption tabular-nums">{hydrated ? byTab(t.key).length : '–'}</span>
            </Tabs.Trigger>
          ))}
        </Tabs.List>
        {TABS.map((t) => (
          <Tabs.Content key={t.key} value={t.key} className="outline-none">
            {!hydrated ? (
              <div role="status" className="space-y-4 py-6" aria-busy="true" aria-label="Loading your shelf">
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} className="h-28 w-full" />
                ))}
              </div>
            ) : byTab(t.key).length === 0 ? (
              <CatalogNote
                title="Nothing here yet"
                className="mt-8"
                actions={
                  <>
                    <Link href="/search" className={buttonClasses('primary', 'md')}>
                      Search the catalog
                    </Link>
                    <Link href="/genres" className={buttonClasses('secondary', 'md')}>
                      Browse genres
                    </Link>
                  </>
                }
              >
                {t.empty}
              </CatalogNote>
            ) : (
              <ul className="divide-y divide-rule">
                {byTab(t.key).map((item) => (
                  <ShelfRowItem key={item.bookId} item={item} />
                ))}
              </ul>
            )}
          </Tabs.Content>
        ))}
      </Tabs.Root>
    </div>
  );
}

function ShelfRowItem({ item }: { item: ShelfItem }) {
  const id = useId();
  const setStatus = useShelf((s) => s.setStatus);
  const remove = useShelf((s) => s.remove);
  const href = bookHref(item.book);
  const pct = item.status === 'READING' ? Math.round((item.progress ?? 0) * 100) : null;

  return (
    <li className="flex gap-4 py-5 sm:gap-6">
      <Link href={href} tabIndex={-1} aria-hidden className="w-[64px] shrink-0 sm:w-[80px]">
        <BookCover book={item.book} size="sm" decorative />
      </Link>
      <div className="min-w-0 flex-1">
        <h2 className="font-display text-[1.15rem] leading-snug font-semibold">
          <Link href={href} className="line-clamp-2 text-ink no-underline hover:underline" dir="auto">
            {item.book.title}
          </Link>
        </h2>
        {item.book.authors.length > 0 && (
          <p className="mt-0.5 truncate text-ui text-ink-muted" dir="auto">
            {item.book.authors.join(', ')}
          </p>
        )}
        {pct !== null && (
          <div className="mt-2 flex max-w-xs items-center gap-2">
            <div role="progressbar" aria-label="Reading progress" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} className="h-1.5 flex-1 overflow-hidden rounded-full bg-ink/10">
              <div className="h-full rounded-full bg-forest" style={{ width: `${pct}%` }} />
            </div>
            <span className="text-caption text-ink-muted tabular-nums">{pct}%</span>
          </div>
        )}
        {item.status === 'READ' && item.finishedAt && (
          <p className="mt-1 text-caption text-ink-muted">
            Finished {new Date(item.finishedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
          </p>
        )}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <label htmlFor={`${id}-status`} className="sr-only">
            Shelf for {item.book.title}
          </label>
          <select
            id={`${id}-status`}
            value={item.status ?? ''}
            onChange={(e) => {
              const v = (e.target.value || null) as ReadingStatus | null;
              setStatus(item.book, v);
              const label = READING_STATUSES.find((s) => s.value === v)?.label;
              toast.success(v ? `Moved to ${label}` : 'Kept in favorites only', { description: item.book.title });
            }}
            className="h-9 rounded-sm border border-rule-strong bg-paper-raised px-2 text-caption text-ink focus:border-forest focus:outline-none"
          >
            {!item.status && <option value="">Not on a reading shelf</option>}
            {READING_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
          <FavoriteButton book={item.book} size="sm" />
          <button
            type="button"
            className={cn(buttonClasses('quiet', 'sm', 'h-9'), 'text-ink-muted hover:text-danger')}
            onClick={() => {
              remove(item.bookId);
              toast('Removed from your shelf', { description: item.book.title });
            }}
          >
            <Trash2 aria-hidden className="size-4" strokeWidth={1.7} />
            Remove<span className="sr-only"> {item.book.title}</span>
          </button>
        </div>
      </div>
    </li>
  );
}
