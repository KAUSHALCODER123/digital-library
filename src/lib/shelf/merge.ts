import type { ShelfItem } from './types';

const later = (a: string, b: string) => (Date.parse(a) >= Date.parse(b) ? a : b);
const earlier = (a: string, b: string) => (Date.parse(a) <= Date.parse(b) ? a : b);

/**
 * Merge a guest's local shelf into their account shelf.
 * - union by book; nothing is ever dropped
 * - conflicting reading status: the most recently updated side wins (last write wins)
 * - favorite is kept if either side has it; progress keeps the furthest point
 */
export function mergeShelves(local: ShelfItem[], remote: ShelfItem[]): { items: ShelfItem[]; addedFromDevice: number } {
  const byId = new Map<string, ShelfItem>();
  for (const r of remote) byId.set(r.bookId, r);
  let addedFromDevice = 0;

  for (const l of local) {
    const r = byId.get(l.bookId);
    if (!r) {
      byId.set(l.bookId, l);
      addedFromDevice++;
      continue;
    }
    const localNewer = Date.parse(l.updatedAt) > Date.parse(r.updatedAt);
    const winner = localNewer ? l : r;
    const status = winner.status ?? (localNewer ? r.status : l.status);
    byId.set(l.bookId, {
      bookId: l.bookId,
      book: winner.book,
      status,
      favorite: l.favorite || r.favorite,
      progress: status === 'READ' ? 1 : maxProgress(l.progress, r.progress),
      addedAt: earlier(l.addedAt, r.addedAt),
      updatedAt: later(l.updatedAt, r.updatedAt),
      finishedAt: status === 'READ' ? (winner.finishedAt ?? l.finishedAt ?? r.finishedAt) : null,
    });
  }

  const items = [...byId.values()].sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
  return { items, addedFromDevice };
}

function maxProgress(a: number | null, b: number | null): number | null {
  if (a === null) return b;
  if (b === null) return a;
  return Math.max(a, b);
}

/** Items whose stored rows differ between two shelves (used to upload only what changed). */
export function changedItems(next: ShelfItem[], prev: ShelfItem[]): ShelfItem[] {
  const prevById = new Map(prev.map((p) => [p.bookId, p]));
  return next.filter((n) => {
    const p = prevById.get(n.bookId);
    return !p || p.status !== n.status || p.favorite !== n.favorite || p.progress !== n.progress;
  });
}
