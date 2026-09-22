import type { Metadata } from 'next';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { Expandable } from '@/components/books/Expandable';
import { ResultsBlock } from '@/components/search/ResultsBlock';
import { buttonClasses } from '@/components/ui/button';
import { CatalogNote, ResultsSkeleton, Skeleton } from '@/components/ui/states';
import { getAuthor, getAuthorWorks } from '@/lib/books';
import { buildSearchQuery, parseSearchParams, type ParsedSearchParams } from '@/lib/books/filters';
import { metaDescription } from '@/lib/seo';

type Props = {
  params: Promise<{ name: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function decodeName(raw: string): string | null {
  let name: string;
  try {
    name = decodeURIComponent(raw);
  } catch {
    return null;
  }
  name = name.replace(/\s+/g, ' ').trim();
  if (!name || name.length > 120 || !/[\p{L}]/u.test(name)) return null;
  return name;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const name = decodeName((await params).name);
  if (!name) return { title: 'Author not found', robots: { index: false } };
  const author = await getAuthor(name);
  return {
    title: `Books by ${author?.name ?? name}`,
    description: metaDescription(author?.bio, `Books by ${author?.name ?? name} in the catalog, with editions and free reads where available.`),
    alternates: { canonical: `/authors/${encodeURIComponent(name)}` },
  };
}

export default async function AuthorPage({ params, searchParams }: Props) {
  const name = decodeName((await params).name);
  if (!name) notFound();
  const p = parseSearchParams(await searchParams);
  const basePath = `/authors/${encodeURIComponent(name)}`;

  return (
    <div className="mx-auto max-w-[1200px] px-4 pt-8 sm:px-6 sm:pt-12">
      <Suspense fallback={<BioSkeleton name={name} />}>
        <Bio name={name} />
      </Suspense>
      <section aria-labelledby="works-heading" className="mt-12 max-w-4xl">
        <h2 id="works-heading" className="text-h3 font-semibold">
          Books
        </h2>
        <div className="mt-4">
          <Suspense key={buildSearchQuery(p)} fallback={<ResultsSkeleton />}>
            <Works name={name} params={p} basePath={basePath} />
          </Suspense>
        </div>
      </section>
    </div>
  );
}

async function Bio({ name }: { name: string }) {
  const author = await getAuthor(name);
  const displayName = author?.name ?? name;
  const life = [author?.birthDate, author?.deathDate].filter(Boolean).join(' – ');
  return (
    <header className="flex flex-col gap-6 sm:flex-row sm:items-start">
      {author?.photoUrl && (
        <div className="relative size-28 shrink-0 overflow-hidden rounded-full border border-rule bg-paper-sunk sm:size-32">
          <Image src={author.photoUrl} alt={`Photo of ${displayName}`} fill sizes="128px" className="object-cover" />
        </div>
      )}
      <div className="min-w-0 max-w-3xl">
        <h1 className="text-h1 font-semibold break-words" dir="auto">
          {displayName}
        </h1>
        {life && <p className="mt-1 text-ui text-ink-muted">{life}</p>}
        {author?.bio && <Expandable paragraphs={author.bio.split(/\n{2,}/)} lines={5} className="mt-4" />}
        {author?.link && (
          <a href={author.link} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block text-ui text-forest">
            More on Open Library<span className="sr-only"> (opens in a new tab)</span>
          </a>
        )}
      </div>
    </header>
  );
}

function BioSkeleton({ name }: { name: string }) {
  return (
    <header aria-busy="true">
      <h1 className="text-h1 font-semibold" dir="auto">
        {name}
      </h1>
      <Skeleton className="mt-4 h-4 w-full max-w-xl" />
      <Skeleton className="mt-2 h-4 w-2/3 max-w-md" />
    </header>
  );
}

async function Works({ name, params, basePath }: { name: string; params: ParsedSearchParams; basePath: string }) {
  let result;
  try {
    result = await getAuthorWorks(name, params.page, params.sort);
  } catch {
    return (
      <CatalogNote
        tone="error"
        title="Books by this author didn’t load"
        actions={
          <a href={basePath} className={buttonClasses('primary', 'md')}>
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
      params={params}
      result={result}
      basePath={basePath}
      extra={{ author: name }}
      emptyTitle={`We couldn’t find books by ${name}`}
      emptyBody="Check the spelling of the name, or search for the title instead."
    />
  );
}
