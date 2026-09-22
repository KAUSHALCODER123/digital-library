'use client';

import { Loader2, Search, X } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import type { SuggestItem } from '@/app/api/search/route';
import { buttonClasses } from '@/components/ui/button';
import { buildSearchQuery, type ParsedSearchParams } from '@/lib/books/filters';
import { MAX_QUERY_LENGTH, parseQuery } from '@/lib/books/query';
import { cn } from '@/lib/cn';

type Props = {
  variant: 'hero' | 'header' | 'page';
  defaultValue?: string;
  autoFocus?: boolean;
  /** Search page: typing updates the results in place instead of showing suggestions. */
  live?: boolean;
  /** Current filters on the search page, kept when the query changes. */
  params?: Partial<ParsedSearchParams>;
  className?: string;
};

const SUGGEST_DELAY = 250;
const LIVE_DELAY = 450;

export function SearchBox({ variant, defaultValue = '', autoFocus, live, params, className }: Props) {
  const router = useRouter();
  const id = useId();
  const listId = `${id}-list`;
  const hintId = `${id}-hint`;
  const inputRef = useRef<HTMLInputElement>(null);

  const [value, setValue] = useState(defaultValue);
  const [items, setItems] = useState<SuggestItem[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [loading, setLoading] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const lastPushed = useRef(defaultValue);

  const [hydrated, setHydrated] = useState(false);
  // Keep anything typed before the page finished loading (slow phones), then mark ready.
  useEffect(() => {
    const typed = inputRef.current?.value;
    if (typed && typed !== defaultValue) setValue(typed);
    if (document.activeElement === inputRef.current) setOpen(true);
    setHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount only
  }, []);

  // Keep the box in sync when the URL changes (back/forward, filter links).
  const prevDefault = useRef(defaultValue);
  useEffect(() => {
    if (prevDefault.current === defaultValue) return;
    prevDefault.current = defaultValue;
    setValue(defaultValue);
    lastPushed.current = defaultValue;
  }, [defaultValue]);

  const parsedValue = parseQuery(value);
  const suggestable = !live && parsedValue.kind === 'text' && parsedValue.q.length >= 2;

  // Suggestions (hero/header). Stale items stay hidden because visibility depends on `suggestable`.
  useEffect(() => {
    if (live) return;
    const parsed = parseQuery(value);
    if (parsed.kind !== 'text' || parsed.q.length < 2) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?suggest=1&q=${encodeURIComponent(parsed.q)}`, { signal: controller.signal });
        const data = (await res.json()) as { items?: SuggestItem[] };
        setItems(res.ok && Array.isArray(data.items) ? data.items : []);
        setActive(-1);
      } catch {
        if (!controller.signal.aborted) setItems([]);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, SUGGEST_DELAY);
    return () => {
      clearTimeout(timer);
      controller.abort();
      setLoading(false);
    };
  }, [value, live]);

  // Live results (search page).
  useEffect(() => {
    if (!live) return;
    const parsed = parseQuery(value);
    if (parsed.kind === 'invalid' || parsed.q === lastPushed.current.trim()) return;
    const timer = setTimeout(() => {
      lastPushed.current = parsed.q;
      const qs = buildSearchQuery(params ?? {}, { q: parsed.q, page: 1 });
      router.replace(qs ? `/search?${qs}` : '/search', { scroll: false });
    }, LIVE_DELAY);
    return () => clearTimeout(timer);
  }, [value, live, router, params]);

  const showList = suggestable && open && (items.length > 0 || loading);
  const optionCount = items.length + 1; // + "search for" row

  function go(q: string) {
    const parsed = parseQuery(q);
    if (parsed.kind === 'empty') {
      setHint('Type a title, author, subject or ISBN.');
      inputRef.current?.focus();
      return;
    }
    if (parsed.kind === 'invalid') {
      setHint('Searches need at least one letter or number.');
      return;
    }
    setHint(null);
    setOpen(false);
    lastPushed.current = parsed.q;
    router.push(`/search?${buildSearchQuery(live ? (params ?? {}) : {}, { q: parsed.q, page: 1 })}`);
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (showList && active >= 0 && active < items.length) {
      setOpen(false);
      router.push(items[active].href);
      return;
    }
    go(value);
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (!showList) {
      if (e.key === 'ArrowDown' && items.length) setOpen(true);
      if (e.key === 'Escape' && value && variant !== 'hero') setValue('');
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => (a + 1) % optionCount);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => (a <= 0 ? optionCount - 1 : a - 1));
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
      setActive(-1);
    }
  }

  const isHero = variant === 'hero';
  const isHeader = variant === 'header';

  return (
    <form role="search" onSubmit={onSubmit} className={cn('relative', className)} action="/search" data-hydrated={hydrated}>
      <label htmlFor={`${id}-input`} className="sr-only">
        Search the catalog
      </label>
      <div
        className={cn(
          'flex items-center',
          isHero && 'gap-3 border-b-2 border-ink/70 pb-1 focus-within:border-forest',
          !isHero && 'rounded-sm border border-rule-strong bg-paper-raised focus-within:border-forest',
          isHeader ? 'h-10' : !isHero && 'h-12',
        )}
      >
        {!isHero && <Search aria-hidden className="ms-3 size-4 shrink-0 text-ink-muted" strokeWidth={1.8} />}
        <input
          ref={inputRef}
          id={`${id}-input`}
          name="q"
          type="search"
          inputMode="search"
          enterKeyHint="search"
          autoComplete="off"
          spellCheck={false}
          maxLength={MAX_QUERY_LENGTH + 50}
          autoFocus={autoFocus}
          value={value}
          dir="auto"
          placeholder={isHero ? 'Title, author, subject or ISBN' : 'Search books'}
          role={live ? undefined : 'combobox'}
          aria-autocomplete={live ? undefined : 'list'}
          aria-expanded={live ? undefined : showList}
          aria-controls={live ? undefined : listId}
          aria-activedescendant={showList && active >= 0 ? `${id}-opt-${active}` : undefined}
          aria-describedby={hint ? hintId : undefined}
          onChange={(e) => {
            setValue(e.target.value);
            setOpen(true);
            if (hint) setHint(null);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          onKeyDown={onKeyDown}
          className={cn(
            'w-full min-w-0 bg-transparent text-ink outline-none placeholder:text-ink-muted/80',
            '[&::-webkit-search-cancel-button]:hidden',
            isHero && 'py-2 font-display text-[1.45rem] leading-tight sm:text-h3',
            !isHero && 'px-2.5 text-ui',
          )}
        />
        {loading && <Loader2 aria-hidden className="me-2 size-4 shrink-0 animate-spin text-ink-muted" />}
        {value && !isHero && (
          <button
            type="button"
            onClick={() => {
              setValue('');
              setItems([]);
              inputRef.current?.focus();
            }}
            className="me-1 grid size-8 shrink-0 place-items-center rounded-xs text-ink-muted hover:text-ink"
            aria-label="Clear search"
          >
            <X aria-hidden className="size-4" />
          </button>
        )}
        {isHero && (
          <button type="submit" className={buttonClasses('primary', 'lg', 'max-xs:px-3.5')}>
            <Search aria-hidden className="size-4" strokeWidth={2} />
            <span className="max-xs:sr-only">Search</span>
          </button>
        )}
      </div>

      {hint && (
        <p id={hintId} role="status" className="mt-2 text-caption text-danger">
          {hint}
        </p>
      )}

      {!live && (
        <ul
          id={listId}
          role="listbox"
          aria-label="Suggestions"
          hidden={!showList}
          onMouseDown={(e) => e.preventDefault()}
          className={cn(
            'absolute inset-x-0 top-full z-50 mt-1.5 overflow-hidden rounded-sm border border-rule bg-paper-raised py-1 shadow-[0_18px_40px_-18px_rgb(40_25_10/0.45)]',
            isHero && 'mt-3',
          )}
        >
          {items.map((item, i) => (
            <li
              key={item.id}
              id={`${id}-opt-${i}`}
              role="option"
              aria-selected={active === i}
              onClick={() => {
                setOpen(false);
                router.push(item.href);
              }}
              onMouseEnter={() => setActive(i)}
              className={cn('flex cursor-pointer items-center gap-3 px-3 py-2', active === i && 'bg-ink/[0.06]')}
            >
              <span className="relative block h-11 w-[30px] shrink-0 overflow-hidden rounded-[1px] bg-paper-sunk">
                {item.coverUrl && <Image src={item.coverUrl} alt="" fill sizes="30px" className="object-cover" />}
              </span>
              <span className="min-w-0">
                <span dir="auto" className="block truncate font-display text-[1.02rem] leading-snug text-ink">
                  {item.title}
                </span>
                {(item.author || item.year) && (
                  <span dir="auto" className="block truncate text-caption text-ink-muted">
                    {[item.author, item.year].filter(Boolean).join(', ')}
                  </span>
                )}
              </span>
            </li>
          ))}
          {items.length > 0 && (
            <li
              id={`${id}-opt-${items.length}`}
              role="option"
              aria-selected={active === items.length}
              onClick={() => go(value)}
              onMouseEnter={() => setActive(items.length)}
              className={cn(
                'flex cursor-pointer items-center gap-2 border-t border-rule px-3 py-2.5 text-ui text-forest',
                active === items.length && 'bg-ink/[0.06]',
              )}
            >
              <Search aria-hidden className="size-4" strokeWidth={1.8} />
              <span className="truncate">See all results for “{value.trim()}”</span>
            </li>
          )}
        </ul>
      )}
    </form>
  );
}
