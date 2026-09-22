import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { isMock } from '@/lib/books';
import { isValidBookId } from '@/lib/books/slug';
import type { BookSummary } from '@/lib/books/types';
import { getSupabaseEnv } from '@/lib/supabase/env';
import type { Database } from '@/lib/supabase/types';

export const CURATED_TAG = 'curated';
export type CuratedShelf = 'staff_picks' | 'new_arrivals';

/** What staff pin: enough to render a cover card without calling the book APIs. */
export const curatedBookSchema = z.object({
  id: z.string().refine(isValidBookId),
  title: z.string().min(1).max(300),
  authors: z.array(z.string().max(120)).max(5).default([]),
  coverUrl: z.string().url().startsWith('https://').max(500).optional(),
  categories: z.array(z.string().max(60)).max(6).default([]),
  publishedYear: z.number().int().optional(),
  language: z.string().max(8).optional(),
  readableFullText: z.boolean().default(false),
  mature: z.boolean().default(false),
});
export type CuratedBook = z.infer<typeof curatedBookSchema>;

export function toCuratedBook(b: BookSummary): CuratedBook {
  return curatedBookSchema.parse({
    id: b.id,
    title: b.title.slice(0, 300),
    authors: b.authors.slice(0, 5),
    coverUrl: b.coverUrl && b.coverUrl.length <= 500 ? b.coverUrl : undefined,
    categories: b.categories.slice(0, 6).map((c) => c.slice(0, 60)),
    publishedYear: b.publishedYear,
    language: b.language,
    readableFullText: b.readableFullText,
    mature: b.mature,
  });
}

export function curatedToSummary(c: CuratedBook): BookSummary {
  return {
    ...c,
    source: c.id.startsWith('google') ? 'google' : c.id.startsWith('ol') ? 'openlibrary' : 'gutenberg',
    contributors: c.authors.map((name) => ({ name, role: 'author' as const })),
    externalLink: '',
  };
}

/**
 * Public read with the anon key and no cookies, so pages that show curated shelves stay
 * statically cacheable. Cached for five minutes and revalidated when staff change a shelf.
 */
export async function getCuratedBooks(shelf: CuratedShelf): Promise<BookSummary[]> {
  const env = getSupabaseEnv();
  if (!env || isMock()) return [];
  const supabase = createClient<Database>(env.url, env.key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => fetch(input, { ...init, next: { revalidate: 300, tags: [CURATED_TAG] } }),
    },
  });
  const { data, error } = await supabase
    .from('curated_items')
    .select('book, position, created_at')
    .eq('shelf', shelf)
    .order('position', { ascending: true })
    .order('created_at', { ascending: false })
    .limit(24);
  if (error || !data) return [];
  return data.flatMap((row) => {
    const parsed = curatedBookSchema.safeParse(row.book);
    return parsed.success ? [curatedToSummary(parsed.data)] : [];
  });
}
