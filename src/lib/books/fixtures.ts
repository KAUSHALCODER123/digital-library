import { googleEmbedUrl } from './access';
import type { AuthorProfile, BookDetail, Edition } from './types';

/**
 * Offline catalog used when BOOKS_MOCK=1 (Playwright) so tests are deterministic.
 * Each entry exercises an edge case: RTL/CJK titles, mature content, missing metadata,
 * multiple contributor roles, every reader strategy, very long titles.
 */

const base = {
  contributors: [],
  categories: [],
  subjects: [],
  readableFullText: false,
  mature: false,
} satisfies Partial<BookDetail>;

export const FIXTURE_BOOKS: BookDetail[] = [
  {
    ...base,
    id: 'google:mockHobbit01',
    source: 'google',
    isbn13: '9780547928227',
    allIsbns: ['9780547928227'],
    title: 'The Hobbit',
    subtitle: 'Or There and Back Again',
    authors: ['J. R. R. Tolkien'],
    contributors: [{ name: 'J. R. R. Tolkien', role: 'author' }],
    description:
      'In a hole in the ground there lived a hobbit. Bilbo Baggins is a comfortable, unambitious hobbit who rarely travels further than his pantry. His contentment is disturbed when the wizard Gandalf and a company of thirteen dwarves arrive on his doorstep one day to whisk him away on an adventure.\n\nThey have launched a plot to raid the treasure hoard of Smaug the Magnificent, a large and very dangerous dragon. Bilbo reluctantly joins their quest, unaware that on his journey to the Lonely Mountain he will encounter both a magic ring and a frightening creature known as Gollum.\n\nWritten for children, The Hobbit has become one of the most beloved books in the world, a story of courage, friendship and the unexpected bravery that lies inside ordinary people.',
    categories: ['Fiction', 'Fantasy'],
    subjects: ['Fiction', 'Fantasy'],
    publishedYear: 1937,
    publisher: 'Houghton Mifflin Harcourt',
    pageCount: 300,
    averageRating: 4.3,
    ratingsCount: 5120,
    language: 'en',
    reader: { kind: 'google', volumeId: 'mockHobbit01', full: false },
    previewUrl: googleEmbedUrl('mockHobbit01'),
    externalLink: 'https://books.google.com/books?id=mockHobbit01',
    workKey: 'OL262758W',
    editionCount: 3,
  },
  {
    ...base,
    id: 'gutenberg:84',
    source: 'gutenberg',
    title: 'Frankenstein',
    subtitle: 'Or, The Modern Prometheus',
    authors: ['Mary Wollstonecraft Shelley'],
    contributors: [{ name: 'Mary Wollstonecraft Shelley', role: 'author' }],
    description:
      'Victor Frankenstein, a young scientist, creates a sapient creature in an unorthodox experiment, and must live with what he has made.',
    categories: ['Science fiction', 'Horror tales', 'Classics of Literature'],
    subjects: ['Science fiction', 'Horror tales'],
    language: 'en',
    readableFullText: true,
    reader: { kind: 'gutenberg', gutenbergId: 84, textUrl: 'https://www.gutenberg.org/ebooks/84.txt.utf-8' },
    externalLink: 'https://www.gutenberg.org/ebooks/84',
  },
  {
    ...base,
    id: 'ol:OL66554W',
    source: 'openlibrary',
    isbn13: '9780141439518',
    allIsbns: ['9780141439518'],
    title: 'Pride and Prejudice',
    authors: ['Jane Austen'],
    contributors: [{ name: 'Jane Austen', role: 'author' }],
    description: 'Elizabeth Bennet and Mr. Darcy misjudge each other, then slowly learn better.',
    categories: ['Fiction', 'Romance', 'Classics'],
    subjects: ['Fiction', 'Romance', 'Classics'],
    publishedYear: 1813,
    pageCount: 432,
    averageRating: 4.2,
    ratingsCount: 880,
    language: 'en',
    readableFullText: true,
    reader: { kind: 'ia', identifier: 'prideprejudice00austuoft' },
    externalLink: 'https://openlibrary.org/works/OL66554W',
    workKey: 'OL66554W',
    olEbookAccess: 'public',
  },
  {
    ...base,
    id: 'google:mockDune0001',
    source: 'google',
    isbn13: '9780441172719',
    title: 'Dune',
    authors: ['Frank Herbert'],
    contributors: [{ name: 'Frank Herbert', role: 'author' }],
    description: 'On the desert planet Arrakis, a young noble inherits a war over the most valuable substance in the universe.',
    categories: ['Fiction', 'Science fiction'],
    subjects: ['Fiction', 'Science fiction'],
    publishedYear: 1965,
    publisher: 'Ace',
    pageCount: 688,
    averageRating: 4.5,
    ratingsCount: 9100,
    language: 'en',
    externalLink: 'https://books.google.com/books?id=mockDune0001',
  },
  {
    ...base,
    id: 'google:mockPrince01',
    source: 'google',
    isbn13: '9780156012195',
    title: 'The Little Prince',
    authors: ['Antoine de Saint-Exupéry'],
    contributors: [
      { name: 'Antoine de Saint-Exupéry', role: 'author' },
      { name: 'Antoine de Saint-Exupéry', role: 'illustrator' },
      { name: 'Richard Howard', role: 'translator' },
    ],
    description: 'A pilot stranded in the desert meets a small boy who has fallen to Earth from a tiny asteroid.',
    categories: ['Juvenile Fiction', 'Fiction'],
    subjects: ['Juvenile Fiction'],
    publishedYear: 1943,
    pageCount: 96,
    averageRating: 4.6,
    ratingsCount: 2300,
    language: 'en',
    externalLink: 'https://books.google.com/books?id=mockPrince01',
  },
  {
    ...base,
    id: 'ol:OL100001W',
    source: 'openlibrary',
    title: 'كتاب الأغاني',
    authors: ['أبو الفرج الأصفهاني'],
    contributors: [{ name: 'أبو الفرج الأصفهاني', role: 'author' }],
    description: 'موسوعة أدبية وموسيقية من القرن العاشر تجمع الشعر والأخبار.',
    categories: ['Poetry', 'History'],
    subjects: ['Poetry', 'History'],
    publishedYear: 967,
    language: 'ar',
    externalLink: 'https://openlibrary.org/works/OL100001W',
  },
  {
    ...base,
    id: 'google:mockNorway1',
    source: 'google',
    title: 'ノルウェイの森',
    authors: ['村上春樹'],
    contributors: [{ name: '村上春樹', role: 'author' }],
    categories: ['Fiction'],
    subjects: ['Fiction'],
    publishedYear: 1987,
    language: 'ja',
    externalLink: 'https://books.google.com/books?id=mockNorway1',
  },
  {
    ...base,
    id: 'google:mockMature01',
    source: 'google',
    title: 'Midnight Confessions',
    authors: ['Vera Lyons'],
    contributors: [{ name: 'Vera Lyons', role: 'author' }],
    description: 'A novel for adult readers.',
    categories: ['Fiction', 'Romance'],
    subjects: ['Fiction', 'Romance'],
    publishedYear: 2019,
    language: 'en',
    mature: true,
    externalLink: 'https://books.google.com/books?id=mockMature01',
  },
  {
    ...base,
    id: 'ol:OL100002W',
    source: 'openlibrary',
    title:
      'The Remarkably Extensive, Thoroughly Annotated and Occasionally Digressive Chronicle of the Lighthouse Keepers of the Northern Archipelago, Their Families, Their Correspondence and the Weather',
    authors: ['Hollis Wren'],
    contributors: [{ name: 'Hollis Wren', role: 'author' }],
    categories: ['History'],
    subjects: ['History'],
    publishedYear: 2004,
    language: 'en',
    externalLink: 'https://openlibrary.org/works/OL100002W',
  },
  {
    ...base,
    id: 'google:mockBare0001',
    source: 'google',
    title: 'Untitled Pamphlet',
    authors: [],
    externalLink: 'https://books.google.com/books?id=mockBare0001',
  },
  {
    ...base,
    id: 'google:mockFullGB01',
    source: 'google',
    title: 'The Adventures of Sherlock Holmes',
    authors: ['Arthur Conan Doyle'],
    contributors: [{ name: 'Arthur Conan Doyle', role: 'author' }],
    description: 'Twelve stories featuring the consulting detective and his friend Dr. Watson.',
    categories: ['Fiction', 'Mystery & Detective'],
    subjects: ['Mystery & Detective'],
    publishedYear: 1892,
    language: 'en',
    readableFullText: true,
    reader: { kind: 'google', volumeId: 'mockFullGB01', full: true },
    previewUrl: googleEmbedUrl('mockFullGB01'),
    externalLink: 'https://books.google.com/books?id=mockFullGB01',
  },
  // A long run of similar titles so pagination and infinite scroll have something to page through.
  ...Array.from({ length: 45 }, (_, i): BookDetail => ({
    ...base,
    id: `ol:OL2${String(i + 1).padStart(5, '0')}W`,
    source: 'openlibrary',
    title: `Field Notes on Northern Birds, Volume ${i + 1}`,
    authors: ['Ada Marlow'],
    contributors: [{ name: 'Ada Marlow', role: 'author' }],
    description: `Observations from season ${i + 1} of a long survey of coastal and upland birds.`,
    categories: ['Science', 'Nature'],
    subjects: ['Science', 'Nature'],
    publishedYear: 1960 + i,
    pageCount: 120 + i * 3,
    averageRating: [3.1, 3.8, 4.4, 4.9][i % 4],
    ratingsCount: 10 + i,
    language: 'en',
    externalLink: `https://openlibrary.org/works/OL2${String(i + 1).padStart(5, '0')}W`,
  })),
];

