import { describe, expect, it } from 'vitest';
import { decideAccess } from './access';

describe('decideAccess (copyright gate)', () => {
  it('offers the Gutenberg reader only for texts marked not copyrighted', () => {
    const textUrl = 'https://www.gutenberg.org/ebooks/1342.txt.utf-8';
    expect(decideAccess({ gutenberg: { id: 1342, copyrighted: false, textUrl } })).toEqual({
      readableFullText: true,
      reader: { kind: 'gutenberg', gutenbergId: 1342, textUrl },
    });
    expect(decideAccess({ gutenberg: { id: 1, copyrighted: true, textUrl } }).readableFullText).toBe(false);
    expect(decideAccess({ gutenberg: { id: 1, copyrighted: null, textUrl } }).readableFullText).toBe(false);
    expect(decideAccess({ gutenberg: { id: 1, copyrighted: false } }).readableFullText).toBe(false);
  });

  it('embeds Internet Archive only for public, confirmed scans', () => {
    expect(decideAccess({ openLibrary: { ebookAccess: 'public', publicIaId: 'prideprejudice00austuoft' } })).toEqual({
      readableFullText: true,
      reader: { kind: 'ia', identifier: 'prideprejudice00austuoft' },
    });
    // Public, but no confirmed identifier yet: badge only, no embed.
    expect(decideAccess({ openLibrary: { ebookAccess: 'public' } })).toEqual({ readableFullText: true });
    for (const ebookAccess of ['borrowable', 'printdisabled', 'no_ebook', undefined]) {
      expect(decideAccess({ openLibrary: { ebookAccess, publicIaId: 'x123' } })).toEqual({ readableFullText: false });
    }
  });

  it('rejects malformed archive identifiers', () => {
    expect(decideAccess({ openLibrary: { ebookAccess: 'public', publicIaId: '"><script>' } }).reader).toBeUndefined();
  });

  it('uses the Google viewer only when the publisher allows embedding', () => {
    const full = decideAccess({ google: { volumeId: 'abc123', viewability: 'ALL_PAGES', embeddable: true } });
    expect(full.readableFullText).toBe(true);
    expect(full.reader).toEqual({ kind: 'google', volumeId: 'abc123', full: true });

    const partial = decideAccess({ google: { volumeId: 'abc123', viewability: 'PARTIAL', embeddable: true } });
    expect(partial.readableFullText).toBe(false);
    expect(partial.reader).toEqual({ kind: 'google', volumeId: 'abc123', full: false });
    expect(partial.previewUrl).toContain('output=embed');

    expect(decideAccess({ google: { volumeId: 'abc123', viewability: 'ALL_PAGES', embeddable: false } })).toEqual({
      readableFullText: false,
    });
    expect(decideAccess({ google: { volumeId: 'abc123', viewability: 'NO_PAGES', embeddable: true } })).toEqual({
      readableFullText: false,
    });
  });

  it('defaults to no reader when nothing is known', () => {
    expect(decideAccess({})).toEqual({ readableFullText: false });
  });
});
