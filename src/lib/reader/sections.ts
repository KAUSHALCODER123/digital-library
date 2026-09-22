import type { TextBlock } from '@/lib/books/gutenbergText';

export type Section = { blocks: TextBlock[]; start: number; chars: number; title?: string };

const CHAPTER = /^(chapter|letter|book|part|stave|volume|act)\b/i;
/** Long enough to feel continuous, short enough that column layout stays instant. */
export const MAX_SECTION_CHARS = 18000;
const MIN_SECTION_CHARS = 400;

/**
 * Splits a book into sections at chapter headings (or by length for books without them).
 * Only one section is laid out at a time, which keeps pagination fast for very long books.
 */
export function splitSections(blocks: TextBlock[]): Section[] {
  const sections: Section[] = [];
  let current: Section = { blocks: [], start: 0, chars: 0 };
  let offset = 0;
  const push = () => {
    if (current.blocks.length) sections.push(current);
    current = { blocks: [], start: offset, chars: 0 };
  };
  for (const b of blocks) {
    const isChapter = b.type === 'heading' && CHAPTER.test(b.text);
    if ((isChapter && current.chars >= MIN_SECTION_CHARS) || (current.chars >= MAX_SECTION_CHARS && b.type !== 'heading')) push();
    if (!current.blocks.length && b.type === 'heading') current.title = b.text.split('\n')[0];
    current.blocks.push(b);
    current.chars += b.text.length + 1;
    offset += b.text.length + 1;
  }
  push();
  return sections;
}

export function totalChars(sections: Section[]): number {
  const last = sections[sections.length - 1];
  return last ? last.start + last.chars : 0;
}

/** Whole-book progress (0..1) from a position inside a section. */
export function overallFraction(sections: Section[], section: number, within: number): number {
  const total = totalChars(sections);
  const s = sections[section];
  if (!s || !total) return 0;
  return Math.min(1, Math.max(0, (s.start + within * s.chars) / total));
}

/** Inverse of overallFraction: which section, and how far into it. */
export function locate(sections: Section[], fraction: number): { section: number; within: number } {
  const total = totalChars(sections);
  if (!sections.length || !total) return { section: 0, within: 0 };
  const target = Math.min(1, Math.max(0, fraction)) * total;
  for (let i = 0; i < sections.length; i++) {
    const s = sections[i];
    if (target < s.start + s.chars || i === sections.length - 1) {
      return { section: i, within: s.chars ? Math.min(1, Math.max(0, (target - s.start) / s.chars)) : 0 };
    }
  }
  return { section: 0, within: 0 };
}
