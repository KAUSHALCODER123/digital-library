import { describe, expect, it } from 'vitest';
import type { TextBlock } from '@/lib/books/gutenbergText';
import { locate, MAX_SECTION_CHARS, overallFraction, splitSections, totalChars } from './sections';

const para = (n: number): TextBlock => ({ type: 'paragraph', text: 'x'.repeat(n) });
const heading = (t: string): TextBlock => ({ type: 'heading', text: t });

describe('splitSections', () => {
  it('starts a new section at each chapter heading', () => {
    const s = splitSections([heading('Chapter 1'), para(600), heading('Chapter 2'), para(600), heading('CHAPTER III'), para(10)]);
    expect(s).toHaveLength(3);
    expect(s.map((x) => x.title)).toEqual(['Chapter 1', 'Chapter 2', 'CHAPTER III']);
  });

  it('keeps a short front matter with the first chapter', () => {
    const s = splitSections([heading('PREFACE'), para(50), heading('Chapter 1'), para(600)]);
    expect(s).toHaveLength(1);
  });

  it('splits books without chapters by length', () => {
    const blocks = Array.from({ length: 50 }, () => para(1000));
    const s = splitSections(blocks);
    expect(s.length).toBeGreaterThan(2);
    for (const sec of s) expect(sec.chars).toBeLessThanOrEqual(MAX_SECTION_CHARS + 1001);
  });

  it('keeps every block exactly once, in order', () => {
    const blocks = [heading('Chapter 1'), para(500), para(700), heading('Chapter 2'), para(900)];
    expect(splitSections(blocks).flatMap((s) => s.blocks)).toEqual(blocks);
  });

  it('handles an empty book', () => {
    expect(splitSections([])).toEqual([]);
    expect(locate([], 0.5)).toEqual({ section: 0, within: 0 });
    expect(overallFraction([], 0, 0.5)).toBe(0);
  });
});

describe('position math', () => {
  const sections = splitSections([heading('Chapter 1'), para(999), heading('Chapter 2'), para(999), heading('Chapter 3'), para(1999)]);

  it('round-trips a position through the whole-book fraction', () => {
    for (const [section, within] of [
      [0, 0],
      [1, 0.5],
      [2, 0.25],
      [2, 1],
    ] as const) {
      const f = overallFraction(sections, section, within);
      const back = locate(sections, f);
      expect(back.section).toBe(section);
      expect(back.within).toBeCloseTo(within, 5);
    }
  });

  it('clamps out-of-range fractions', () => {
    expect(locate(sections, -1)).toEqual({ section: 0, within: 0 });
    expect(locate(sections, 5).section).toBe(sections.length - 1);
    expect(totalChars(sections)).toBeGreaterThan(0);
  });
});
