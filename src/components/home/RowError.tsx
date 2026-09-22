'use client';

import { RotateCw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { buttonClasses } from '@/components/ui/button';

/** One shelf failing never takes the page down: it shows this inline note instead. */
export function RowError({ title }: { title: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <section aria-label={title} className="mt-14 first:mt-0">
      <h2 className="text-h3 font-semibold text-ink">{title}</h2>
      <div className="mt-4 flex flex-wrap items-center gap-4 rounded-xs border border-dashed border-rule-strong px-5 py-6">
        <p className="text-ui text-ink-muted">This shelf couldn’t be loaded because a book service didn’t respond.</p>
        <button type="button" className={buttonClasses('secondary', 'sm')} disabled={pending} onClick={() => start(() => router.refresh())}>
          <RotateCw aria-hidden className={pending ? 'size-3.5 animate-spin' : 'size-3.5'} />
          Try again
        </button>
      </div>
    </section>
  );
}
