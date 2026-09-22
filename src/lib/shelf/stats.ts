import type { ShelfItem } from './types';

/** Used when a book's page count is unknown, so estimates aren't skewed to zero. */
export const DEFAULT_PAGE_COUNT = 280;

export type ShelfStats = {
  readThisYear: number;
  readTotal: number;
  reading: number;
  wantToRead: number;
  favorites: number;
  pagesReadEstimate: number;
};

export function shelfStats(items: ShelfItem[], now = new Date()): ShelfStats {
  const year = now.getFullYear();
  let readThisYear = 0;
  let pages = 0;
  const s = { readTotal: 0, reading: 0, wantToRead: 0, favorites: 0 };
  for (const i of items) {
    if (i.favorite) s.favorites++;
    const count = i.book.pageCount ?? DEFAULT_PAGE_COUNT;
    if (i.status === 'READ') {
      s.readTotal++;
      const finished = i.finishedAt ?? i.updatedAt;
      if (new Date(finished).getFullYear() === year) {
        readThisYear++;
        pages += count;
      }
    } else if (i.status === 'READING') {
      s.reading++;
      pages += Math.round(count * (i.progress ?? 0));
    } else if (i.status === 'WANT_TO_READ') {
      s.wantToRead++;
    }
  }
  return { ...s, readThisYear, pagesReadEstimate: pages };
}
