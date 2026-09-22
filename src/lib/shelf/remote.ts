import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Json, ShelfStatusDb } from '@/lib/supabase/types';
import { clampProgress, shelfBookSchema, type ReadingStatus, type ShelfItem } from './types';

type Row = Database['public']['Tables']['shelf_items']['Row'];
type Insert = Database['public']['Tables']['shelf_items']['Insert'];

const READING: ReadingStatus[] = ['WANT_TO_READ', 'READING', 'READ'];

/** Collapse one-row-per-status storage back into one item per book. Invalid rows are skipped. */
export function foldRows(rows: Row[]): ShelfItem[] {
  const byBook = new Map<string, Row[]>();
  for (const r of rows) byBook.set(r.book_id, [...(byBook.get(r.book_id) ?? []), r]);
  const items: ShelfItem[] = [];
  for (const [bookId, group] of byBook) {
    const statusRows = group
      .filter((r) => r.status !== 'FAVORITE')
      .sort((a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at));
    const fav = group.find((r) => r.status === 'FAVORITE');
    const primary = statusRows[0] ?? fav;
    if (!primary) continue;
    const book = shelfBookSchema.safeParse(primary.book);
    if (!book.success || book.data.id !== bookId) continue;
    const status = (statusRows[0]?.status as ReadingStatus | undefined) ?? null;
    items.push({
      bookId,
      book: book.data,
      status,
      favorite: !!fav,
      progress: status === 'READ' ? 1 : status === 'READING' ? clampProgress(statusRows[0].progress) ?? 0 : null,
      addedAt: group.reduce((m, r) => (Date.parse(r.added_at) < Date.parse(m) ? r.added_at : m), primary.added_at),
      updatedAt: group.reduce((m, r) => (Date.parse(r.updated_at) > Date.parse(m) ? r.updated_at : m), primary.updated_at),
      finishedAt: status === 'READ' ? statusRows[0].added_at : null,
    });
  }
  return items.sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
}

/** The rows that should exist for an item. */
export function rowsFor(userId: string, item: ShelfItem): Insert[] {
  const rows: Insert[] = [];
  const book = item.book as unknown as Json;
  if (item.status) {
    rows.push({
      user_id: userId,
      book_id: item.bookId,
      status: item.status,
      progress: item.status === 'READ' ? 1 : item.status === 'READING' ? item.progress ?? 0 : null,
      book,
      // The READ row's timestamp records when the book was finished.
      added_at: item.status === 'READ' ? item.finishedAt ?? item.updatedAt : item.addedAt,
    });
  }
  if (item.favorite) rows.push({ user_id: userId, book_id: item.bookId, status: 'FAVORITE', progress: null, book, added_at: item.addedAt });
  return rows;
}

export async function fetchRemoteShelf(supabase: SupabaseClient<Database>, userId: string): Promise<ShelfItem[]> {
  const { data, error } = await supabase
    .from('shelf_items')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(5000);
  if (error) throw error;
  return foldRows(data ?? []);
}

/** Write items idempotently: upsert the rows that should exist, delete the ones that shouldn't. */
export async function saveItems(supabase: SupabaseClient<Database>, userId: string, items: ShelfItem[]): Promise<void> {
  if (!items.length) return;
  const upserts = items.flatMap((i) => rowsFor(userId, i));
  if (upserts.length) {
    for (let i = 0; i < upserts.length; i += 500) {
      const { error } = await supabase
        .from('shelf_items')
        .upsert(upserts.slice(i, i + 500), { onConflict: 'user_id,book_id,status' });
      if (error) throw error;
    }
  }
  // Remove statuses each book no longer has (e.g. moved from "Want to read" to "Reading").
  for (const item of items) {
    const keep = new Set<ShelfStatusDb>([...(item.status ? [item.status] : []), ...(item.favorite ? ['FAVORITE' as const] : [])]);
    const drop = [...READING, 'FAVORITE' as const].filter((s) => !keep.has(s));
    if (!drop.length) continue;
    const { error } = await supabase
      .from('shelf_items')
      .delete()
      .eq('user_id', userId)
      .eq('book_id', item.bookId)
      .in('status', drop);
    if (error) throw error;
  }
}

export async function removeBook(supabase: SupabaseClient<Database>, userId: string, bookId: string): Promise<void> {
  const { error } = await supabase.from('shelf_items').delete().eq('user_id', userId).eq('book_id', bookId);
  if (error) throw error;
}
