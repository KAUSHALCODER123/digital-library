import Link from 'next/link';
import { LibraryMark } from './Wordmark';

const SOURCES = [
  { href: 'https://books.google.com', label: 'Google Books' },
  { href: 'https://openlibrary.org', label: 'Open Library' },
  { href: 'https://archive.org', label: 'Internet Archive' },
  { href: 'https://www.gutenberg.org', label: 'Project Gutenberg' },
];

function External({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a className="text-ink-muted underline hover:text-ink" href={href} rel="noopener noreferrer" target="_blank">
      {children}
    </a>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-rule bg-paper-sunk/60">
      <div className="mx-auto grid max-w-[1200px] gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr]">
        <div className="max-w-sm">
          <div className="flex items-center gap-2">
            <LibraryMark className="size-6 text-forest" />
            <span className="font-display text-[1.2rem] font-semibold">Bibliotheca</span>
          </div>
          <p className="mt-3 text-ui text-ink-muted">
            A public catalog for finding books and reading the ones that are free to read. No account needed to search
            or read.
          </p>
        </div>
        <nav aria-label="Footer">
          <h2 className="font-sans text-ui font-semibold tracking-normal text-ink">Explore</h2>
          <ul className="mt-3 space-y-2 text-ui">
            <li>
              <Link className="text-ink-muted no-underline hover:text-ink hover:underline" href="/search">
                Search the catalog
              </Link>
            </li>
            <li>
              <Link className="text-ink-muted no-underline hover:text-ink hover:underline" href="/genres">
                Browse by genre
              </Link>
            </li>
            <li>
              <Link className="text-ink-muted no-underline hover:text-ink hover:underline" href="/search?q=classics&readable=1">
                Free to read
              </Link>
            </li>
            <li>
              <Link className="text-ink-muted no-underline hover:text-ink hover:underline" href="/shelf">
                My shelf
              </Link>
            </li>
          </ul>
        </nav>
        <div>
          <h2 className="font-sans text-ui font-semibold tracking-normal text-ink">Where the books come from</h2>
          <p className="mt-3 text-ui text-ink-muted">
            Book details come from <External href={SOURCES[0].href}>Google Books</External> and{' '}
            <External href={SOURCES[1].href}>Open Library</External>. Free books are provided by the{' '}
            <External href={SOURCES[2].href}>Internet Archive</External> and{' '}
            <External href={SOURCES[3].href}>Project Gutenberg</External>.
          </p>
        </div>
      </div>
    </footer>
  );
}
