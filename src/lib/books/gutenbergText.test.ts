import { describe, expect, it } from 'vitest';
import { fixtureGutenbergText } from './fixtures';
import { parseGutenbergText, stripBoilerplate, toBlocks } from './gutenbergText';

describe('Gutenberg text', () => {
  it('removes licence boilerplate before and after the book', () => {
    const body = stripBoilerplate(fixtureGutenbergText());
    expect(body.startsWith('Letter 1')).toBe(true);
    expect(body).not.toContain('START OF THE PROJECT GUTENBERG');
    expect(body).not.toContain('Licence text');
  });

  it('handles CRLF files and a BOM', () => {
    const raw = '﻿header\r\n*** START OF THIS PROJECT GUTENBERG EBOOK X ***\r\n\r\nIt was a bright cold day in April, and the clocks were striking\r\nthirteen.\r\n\r\n*** END OF THIS PROJECT GUTENBERG EBOOK X ***\r\n';
    expect(parseGutenbergText(raw)).toEqual([
      { type: 'paragraph', text: 'It was a bright cold day in April, and the clocks were striking thirteen.' },
    ]);
  });

  it('rejoins hard-wrapped lines and finds chapter headings', () => {
    const blocks = parseGutenbergText(fixtureGutenbergText());
    expect(blocks[0]).toEqual({ type: 'heading', text: 'Letter 1' });
    const para = blocks.find((b) => b.text.startsWith('You will rejoice'));
    expect(para?.type).toBe('paragraph');
    expect(para?.text).not.toContain('\n');
    expect(blocks.filter((b) => b.type === 'heading' && b.text.startsWith('Chapter'))).toHaveLength(12);
  });

  it('keeps short verse lines and scene breaks', () => {
    expect(toBlocks('Roses are red,\nViolets are blue.\n\n* * *\n\nNext.')).toEqual([
      { type: 'paragraph', text: 'Roses are red,\nViolets are blue.' },
      { type: 'break', text: '' },
      { type: 'paragraph', text: 'Next.' },
    ]);
  });

  it('works when markers are missing', () => {
    expect(parseGutenbergText('Just text.')).toEqual([{ type: 'paragraph', text: 'Just text.' }]);
  });
});
