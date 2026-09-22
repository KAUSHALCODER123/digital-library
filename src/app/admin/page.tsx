import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CuratedEditor, type CuratedRow } from '@/components/admin/CuratedEditor';
import { bookHref } from '@/lib/books/slug';
import { curatedBookSchema } from '@/lib/curated';
import { shelfBookSchema } from '@/lib/shelf/types';
import { isSupabaseConfigured } from '@/lib/supabase/env';
import { getCurrentUser } from '@/lib/supabase/server';

// Always per-request: these pages depend on the signed-in reader.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: 'Library staff tools', robots: { index: false } };

export default async function AdminPage() {
  if (!isSupabaseConfigured()) notFound();
  const session = await getCurrentUser();
  if (!session) notFound();
  const { supabase, user } = session;
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
  // Non-staff get a plain 404 rather than confirmation that the page exists.
  if (profile?.role !== 'staff') notFound();

  const [curated, searches, shelved] = await Promise.all([
    supabase.from('curated_items').select('id, shelf, book, position').order('position'),
    supabase.rpc('top_searches', { p_days: 30, p_limit: 20 }),
    supabase.rpc('most_shelved', { p_days: 30, p_limit: 20 }),
  ]);

  const rows = (curated.data ?? []).flatMap((r): CuratedRow[] => {
    const b = curatedBookSchema.safeParse(r.book);
    return b.success ? [{ id: r.id, shelf: r.shelf, position: r.position, book: b.data }] : [];
  });

  return (
    <div className="mx-auto max-w-[1200px] px-4 pt-8 sm:px-6 sm:pt-12">
      <h1 className="text-h2 font-semibold">Library staff tools</h1>
      <p className="mt-2 max-w-[62ch] text-ui text-ink-muted">
        Pin books to the home page shelves. A shelf needs at least four books to replace the automatic selection.
      </p>

      <div className="mt-10 grid gap-12 lg:grid-cols-2">
        <CuratedEditor shelf="staff_picks" title="Staff picks" rows={rows.filter((r) => r.shelf === 'staff_picks')} />
        <CuratedEditor shelf="new_arrivals" title="New arrivals" rows={rows.filter((r) => r.shelf === 'new_arrivals')} />
      </div>

      <div className="mt-16 grid gap-12 lg:grid-cols-2">
        <section aria-labelledby="searches-heading">
          <h2 id="searches-heading" className="text-h3 font-semibold">
            Top searches, last 30 days
          </h2>
          {searches.error ? (
            <p className="mt-4 text-ui text-danger">Search statistics couldn’t be loaded.</p>
          ) : !searches.data?.length ? (
            <p className="mt-4 text-ui text-ink-muted">No searches recorded yet.</p>
          ) : (
            <table className="mt-4 w-full text-left text-ui">
              <thead>
                <tr className="border-b border-rule-strong text-caption text-ink-muted">
                  <th scope="col" className="py-2 font-semibold">Search</th>
                  <th scope="col" className="py-2 text-right font-semibold">Times</th>
                </tr>
              </thead>
              <tbody>
                {searches.data.map((s) => (
                  <tr key={s.term} className="border-b border-rule">
                    <td className="py-2">
                      <Link href={`/search?q=${encodeURIComponent(s.term)}`} className="text-ink">
                        {s.term}
                      </Link>
                    </td>
                    <td className="py-2 text-right tabular-nums">{Number(s.searches).toLocaleString('en')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section aria-labelledby="shelved-heading">
          <h2 id="shelved-heading" className="text-h3 font-semibold">
            Most shelved, last 30 days
          </h2>
          {shelved.error ? (
            <p className="mt-4 text-ui text-danger">Shelf statistics couldn’t be loaded.</p>
          ) : !shelved.data?.length ? (
            <p className="mt-4 text-ui text-ink-muted">No books shelved yet.</p>
          ) : (
            <table className="mt-4 w-full text-left text-ui">
              <thead>
                <tr className="border-b border-rule-strong text-caption text-ink-muted">
                  <th scope="col" className="py-2 font-semibold">Book</th>
                  <th scope="col" className="py-2 text-right font-semibold">Readers</th>
                </tr>
              </thead>
              <tbody>
                {shelved.data.map((s) => {
                  const b = shelfBookSchema.safeParse(s.book);
                  return (
                    <tr key={s.book_id} className="border-b border-rule">
                      <td className="py-2">
                        {b.success ? (
                          <Link href={bookHref(b.data)} className="text-ink">
                            {b.data.title}
                          </Link>
                        ) : (
                          s.book_id
                        )}
                      </td>
                      <td className="py-2 text-right tabular-nums">{Number(s.shelvings).toLocaleString('en')}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </div>
  );
}
