import { NextResponse, type NextRequest } from 'next/server';
import { BooksUnavailableError, lookupIsbn, searchBooks } from '@/lib/books';
import { parseSearchParams, toSearchParams } from '@/lib/books/filters';
import { bookHref } from '@/lib/books/slug';
import type { SearchResult } from '@/lib/books/types';

const CACHE = 'public, s-maxage=3600, stale-while-revalidate=86400';

export type SuggestItem = { id: string; href: string; title: string; author?: string; year?: number; coverUrl?: string };

function empty(page = 1): SearchResult {
  return { items: [], total: 0, page, pageSize: 20, hasMore: false, sources: [] };
}

export async function GET(request: NextRequest) {
  const raw = Object.fromEntries(request.nextUrl.searchParams.entries());
  const params = parseSearchParams(raw);
  const suggest = request.nextUrl.searchParams.get('suggest') === '1';
  // Author pages page through an author's works.
  const author = request.nextUrl.searchParams.get('author')?.trim().slice(0, 120) || undefined;

  if (params.query.kind === 'invalid' || (params.query.kind === 'empty' && !params.genre && !author)) {
    return NextResponse.json(suggest ? { items: [] } : empty(params.page), { headers: { 'Cache-Control': CACHE } });
  }

  try {
    const result =
      params.query.kind === 'isbn'
        ? { ...empty(1), items: await lookupIsbn(params.query.isbn13) }
        : await searchBooks({ ...toSearchParams(params), author });
    if (suggest) {
      const items: SuggestItem[] = result.items.slice(0, 6).map((b) => ({
        id: b.id,
        href: bookHref(b),
        title: b.title,
        author: b.authors[0],
        year: b.publishedYear,
        coverUrl: b.mature ? undefined : b.coverUrl,
      }));
      return NextResponse.json({ items }, { headers: { 'Cache-Control': CACHE } });
    }
    return NextResponse.json(result, { headers: { 'Cache-Control': CACHE } });
  } catch (err) {
    const status = err instanceof BooksUnavailableError ? 503 : 500;
    if (status === 500) console.error('[api/search]', err);
    return NextResponse.json(
      { error: 'unavailable', message: 'The catalog could not be reached. Try again in a moment.' },
      { status, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
