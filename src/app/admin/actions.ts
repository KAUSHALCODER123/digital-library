'use server';

import { revalidatePath, updateTag } from 'next/cache';
import { z } from 'zod';
import { CURATED_TAG, curatedBookSchema } from '@/lib/curated';
import type { Json } from '@/lib/supabase/types';
import { getCurrentUser } from '@/lib/supabase/server';

type Result = { ok: true } | { ok: false; error: string };

const shelfSchema = z.enum(['staff_picks', 'new_arrivals']);

/** Every action re-checks the role server-side; RLS enforces it again in the database. */
async function requireStaff() {
  const session = await getCurrentUser();
  if (!session) return null;
  const { data } = await session.supabase.from('profiles').select('role').eq('id', session.user.id).maybeSingle();
  return data?.role === 'staff' ? session : null;
}

function refresh() {
  updateTag(CURATED_TAG);
  revalidatePath('/');
}

export async function pinBook(shelf: unknown, book: unknown): Promise<Result> {
  const session = await requireStaff();
  if (!session) return { ok: false, error: 'Only library staff can change curated shelves.' };
  const s = shelfSchema.safeParse(shelf);
  const b = curatedBookSchema.safeParse(book);
  if (!s.success || !b.success) return { ok: false, error: 'That book couldn’t be added.' };

  const { data: last } = await session.supabase
    .from('curated_items')
    .select('position')
    .eq('shelf', s.data)
    .order('position', { ascending: false })
    .limit(1)
    .maybeSingle();
  const { error } = await session.supabase.from('curated_items').upsert(
    {
      shelf: s.data,
      book_id: b.data.id,
      book: b.data as unknown as Json,
      position: (last?.position ?? -1) + 1,
      pinned_by: session.user.id,
    },
    { onConflict: 'shelf,book_id', ignoreDuplicates: true },
  );
  if (error) return { ok: false, error: 'That book couldn’t be added. Try again.' };
  refresh();
  return { ok: true };
}

export async function unpinBook(id: unknown): Promise<Result> {
  const session = await requireStaff();
  if (!session) return { ok: false, error: 'Only library staff can change curated shelves.' };
  const parsed = z.string().uuid().safeParse(id);
  if (!parsed.success) return { ok: false, error: 'That book couldn’t be removed.' };
  const { error } = await session.supabase.from('curated_items').delete().eq('id', parsed.data);
  if (error) return { ok: false, error: 'That book couldn’t be removed. Try again.' };
  refresh();
  return { ok: true };
}

/** Saves a new order for a shelf: `ids` in display order. */
export async function reorderShelf(shelf: unknown, ids: unknown): Promise<Result> {
  const session = await requireStaff();
  if (!session) return { ok: false, error: 'Only library staff can change curated shelves.' };
  const s = shelfSchema.safeParse(shelf);
  const list = z.array(z.string().uuid()).max(100).safeParse(ids);
  if (!s.success || !list.success) return { ok: false, error: 'The new order couldn’t be saved.' };
  const results = await Promise.all(
    list.data.map((id, position) =>
      session.supabase.from('curated_items').update({ position }).eq('id', id).eq('shelf', s.data),
    ),
  );
  if (results.some((r) => r.error)) return { ok: false, error: 'The new order couldn’t be saved. Try again.' };
  refresh();
  return { ok: true };
}
