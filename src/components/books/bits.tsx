import { BookOpen, Eye, Star } from 'lucide-react';
import Link from 'next/link';
import type { BookSummary, Contributor, ContributorRole } from '@/lib/books/types';
import { cn } from '@/lib/cn';

/** Accessible star rating: one text label for screen readers, decorative stars for everyone else. */
export function Rating({ value, count, className }: { value?: number; count?: number; className?: string }) {
  if (!value) return null;
  const label = `Rated ${value.toFixed(1)} out of 5${count ? ` from ${count.toLocaleString('en')} ${count === 1 ? 'rating' : 'ratings'}` : ''}`;
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-caption text-ink-muted', className)}>
      <span className="sr-only">{label}</span>
      <span aria-hidden className="flex">
        {[0, 1, 2, 3, 4].map((i) => {
          const fill = Math.max(0, Math.min(1, value - i));
          return (
            <span key={i} className="relative inline-block size-3.5">
              <Star className="absolute inset-0 size-3.5 text-brass/45" strokeWidth={1.6} />
              <span className="absolute inset-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
                <Star className="size-3.5 fill-brass text-brass" strokeWidth={1.6} />
              </span>
            </span>
          );
        })}
      </span>
      <span aria-hidden className="tabular-nums">
        {value.toFixed(1)}
        {count ? <span className="text-ink-muted/80"> ({compact(count)})</span> : null}
      </span>
    </span>
  );
}

function compact(n: number): string {
  return new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(n);
}

/** "Read free" only for legally full-text books; "Preview" for publisher previews. */
export function AccessBadge({ book, className }: { book: Pick<BookSummary, 'readableFullText' | 'reader'>; className?: string }) {
  if (book.readableFullText) {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1 rounded-xs border border-brass/60 bg-brass/10 px-1.5 py-0.5 text-caption font-semibold text-brass-ink',
          className,
        )}
      >
        <BookOpen aria-hidden className="size-3.5" strokeWidth={1.8} />
        Read free
      </span>
    );
  }
  if (book.reader?.kind === 'google') {
    return (
      <span className={cn('inline-flex items-center gap-1 rounded-xs border border-rule-strong px-1.5 py-0.5 text-caption text-ink-muted', className)}>
        <Eye aria-hidden className="size-3.5" strokeWidth={1.8} />
        Preview
      </span>
    );
  }
  return null;
}

const ROLE_LABEL: Record<Exclude<ContributorRole, 'author'>, string> = {
  translator: 'Translated by',
  illustrator: 'Illustrated by',
  editor: 'Edited by',
  narrator: 'Read by',
};

function joinNames(names: string[]): string {
  if (names.length <= 2) return names.join(' and ');
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

/** Authors link to their page; other roles are listed separately with their role. */
export function Contributors({
  contributors,
  authors,
  linkAuthors = true,
  max = 3,
  className,
  compactRoles = false,
}: {
  contributors: Contributor[];
  authors: string[];
  linkAuthors?: boolean;
  max?: number;
  className?: string;
  /** Cards show authors only; detail pages show every role. */
  compactRoles?: boolean;
}) {
  const authorList = (authors.length ? authors : contributors.filter((c) => c.role === 'author').map((c) => c.name)).slice(0, max);
  const extra = authors.length - authorList.length;
  const others = compactRoles ? [] : (Object.keys(ROLE_LABEL) as Array<keyof typeof ROLE_LABEL>).flatMap((role) => {
    const names = contributors.filter((c) => c.role === role).map((c) => c.name);
    return names.length ? [{ role, names }] : [];
  });
  if (!authorList.length && !others.length) return null;
  return (
    <div className={cn('space-y-0.5', className)}>
      {authorList.length > 0 && (
        <p dir="auto">
          <span className="text-ink-muted">by </span>
          {authorList.map((a, i) => (
            <span key={a}>
              {i > 0 && (i === authorList.length - 1 && extra <= 0 ? ' and ' : ', ')}
              {linkAuthors ? (
                <Link
                  href={`/authors/${encodeURIComponent(a)}`}
                  className="relative z-10 text-ink underline decoration-rule-strong underline-offset-2 hover:decoration-ink"
                >
                  {a}
                </Link>
              ) : (
                <span className="text-ink">{a}</span>
              )}
            </span>
          ))}
          {extra > 0 && <span className="text-ink-muted"> and {extra} more</span>}
        </p>
      )}
      {others.map((o) => (
        <p key={o.role} dir="auto" className="text-ink-muted">
          {ROLE_LABEL[o.role]} <span className="text-ink">{joinNames(o.names)}</span>
        </p>
      ))}
    </div>
  );
}
