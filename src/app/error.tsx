'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { buttonClasses } from '@/components/ui/button';
import { CatalogNote } from '@/components/ui/states';

/** Route-level error boundary: never shows a stack trace, always offers a way forward. */
export default function RouteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="mx-auto max-w-[1200px] px-4 py-16 sm:px-6 sm:py-24">
      <CatalogNote
        tone="error"
        headingLevel="h1"
        title="Something went wrong on this page"
        actions={
          <>
            <button type="button" onClick={reset} className={buttonClasses('primary', 'md')}>
              Try again
            </button>
            <Link href="/" className={buttonClasses('secondary', 'md')}>
              Go to the home page
            </Link>
          </>
        }
      >
        It’s usually a book service that didn’t respond in time. Trying again often works.
        {error.digest && <span className="mt-1 block text-caption">Reference: {error.digest}</span>}
      </CatalogNote>
    </div>
  );
}
