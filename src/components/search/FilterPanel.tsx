'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { SlidersHorizontal, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useId, useState, type ReactNode } from 'react';
import { buttonClasses } from '@/components/ui/button';
import { buildSearchQuery, hasActiveFilters, LANGUAGES, type ParsedSearchParams } from '@/lib/books/filters';
import { cn } from '@/lib/cn';
import { GENRES } from '@/lib/genres';

type Filters = Pick<ParsedSearchParams, 'genre' | 'language' | 'yearFrom' | 'yearTo' | 'readable' | 'minRating'>;

type Props = {
  params: ParsedSearchParams;
  /** Genre pages fix the genre and hide that control. */
  lockedGenre?: string;
  basePath?: string;
};

const THIS_YEAR = new Date().getFullYear();

function pick(p: ParsedSearchParams): Filters {
  return { genre: p.genre, language: p.language, yearFrom: p.yearFrom, yearTo: p.yearTo, readable: p.readable, minRating: p.minRating };
}

/**
 * Sidebar on large screens (applies each change immediately), bottom sheet on small screens
 * (changes are staged until "Show results"). Both write the same URL params.
 */
export function FilterPanel({ params, lockedGenre, basePath = '/search' }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const active = hasActiveFilters({ ...pick(params), genre: lockedGenre ? undefined : params.genre });
  const activeCount = [params.language, params.yearFrom ?? params.yearTo, params.readable || undefined, params.minRating, lockedGenre ? undefined : params.genre].filter(
    (v) => v !== undefined,
  ).length;

  function apply(next: Filters) {
    const qs = buildSearchQuery({ ...params, ...next, genre: lockedGenre ? undefined : next.genre }, { page: 1 });
    router.push(qs ? `${basePath}?${qs}` : basePath, { scroll: false });
  }

  function clearHref() {
    const qs = buildSearchQuery({ q: params.q, sort: params.sort, view: params.view });
    return qs ? `${basePath}?${qs}` : basePath;
  }

  return (
    <>
      {/* Large screens: sidebar */}
      <aside aria-labelledby="filters-heading" className="hidden lg:block">
        <div className="flex items-baseline justify-between">
          <h2 id="filters-heading" className="font-sans text-ui font-semibold tracking-normal">
            Refine results
          </h2>
          {active && (
            <a href={clearHref()} onClick={(e) => { e.preventDefault(); router.push(clearHref(), { scroll: false }); }} className="text-caption text-forest underline-offset-4 hover:underline">
              Clear all
            </a>
          )}
        </div>
        <FilterFields initial={pick(params)} lockedGenre={lockedGenre} onChange={apply} immediate />
      </aside>

      {/* Small screens: bottom sheet */}
      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Trigger className={buttonClasses('secondary', 'md', 'lg:hidden')}>
          <SlidersHorizontal aria-hidden className="size-4" strokeWidth={1.8} />
          Filters
          {activeCount > 0 && (
            <span className="grid size-5 place-items-center rounded-full bg-forest text-[0.7rem] font-bold text-on-forest">
              <span className="sr-only">, </span>
              {activeCount}
              <span className="sr-only"> active</span>
            </span>
          )}
        </Dialog.Trigger>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-ink/40 data-[state=open]:animate-fade-in" />
          <Dialog.Content className="fixed inset-x-0 bottom-0 z-50 flex max-h-[88dvh] flex-col rounded-t-sm border-t border-rule bg-paper-raised pb-safe data-[state=open]:animate-sheet-up">
            <div className="mx-auto mt-3 h-1 w-10 rounded-full bg-rule-strong" aria-hidden />
            <div className="flex items-center justify-between px-4 pt-2">
              <Dialog.Title className="font-display text-h3">Refine results</Dialog.Title>
              <Dialog.Close className={buttonClasses('quiet', 'icon')} aria-label="Close filters">
                <X aria-hidden className="size-5" />
              </Dialog.Close>
            </div>
            <Dialog.Description className="sr-only">Filter search results by genre, language, year, rating and availability.</Dialog.Description>
            <SheetBody params={params} lockedGenre={lockedGenre} onApply={(f) => { setOpen(false); apply(f); }} clearHref={clearHref()} />
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}

function SheetBody({ params, lockedGenre, onApply, clearHref }: { params: ParsedSearchParams; lockedGenre?: string; onApply: (f: Filters) => void; clearHref: string }) {
  const [initial] = useState<Filters>(() => pick(params));
  const [draft, setDraft] = useState<Filters>(initial);
  const router = useRouter();
  return (
    <>
      <div className="overflow-y-auto px-4 pb-4">
        <FilterFields initial={initial} lockedGenre={lockedGenre} onChange={setDraft} />
      </div>
      <div className="flex gap-3 border-t border-rule px-4 py-3">
        <button type="button" className={buttonClasses('secondary', 'lg', 'flex-1')} onClick={() => router.push(clearHref, { scroll: false })}>
          Clear all
        </button>
        <button type="button" className={buttonClasses('primary', 'lg', 'flex-[2]')} onClick={() => onApply(draft)}>
          Show results
        </button>
      </div>
    </>
  );
}

function Field({ label, children, htmlFor }: { label: string; children: ReactNode; htmlFor?: string }) {
  return (
    <div className="border-b border-rule py-4 last:border-b-0">
      {htmlFor ? (
        <label htmlFor={htmlFor} className="block text-caption font-semibold text-ink">
          {label}
        </label>
      ) : (
        <p className="text-caption font-semibold text-ink">{label}</p>
      )}
      <div className="mt-2">{children}</div>
    </div>
  );
}

const control =
  'h-10 w-full rounded-sm border border-rule-strong bg-paper-raised px-2.5 text-ui text-ink focus:border-forest focus:outline-none focus-visible:ring-2 focus-visible:ring-forest/30';

function FilterFields({
  initial,
  lockedGenre,
  onChange,
  immediate,
}: {
  initial: Filters;
  lockedGenre?: string;
  onChange: (f: Filters) => void;
  immediate?: boolean;
}) {
  const id = useId();
  const [f, setF] = useState<Filters>(initial);
  const [yearFrom, setYearFrom] = useState(initial.yearFrom?.toString() ?? '');
  const [yearTo, setYearTo] = useState(initial.yearTo?.toString() ?? '');
  const [yearError, setYearError] = useState<string | null>(null);

  // Reflect URL changes (back button, "Clear all") in the sidebar controls.
  const initialKey = JSON.stringify(initial);
  useEffect(() => {
    const next = JSON.parse(initialKey) as Filters;
    /* eslint-disable react-hooks/set-state-in-effect -- mirror external URL state */
    setF(next);
    setYearFrom(next.yearFrom?.toString() ?? '');
    setYearTo(next.yearTo?.toString() ?? '');
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [initialKey]);

  function update(patch: Partial<Filters>) {
    const next = { ...f, ...patch };
    setF(next);
    onChange(next);
  }

  function commitYears() {
    const parse = (s: string) => (s.trim() === '' ? undefined : Number(s));
    const from = parse(yearFrom);
    const to = parse(yearTo);
    const bad = [from, to].some((y) => y !== undefined && (!Number.isInteger(y) || y < 0 || y > THIS_YEAR + 1));
    if (bad) {
      setYearError(`Enter a year between 0 and ${THIS_YEAR + 1}.`);
      return;
    }
    setYearError(null);
    if (from === f.yearFrom && to === f.yearTo) return;
    update({ yearFrom: from, yearTo: to });
  }

  return (
    <div className={cn(immediate && 'mt-2')}>
      {!lockedGenre && (
        <Field label="Genre" htmlFor={`${id}-genre`}>
          <select id={`${id}-genre`} className={control} value={f.genre ?? ''} onChange={(e) => update({ genre: e.target.value || undefined })}>
            <option value="">Any genre</option>
            {GENRES.map((g) => (
              <option key={g.slug} value={g.slug}>
                {g.label}
              </option>
            ))}
          </select>
        </Field>
      )}

      <Field label="Availability">
        <label className="flex cursor-pointer items-start gap-2.5 text-ui text-ink">
          <input
            type="checkbox"
            className="mt-0.5 size-4 accent-[var(--forest)]"
            checked={!!f.readable}
            onChange={(e) => update({ readable: e.target.checked })}
          />
          <span>
            Free to read online
            <span className="block text-caption text-ink-muted">Public-domain and full-view books only</span>
          </span>
        </label>
      </Field>

      <Field label="Language" htmlFor={`${id}-lang`}>
        <select id={`${id}-lang`} className={control} value={f.language ?? ''} onChange={(e) => update({ language: e.target.value || undefined })}>
          <option value="">Any language</option>
          {LANGUAGES.map((l) => (
            <option key={l.value} value={l.value}>
              {l.label}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Published">
        <div
          className="flex items-center gap-2"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              commitYears();
            }
          }}
        >
          <label className="sr-only" htmlFor={`${id}-from`}>
            From year
          </label>
          <input
            id={`${id}-from`}
            className={control}
            inputMode="numeric"
            placeholder="From"
            maxLength={4}
            value={yearFrom}
            onChange={(e) => setYearFrom(e.target.value.replace(/\D/g, ''))}
            onBlur={commitYears}
            aria-invalid={!!yearError}
            aria-describedby={yearError ? `${id}-year-err` : undefined}
          />
          <span aria-hidden className="text-ink-muted">to</span>
          <label className="sr-only" htmlFor={`${id}-to`}>
            To year
          </label>
          <input
            id={`${id}-to`}
            className={control}
            inputMode="numeric"
            placeholder="To"
            maxLength={4}
            value={yearTo}
            onChange={(e) => setYearTo(e.target.value.replace(/\D/g, ''))}
            onBlur={commitYears}
            aria-invalid={!!yearError}
            aria-describedby={yearError ? `${id}-year-err` : undefined}
          />
        </div>
        {yearError && (
          <p id={`${id}-year-err`} className="mt-1.5 text-caption text-danger">
            {yearError}
          </p>
        )}
      </Field>

      <Field label="Rating">
        <div role="radiogroup" aria-label="Minimum rating" className="flex flex-wrap gap-2">
          {[undefined, 3, 4].map((r) => (
            <label
              key={r ?? 'any'}
              className={cn(
                'cursor-pointer rounded-sm border px-3 py-1.5 text-caption has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-forest/40',
                f.minRating === r ? 'border-forest bg-forest text-on-forest' : 'border-rule-strong text-ink hover:border-ink-muted',
              )}
            >
              <input
                type="radio"
                name={`${id}-rating`}
                className="sr-only"
                checked={f.minRating === r}
                onChange={() => update({ minRating: r })}
              />
              {r ? `${r} stars and up` : 'Any rating'}
            </label>
          ))}
        </div>
      </Field>
    </div>
  );
}
