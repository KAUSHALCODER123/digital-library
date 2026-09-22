import Link from 'next/link';
import { buttonClasses } from '@/components/ui/button';
import { CatalogNote } from '@/components/ui/states';

export default function NotFound() {
  return (
    <div className="mx-auto max-w-[1200px] px-4 py-16 sm:px-6 sm:py-24">
      <CatalogNote
        headingLevel="h1"
        title="This page isn’t in the catalog"
        actions={
          <>
            <Link href="/search" className={buttonClasses('primary', 'md')}>
              Search the catalog
            </Link>
            <Link href="/" className={buttonClasses('secondary', 'md')}>
              Go to the home page
            </Link>
          </>
        }
      >
        The link may be mistyped, or the book may have been removed from the source it came from.
      </CatalogNote>
    </div>
  );
}