export const FIXTURE_EDITIONS: Edition[] = [
  { key: 'OL1M', title: 'The Hobbit', publisher: 'Houghton Mifflin', publishedYear: 2012, isbn13: '9780547928227', language: 'en', pageCount: 300, link: 'https://openlibrary.org/books/OL1M' },
  { key: 'OL2M', title: 'The Hobbit', publisher: 'Allen & Unwin', publishedYear: 1937, language: 'en', link: 'https://openlibrary.org/books/OL2M' },
  { key: 'OL3M', title: 'Le Hobbit', publisher: 'Christian Bourgois', publishedYear: 2012, language: 'fr', link: 'https://openlibrary.org/books/OL3M' },
];

export const FIXTURE_AUTHOR: AuthorProfile = {
  name: 'Ada Marlow',
  key: 'OL999A',
  bio: 'Ada Marlow spent forty years recording birds along the northern coast.',
  birthDate: '1931',
  link: 'https://openlibrary.org/authors/OL999A',
};

/** Public-domain opening (Frankenstein, 1818) padded with generated chapters for pagination tests. */
export function fixtureGutenbergText(): string {
  const opening = `*** START OF THE PROJECT GUTENBERG EBOOK FRANKENSTEIN ***

Letter 1

St. Petersburgh, Dec. 11th, 17—

TO Mrs. Saville, England.

You will rejoice to hear that no disaster has accompanied the
commencement of an enterprise which you have regarded with such evil
forebodings. I arrived here yesterday, and my first task is to assure
my dear sister of my welfare and increasing confidence in the success
of my undertaking.

I am already far north of London, and as I walk in the streets of
Petersburgh, I feel a cold northern breeze play upon my cheeks, which
braces my nerves and fills me with delight.
`;
  const chapters = Array.from({ length: 12 }, (_, c) => {
    const paras = Array.from(
      { length: 10 },
      (_, p) =>
        `Paragraph ${p + 1} of chapter ${c + 1}. The ship moved slowly through the ice, and the sailors watched the pale horizon for any sign of open water. Each day brought new cold and new resolve, and the letters home grew longer as the nights did.`,
    ).join('\n\n');
    return `Chapter ${c + 1}\n\n${paras}`;
  }).join('\n\n');
  return `${opening}\n${chapters}\n\n*** END OF THE PROJECT GUTENBERG EBOOK FRANKENSTEIN ***\nLicence text that must not be shown.`;
}
