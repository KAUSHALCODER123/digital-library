import type { ReactNode } from 'react';

/** Account pages sit on a library-card: the one place the catalog-card motif carries a form. */
export function AuthCard({ title, lead, children, footer }: { title: string; lead?: ReactNode; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-md px-4 pt-10 pb-6 sm:pt-16">
      <div className="index-card relative rounded-xs px-5 pt-3 pb-10 sm:px-8">
        <div className="index-card-header -mx-5 flex h-12 items-end justify-between px-5 pb-2 sm:-mx-8 sm:px-8">
          <span aria-hidden className="font-typed text-caption text-ink-muted">
            Library card
          </span>
          <span aria-hidden className="font-typed text-caption text-ink-muted">
            No. ____
          </span>
        </div>
        <h1 className="mt-6 font-display text-h2 leading-tight font-semibold text-ink">{title}</h1>
        {lead && <p className="mt-2 text-ui text-ink-muted">{lead}</p>}
        <div className="mt-6">{children}</div>
        <div aria-hidden className="punch-hole absolute bottom-3 left-1/2 -translate-x-1/2" />
      </div>
      {footer && <div className="mt-6 text-center text-ui text-ink-muted">{footer}</div>}
    </div>
  );
}

export const fieldClass =
  'mt-1.5 block h-11 w-full rounded-sm border border-rule-strong bg-paper-raised px-3 text-body text-ink placeholder:text-ink-muted/70 focus:border-forest focus:outline-none focus-visible:ring-2 focus-visible:ring-forest/30 aria-[invalid=true]:border-danger';

export const labelClass = 'block text-ui font-semibold text-ink';
