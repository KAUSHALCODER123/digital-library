import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

/**
 * Empty and error states are written on a catalog card: the librarian's note.
 * `title` says what happened; `children` says what to do next.
 */
export function CatalogNote({
  title,
  children,
  actions,
  tone = 'neutral',
  className,
  headingLevel = 'h2',
}: {
  title: string;
  children?: ReactNode;
  actions?: ReactNode;
  tone?: 'neutral' | 'error';
  className?: string;
  headingLevel?: 'h1' | 'h2' | 'h3';
}) {
  const Heading = headingLevel;
  return (
    <div
      role={tone === 'error' ? 'alert' : undefined}
      className={cn('index-card relative mx-auto max-w-xl rounded-xs px-6 pt-4 pb-8 sm:px-9', className)}
    >
      <div className="index-card-header -mx-6 flex h-11 items-end justify-between px-6 pb-2 sm:-mx-9 sm:px-9">
        <span aria-hidden className="font-typed text-caption text-ink-muted">
          {tone === 'error' ? 'Note to reader' : 'Catalog note'}
        </span>
        <span aria-hidden className="font-typed text-caption text-ink-muted">
          {tone === 'error' ? 'ERR' : '000'}
        </span>
      </div>
      <Heading className="mt-5 font-display text-[1.6rem] leading-[2rem] font-semibold text-ink">{title}</Heading>
      {children && <div className="mt-2 text-ui leading-8 text-ink-muted">{children}</div>}
      {actions && <div className="mt-6 flex flex-wrap gap-3">{actions}</div>}
      <div aria-hidden className="punch-hole absolute bottom-3 left-1/2 -translate-x-1/2" />
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn('animate-pulse rounded-xs bg-ink/[0.07]', className)} />;
}

export function ShelfRowSkeleton({ title }: { title: string }) {
  return (
    <section aria-busy="true" aria-label={`${title}, loading`} className="mt-14 first:mt-0">
      <Skeleton className="h-7 w-48" />
      <Skeleton className="mt-2 h-4 w-72 max-w-full" />
      <div className="relative mt-5 flex gap-5 overflow-hidden px-1 pt-2 sm:gap-7">
        <div aria-hidden className="ledge-bar absolute inset-x-0 top-[176px] sm:top-[206px]" />
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="w-[112px] shrink-0 sm:w-[132px]">
            <div className="flex h-[168px] items-end sm:h-[198px]">
              <Skeleton className="aspect-[2/3] w-full" />
            </div>
            <Skeleton className="mt-4 h-4 w-11/12" />
            <Skeleton className="mt-1.5 h-3 w-2/3" />
          </div>
        ))}
      </div>
    </section>
  );
}

export function ResultsSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div aria-busy="true" aria-label="Loading results" className="divide-y divide-rule">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="flex gap-4 py-6 sm:gap-6">
          <Skeleton className="aspect-[2/3] w-[84px] shrink-0 sm:w-[108px]" />
          <div className="flex-1 space-y-2.5 pt-1">
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-1/4" />
            <Skeleton className="h-3 w-full max-w-lg" />
            <Skeleton className="h-3 w-5/6 max-w-md" />
          </div>
        </div>
      ))}
    </div>
  );
}
