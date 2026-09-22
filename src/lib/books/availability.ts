import type { BookDetail } from './types';

export type AvailabilityLink = { label: string; href: string; description: string };

/** Where to find a book that can't be read in the app. Only links we can build honestly. */
export function availabilityLinks(b: BookDetail): AvailabilityLink[] {
  const byLine = [b.title, b.authors[0]].filter(Boolean).join(' ');
  const links: AvailabilityLink[] = [
    {
      label: 'Find it in a library near you',
      href: b.isbn13
        ? `https://search.worldcat.org/search?q=bn%3A${b.isbn13}`
        : `https://search.worldcat.org/search?q=${encodeURIComponent(byLine)}`,
      description: 'WorldCat lists libraries that hold this book.',
    },
  ];
  if (b.olEbookAccess === 'borrowable' || b.olEbookAccess === 'printdisabled') {
    links.push({
      label: 'Borrow the ebook from Open Library',
      href: b.workKey ? `https://openlibrary.org/works/${b.workKey}` : b.externalLink,
      description: 'Free with an Open Library account, one reader at a time.',
    });
  }
  const google = b.source === 'google' ? b.externalLink : b.isbn13 ? `https://books.google.com/books?vid=ISBN${b.isbn13}` : undefined;
  if (google) links.push({ label: 'View on Google Books', href: google, description: 'Previews, editions and where to buy.' });
  const ol = b.source === 'openlibrary' ? b.externalLink : b.workKey ? `https://openlibrary.org/works/${b.workKey}` : undefined;
  if (ol && !links.some((l) => l.href === ol)) links.push({ label: 'View on Open Library', href: ol, description: 'Editions, subjects and reading lists.' });
  if (b.source === 'gutenberg') links.push({ label: 'View on Project Gutenberg', href: b.externalLink, description: 'Download as EPUB, Kindle or plain text.' });
  return links;
}
