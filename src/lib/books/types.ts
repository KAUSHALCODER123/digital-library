export type BookSource = 'google' | 'openlibrary' | 'gutenberg';

export type ContributorRole = 'author' | 'translator' | 'illustrator' | 'editor' | 'narrator';

export type Contributor = { name: string; role: ContributorRole };

/**
 * How a book can be opened in the in-app reader. Only produced by `access.ts`,
 * which enforces the copyright rules: full text only when the source says so.
 */
export type ReaderSource =
  | { kind: 'ia'; identifier: string }
  | { kind: 'gutenberg'; gutenbergId: number; textUrl: string }
  | { kind: 'google'; volumeId: string; full: boolean };

export type BookSummary = {
  /** Internal composite id: `google:<volumeId>`, `ol:<OLID>` or `gutenberg:<n>`. */
  id: string;
  source: BookSource;
  isbn13?: string;
  isbn10?: string;
  /** Every ISBN-13 known for this work (Open Library aggregates editions); used for dedupe only. */
  allIsbns?: string[];
  title: string;
  subtitle?: string;
  authors: string[];
  contributors: Contributor[];
  description?: string;
  coverUrl?: string;
  categories: string[];
  publishedYear?: number;
  publisher?: string;
  pageCount?: number;
  averageRating?: number;
  ratingsCount?: number;
  language?: string;
  /** Embeddable reader for a partial preview (Google's own viewer). */
  previewUrl?: string;
  /** True only if the whole book is legally readable in the app. */
  readableFullText: boolean;
  reader?: ReaderSource;
  mature: boolean;
  /** Canonical "view on X" fallback. */
  externalLink: string;
};

export type BookDetail = BookSummary & {
  workKey?: string;
  editionCount?: number;
  /** Open Library `ebook_access` value, kept for the "borrow" link. */
  olEbookAccess?: 'public' | 'borrowable' | 'printdisabled' | 'no_ebook';
  iaIdentifiers?: string[];
  subjects: string[];
};

export type Edition = {
  key: string;
  title: string;
  publisher?: string;
  publishedYear?: number;
  isbn13?: string;
  language?: string;
  coverUrl?: string;
  pageCount?: number;
  link: string;
};

export type AuthorProfile = {
  name: string;
  key?: string;
  bio?: string;
  birthDate?: string;
  deathDate?: string;
  photoUrl?: string;
  link?: string;
};

export type SortOrder = 'relevance' | 'newest' | 'rating' | 'title';

export type SearchFilters = {
  language?: string;
  yearFrom?: number;
  yearTo?: number;
  readable?: boolean;
  genre?: string;
  minRating?: number;
};

export type SearchParams = SearchFilters & {
  q: string;
  /** Restrict to an author (used by author pages). */
  author?: string;
  page: number;
  sort: SortOrder;
};

export type SourceStatus = { source: BookSource; ok: boolean; reason?: string };

export type SearchResult = {
  items: BookSummary[];
  /** Best estimate of total matches across sources. */
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
  sources: SourceStatus[];
};

export type ShelfRowKey = 'new-arrivals' | 'trending' | 'classics' | 'staff-picks';
