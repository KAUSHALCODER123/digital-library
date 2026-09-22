import { z } from 'zod';
import { isValidBookId } from '@/lib/books/slug';
import type { BookSummary } from '@/lib/books/types';

export type ReadingStatus = 'WANT_TO_READ' | 'READING' | 'READ';

export const READING_STATUSES: Array<{ value: ReadingStatus; label: string; short: string }> = [
  { value: 'WANT_TO_READ', label: 'Want to read', short: 'Want to read' },
  { value: 'READING', label: 'Currently reading', short: 'Reading' },
  { value: 'READ', label: 'Read', short: 'Read' },
];

export const shelfBookSchema = z.object({
  id: z.string().refine(isValidBookId),
  title: z.string().min(1).max(300),
  authors: z.array(z.string().max(120)).max(5),
  coverUrl: z.string().url().startsWith('https://').max(500).optional(),
  pageCount: z.number().int().positive().max(20000).optional(),
  mature: z.boolean().optional(),
});

/** The small snapshot stored with a shelf entry so the shelf renders without calling book APIs. */
export type ShelfBook = z.infer<typeof shelfBookSchema>;

export type ShelfItem = {
  bookId: string;
  book: ShelfBook;
  status: ReadingStatus | null;
  favorite: boolean;
  /** 0..1, only meaningful while reading. */
  progress: number | null;
  addedAt: string;
  updatedAt: string;
  finishedAt: string | null;
};

export function toShelfBook(b: Pick<BookSummary, 'id' | 'title' | 'authors' | 'coverUrl' | 'pageCount' | 'mature'>): ShelfBook {
  return {
    id: b.id,
    title: b.title.slice(0, 300),
    authors: b.authors.slice(0, 5).map((a) => a.slice(0, 120)),
    coverUrl: b.coverUrl && b.coverUrl.length <= 500 && b.coverUrl.startsWith('https://') ? b.coverUrl : undefined,
    pageCount: b.pageCount && b.pageCount <= 20000 ? b.pageCount : undefined,
    mature: b.mature || undefined,
  };
}

export function clampProgress(p: number | null | undefined): number | null {
  if (p === null || p === undefined || !Number.isFinite(p)) return null;
  return Math.min(1, Math.max(0, Math.round(p * 1000) / 1000));
}
