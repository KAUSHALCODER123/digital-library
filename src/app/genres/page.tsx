import type { Metadata } from 'next';
import Link from 'next/link';
import { GENRES } from '@/lib/genres';

export const metadata: Metadata = {
  title: 'Browse by genre',
  description: 'Browse the catalog by genre: fiction, science fiction, mystery, biography, poetry, history and more.',
  alternates: { canonical: '/genres' },
};

export default function GenresPage() {
  return (
    <div className="mx-auto max-w-[1200px] px-4 pt-8 sm:px-6 sm:pt-12">
      <h1 className="text-h2 font-semibold">Browse by genre</h1>
      <p className="mt-2 max-w-[60ch] text-lead text-ink-muted">Pick a shelf and wander.</p>
      <ul className="mt-10 grid gap-x-8 sm:grid-cols-2 lg:grid-cols-3">
        {GENRES.map((g) => (
          <li key={g.slug}>
            <Link href={`/genres/${g.slug}`} className="group flex gap-4 border-b border-rule py-5 no-underline">
              <span
                aria-hidden
                className="w-3 shrink-0 self-stretch rounded-[1px] shadow-[inset_-2px_0_0_rgb(0_0_0/0.2)]"
                style={{ backgroundColor: g.cloth }}
              />
              <span>
                <span className="block font-display text-[1.3rem] leading-tight font-semibold text-ink group-hover:underline">{g.label}</span>
                <span className="mt-1 block text-ui text-ink-muted">{g.blurb}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
