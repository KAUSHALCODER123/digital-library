import Link from 'next/link';
import { buttonClasses } from '@/components/ui/button';
import { CatalogNote } from '@/components/ui/states';

/** Shown when the site runs without Supabase keys: everything but accounts still works. */
export function AccountsUnavailable() {
  return (
    <div className="mx-auto max-w-[1200px] px-4 py-16 sm:px-6">
      <CatalogNote
        headingLevel="h1"
        title="Accounts aren’t available on this site yet"
        actions={
          <Link href="/shelf" className={buttonClasses('primary', 'md')}>
            Go to my shelf
          </Link>
        }
      >
        You can still search, read free books and keep a shelf. It’s saved in this browser.
      </CatalogNote>
    </div>
  );
}
