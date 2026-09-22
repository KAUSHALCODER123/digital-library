'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useId } from 'react';
import { buildSearchQuery, SORTS, type ParsedSearchParams } from '@/lib/books/filters';
import type { SortOrder } from '@/lib/books/types';
import { cn } from '@/lib/cn';

export function SortSelect({ params, basePath = '/search' }: { params: ParsedSearchParams; basePath?: string }) {
  const router = useRouter();
  const id = useId();
  return (
    <div className="flex items-center gap-2">
      <label htmlFor={id} className="text-caption text-ink-muted">
        Sort by
      </label>
      <select
        id={id}
        value={params.sort}
        onChange={(e) => {
          const qs = buildSearchQuery(params, { sort: e.target.value as SortOrder, page: 1 });
          router.push(qs ? `${basePath}?${qs}` : basePath, { scroll: false });
        }}
        className="h-10 rounded-sm border border-rule-strong bg-paper-raised px-2.5 text-ui text-ink focus:border-forest focus:outline-none"
      >
        {SORTS.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>
    </div>
  );
}

/** Numbered pages are the default (shareable, back-button friendly); continuous scroll is opt-in. */
export function ViewToggle({ params, basePath = '/search' }: { params: ParsedSearchParams; basePath?: string }) {
  const opts: Array<{ value: ParsedSearchParams['view']; label: string }> = [
    { value: 'pages', label: 'Pages' },
    { value: 'scroll', label: 'Continuous' },
  ];
  return (
    <div role="group" aria-label="Results layout" className="inline-flex rounded-sm border border-rule-strong p-0.5">
      {opts.map((o) => {
        const qs = buildSearchQuery(params, { view: o.value, page: 1 });
        const current = params.view === o.value;
        return (
          <Link
            key={o.value}
            href={qs ? `${basePath}?${qs}` : basePath}
            scroll={false}
            aria-current={current ? 'true' : undefined}
            className={cn(
              'rounded-xs px-3 py-1.5 text-caption font-semibold no-underline',
              current ? 'bg-ink text-paper' : 'text-ink-muted hover:text-ink',
            )}
          >
            {o.label}
          </Link>
        );
      })}
    </div>
  );
}
