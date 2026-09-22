import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { FilterPanel } from '@/components/search/FilterPanel';
import { ResultsBlock } from '@/components/search/ResultsBlock';
import { buttonClasses } from '@/components/ui/button';
import { CatalogNote, ResultsSkeleton } from '@/components/ui/states';
import { searchBooks } from '@/lib/books';
import { buildSearchQuery, parseSearchParams, toSearchParams, type SearchPageParams } from '@/lib/books/filters';
import { GENRES, getGenre, type Genre } from '@/lib/genres';

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export function generateStaticParams() {
  return GENRES.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const genre = getGenre((await params).slug);
  if (!genre) return { title: 'Genre not found', robots: { index: false } };
  return {
    title: `${genre.label} books`,
    description: `${genre.blurb} Browse ${genre.label.toLowerCase()} in the catalog, and read public-domain titles free.`,
    alternates: { canonical: `/genres/${genre.slug}` },
  };
}

export default async function GenrePage({ params, searchParams }: Props) {
  const genre = getGenre((await params).slug);
  if (!genre) notFound();
  // The genre comes from the path; any genre in the query string is ignored.
  const p = { ...parseSearchParams(await searchParams), genre: genre.slug };
  const basePath = `/genres/${genre.slug}`;

  return (
    <div className="mx-auto max-w-[1200px] px-4 pt-8 sm:px-6 sm:pt-12">
      <div className="flex items-stretch gap-4">
        <span aria-hidden className="w-2.5 shrink-0 rounded-[1px]" style={{ backgroundColor: genre.cloth }} />
        <div>
          <p className="text-ui text-ink-muted">
            <Link href="/genres" className="text-ink-muted">
              Genres
            </Link>
          </p>
          <h1 className="mt-1 text-h2 font-semibold">{genre.label}</h1>
          <p className="mt-2 max-w-[60ch] text-lead text-ink-muted">{genre.blurb}</p>
        </div>
      </div>
      <div className="mt-10 grid gap-10 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-14">
        <FilterPanel params={p} lockedGenre={genre.slug} basePath={basePath} />
        <div className="min-w-0">
          <Suspense key={buildSearchQuery(p)} fallback={<ResultsSkeleton />}>
            <GenreResults genre={genre} params={p} basePath={basePath} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}

async function GenreResults({ genre, params, basePath }: { genre: Genre; params: SearchPageParams; basePath: string }) {
  let result;
  try {
    result = await searchBooks({ ...toSearchParams(params), q: params.q });
  } catch {
    return (
      <CatalogNote
        tone="error"
        title="This shelf didn’t load"
        actions={
          <a href={`${basePath}?${buildSearchQuery({ ...params, genre: undefined })}`} className={buttonClasses('primary', 'md')}>
            Try again
          </a>
        }
      >
        The book services didn’t respond. Wait a moment, then try again.
      </CatalogNote>
    );
  }
  return (
    <ResultsBlock
      params={{ ...params, genre: undefined }}
      result={result}
      basePath={basePath}
      extra={{ genre: genre.slug }}
      emptyTitle="No books match these filters"
      emptyBody={`Try removing a filter to see more ${genre.label.toLowerCase()} books.`}
    />
  );
}
