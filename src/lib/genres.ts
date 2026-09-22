export type Genre = {
  slug: string;
  label: string;
  /** Google Books `subject:` value (BISAC top level). */
  google: string;
  /** Open Library `subject:` value. */
  openLibrary: string;
  blurb: string;
  /** Cloth-binding color used for the genre tile and placeholder covers. */
  cloth: string;
  /** Words that map a free-text category onto this genre. */
  match: RegExp;
};

export const GENRES: Genre[] = [
  {
    slug: 'fiction',
    label: 'Fiction',
    google: 'Fiction',
    openLibrary: 'fiction',
    blurb: 'Novels and stories, from literary to page-turning.',
    cloth: '#35524A',
    match: /\b(fiction|novel|literary)\b/i,
  },
  {
    slug: 'science-fiction',
    label: 'Science fiction',
    google: 'Fiction / Science Fiction',
    openLibrary: 'science_fiction',
    blurb: 'Other worlds, near futures and big ideas.',
    cloth: '#2E4A62',
    match: /\b(science fiction|sci-fi|dystopia|space opera|cyberpunk)\b/i,
  },
  {
    slug: 'fantasy',
    label: 'Fantasy',
    google: 'Fiction / Fantasy',
    openLibrary: 'fantasy',
    blurb: 'Magic, myth and invented realms.',
    cloth: '#4F3F63',
    match: /\b(fantasy|magic|dragons?|wizards?)\b/i,
  },
  {
    slug: 'mystery',
    label: 'Mystery',
    google: 'Fiction / Mystery & Detective',
    openLibrary: 'mystery_and_detective_stories',
    blurb: 'Detectives, puzzles and slow-burning suspense.',
    cloth: '#3A3F4B',
    match: /\b(mystery|detective|crime|thriller|suspense)\b/i,
  },
  {
    slug: 'romance',
    label: 'Romance',
    google: 'Fiction / Romance',
    openLibrary: 'romance',
    blurb: 'Love stories across every era.',
    cloth: '#7A3E48',
    match: /\b(romance|love stories)\b/i,
  },
  {
    slug: 'biography',
    label: 'Biography',
    google: 'Biography & Autobiography',
    openLibrary: 'biography',
    blurb: 'Lives told by others and in their own words.',
    cloth: '#6B5237',
    match: /\b(biograph|autobiograph|memoir)/i,
  },
  {
    slug: 'history',
    label: 'History',
    google: 'History',
    openLibrary: 'history',
    blurb: 'Empires, revolutions and ordinary lives.',
    cloth: '#5C4A2E',
    match: /\bhistor/i,
  },
  {
    slug: 'poetry',
    label: 'Poetry',
    google: 'Poetry',
    openLibrary: 'poetry',
    blurb: 'Verse old and new.',
    cloth: '#445C3C',
    match: /\b(poetry|poems|verse)\b/i,
  },
  {
    slug: 'childrens',
    label: 'Children’s',
    google: 'Juvenile Fiction',
    openLibrary: 'juvenile_fiction',
    blurb: 'Picture books, early readers and family read-alouds.',
    cloth: '#2F5D62',
    match: /\b(juvenile|children|kids|picture books?)\b/i,
  },
  {
    slug: 'young-adult',
    label: 'Young adult',
    google: 'Young Adult Fiction',
    openLibrary: 'young_adult_fiction',
    blurb: 'Coming-of-age stories for teen readers.',
    cloth: '#584A6E',
    match: /\b(young adult|teen)\b/i,
  },
  {
    slug: 'science',
    label: 'Science',
    google: 'Science',
    openLibrary: 'science',
    blurb: 'How the universe, life and matter work.',
    cloth: '#2B5448',
    match: /\b(science|physics|biology|chemistry|astronomy)\b/i,
  },
  {
    slug: 'philosophy',
    label: 'Philosophy',
    google: 'Philosophy',
    openLibrary: 'philosophy',
    blurb: 'Ethics, knowledge and the examined life.',
    cloth: '#4A4436',
    match: /\b(philosoph|ethics|stoic)/i,
  },
  {
    slug: 'self-help',
    label: 'Self-help',
    google: 'Self-Help',
    openLibrary: 'self-help',
    blurb: 'Habits, wellbeing and practical guidance.',
    cloth: '#6A5A30',
    match: /\b(self-help|self help|personal growth|motivation)\b/i,
  },
  {
    slug: 'cooking',
    label: 'Cooking',
    google: 'Cooking',
    openLibrary: 'cooking',
    blurb: 'Recipes, food writing and kitchen craft.',
    cloth: '#7A4B2A',
    match: /\b(cook|recipes?|food)\b/i,
  },
  {
    slug: 'art',
    label: 'Art',
    google: 'Art',
    openLibrary: 'art',
    blurb: 'Painting, design, photography and architecture.',
    cloth: '#5B3F4E',
    match: /\b(art|painting|design|photograph|architecture)\b/i,
  },
  {
    slug: 'business',
    label: 'Business',
    google: 'Business & Economics',
    openLibrary: 'business',
    blurb: 'Work, money, markets and management.',
    cloth: '#34495E',
    match: /\b(business|economics|management|finance)\b/i,
  },
];

const BY_SLUG = new Map(GENRES.map((g) => [g.slug, g]));

export function getGenre(slug: string | undefined | null): Genre | undefined {
  return slug ? BY_SLUG.get(slug) : undefined;
}

/** Map free-text categories from any source onto our taxonomy (most specific genre first). */
export function genreForCategories(categories: string[]): Genre | undefined {
  const text = categories.join(' | ');
  const specific = GENRES.filter((g) => g.slug !== 'fiction');
  return specific.find((g) => g.match.test(text)) ?? (GENRES[0].match.test(text) ? GENRES[0] : undefined);
}
