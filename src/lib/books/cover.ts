import { GENRES, genreForCategories } from '@/lib/genres';

const CLOTHS = GENRES.map((g) => g.cloth);

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Deterministic cloth color for a placeholder cover: genre color if known, else hashed from title. */
export function placeholderCloth(title: string, categories: string[] = []): string {
  return genreForCategories(categories)?.cloth ?? CLOTHS[hash(title.toLowerCase()) % CLOTHS.length];
}

export function coverAlt(title: string, authors: string[]): string {
  const by = authors.length ? ` by ${authors.slice(0, 2).join(' and ')}${authors.length > 2 ? ' and others' : ''}` : '';
  return `Cover of ${title}${by}`;
}

/** Initials for very small placeholders: "The Name of the Wind" -> "NW". */
export function titleInitials(title: string): string {
  const words = title
    .replace(/^(the|a|an)\s+/i, '')
    .split(/\s+/)
    .filter((w) => w.length > 2 || /^\p{Lu}/u.test(w));
  const letters = (words.length ? words : title.split(/\s+/)).slice(0, 2).map((w) => [...w][0] ?? '');
  return letters.join('').toUpperCase() || '?';
}
