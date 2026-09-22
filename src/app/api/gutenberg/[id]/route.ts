import { NextResponse, type NextRequest } from 'next/server';
import { isMock } from '@/lib/books';
import { fixtureGutenbergText } from '@/lib/books/fixtures';
import { gutenbergBook } from '@/lib/books/gutendex';
import { fetchText, UpstreamError } from '@/lib/books/http';
import { MAX_TEXT_CHARS, parseGutenbergText } from '@/lib/books/gutenbergText';

/**
 * Serves a public-domain Project Gutenberg text as reader blocks. The copyright flag is checked
 * server-side on every request, so this route can't be used to fetch anything that isn't
 * public domain. Responses are cached at the edge for a week.
 */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id: raw } = await ctx.params;
  if (!/^\d{1,7}$/.test(raw)) return NextResponse.json({ error: 'not-found' }, { status: 404 });
  const id = Number(raw);

  try {
    let text: string;
    if (isMock()) {
      if (id !== 84) return NextResponse.json({ error: 'not-found' }, { status: 404 });
      text = fixtureGutenbergText();
    } else {
      const book = await gutenbergBook(id);
      if (!book?.readableFullText || book.reader?.kind !== 'gutenberg') {
        return NextResponse.json({ error: 'not-available' }, { status: 404 });
      }
      // Large texts exceed the data cache's item limit; the CDN caches the response instead.
      text = await fetchText(book.reader.textUrl, { timeoutMs: 15000, revalidate: 0 });
    }
    const blocks = parseGutenbergText(text.slice(0, MAX_TEXT_CHARS * 1.1));
    if (!blocks.length) return NextResponse.json({ error: 'empty' }, { status: 502 });
    return NextResponse.json(
      { id, blocks, source: `https://www.gutenberg.org/ebooks/${id}` },
      { headers: { 'Cache-Control': 'public, max-age=3600, s-maxage=604800, stale-while-revalidate=2592000' } },
    );
  } catch (err) {
    const status = err instanceof UpstreamError && err.kind === 'not-found' ? 404 : 502;
    return NextResponse.json({ error: status === 404 ? 'not-found' : 'unavailable' }, { status, headers: { 'Cache-Control': 'no-store' } });
  }
}
