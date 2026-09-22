/**
 * Project Gutenberg plain-text files wrap the book in licence boilerplate and hard-wrap
 * lines at ~70 characters. This extracts the book body and rebuilds real paragraphs.
 */

const START = /^\s*\*{3}\s*START OF (?:THE|THIS) PROJECT GUTENBERG E-?BOOK.*?\*{3}\s*$/im;
const END = /^\s*\*{3}\s*END OF (?:THE|THIS) PROJECT GUTENBERG E-?BOOK.*$/im;
/** Older files use a different marker. */
const END_LEGACY = /^\s*End of (?:the )?Project Gutenberg'?s? .*$/im;

export const MAX_TEXT_CHARS = 3_000_000;

export function stripBoilerplate(raw: string): string {
  let text = raw.replace(/^﻿/, '').replace(/\r\n?/g, '\n');
  const start = text.match(START);
  if (start?.index !== undefined) text = text.slice(start.index + start[0].length);
  const end = text.match(END) ?? text.match(END_LEGACY);
  if (end?.index !== undefined) text = text.slice(0, end.index);
  return text.trim();
}

export type TextBlock = { type: 'heading' | 'paragraph' | 'break'; text: string };

const HEADING = /^(?:(?:CHAPTER|BOOK|PART|VOLUME|STAVE|LETTER|ACT|SCENE)\b[\s\S]{0,80}|[IVXLCDM]+\.?|\d{1,3}\.?)$/i;

export function toBlocks(body: string): TextBlock[] {
  const blocks: TextBlock[] = [];
  for (const chunk of body.slice(0, MAX_TEXT_CHARS).split(/\n\s*\n+/)) {
    const lines = chunk.split('\n').map((l) => l.trim()).filter(Boolean);
    if (!lines.length) continue;
    const joined = lines.join(' ').replace(/\s+/g, ' ').trim();
    if (/^[*\s.]{3,}$/.test(joined)) {
      blocks.push({ type: 'break', text: '' });
      continue;
    }
    // Poetry, tables of contents and letters keep their line breaks.
    const shortLines = lines.length > 1 && lines.every((l) => l.length < 48);
    const text = shortLines ? lines.join('\n') : joined;
    const isHeading =
      lines.length <= 2 && joined.length <= 90 && (HEADING.test(lines[0]) || (joined === joined.toUpperCase() && /\p{Lu}/u.test(joined) && joined.length > 3));
    blocks.push({ type: isHeading ? 'heading' : 'paragraph', text });
  }
  return blocks;
}

/** Plain-text markup conventions: `[Illustration: …]` placeholders and `_italic_` underscores. */
export function cleanMarkup(body: string): string {
  return body
    .replace(/\[Illustration[^\]]{0,2000}\]/gi, '')
    // Italic markers often span lines and paragraphs, so drop underscores at word edges rather
    // than matching pairs; underscores inside words (file_name) are kept.
    .replace(/(^|[^\p{L}\p{N}_])_+(?=[\p{L}\p{N}])/gmu, '$1')
    .replace(/(?<=[\p{L}\p{N}\p{P}])_+(?=[^\p{L}\p{N}_]|$)/gmu, '');
}

export function parseGutenbergText(raw: string): TextBlock[] {
  return toBlocks(cleanMarkup(stripBoilerplate(raw)));
}
