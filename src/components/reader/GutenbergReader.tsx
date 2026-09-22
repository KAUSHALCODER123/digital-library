'use client';

import * as Popover from '@radix-ui/react-popover';
import { Loader2, Minus, Plus, Type } from 'lucide-react';
import { useEffect, useState } from 'react';
import { buttonClasses } from '@/components/ui/button';
import type { TextBlock } from '@/lib/books/gutenbergText';
import { cn } from '@/lib/cn';
import { FONT_SIZES, LINE_HEIGHTS, READER_THEMES, useReaderPrefs, type ReaderTheme } from '@/lib/reader/prefs';
import type { ShelfBook } from '@/lib/shelf/types';
import { ReaderPages } from './ReaderPages';
import { ReaderShell } from './ReaderShell';


type Props = { book: ShelfBook; gutenbergId: number; bookHref: string; sourceHref: string };

export function GutenbergReader({ book, gutenbergId, bookHref, sourceHref }: Props) {
  const [blocks, setBlocks] = useState<TextBlock[] | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    /* eslint-disable react-hooks/set-state-in-effect -- (re)starting a fetch */
    setError(false);
    setBlocks(null);
    /* eslint-enable react-hooks/set-state-in-effect */
    fetch(`/api/gutenberg/${gutenbergId}`, { signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as { blocks?: TextBlock[] };
        if (!data.blocks?.length) throw new Error('empty');
        setBlocks(data.blocks);
      })
      .catch(() => {
        if (!controller.signal.aborted) setError(true);
      });
    return () => controller.abort();
  }, [gutenbergId, attempt]);

  return (
    <ReaderShell
      book={book}
      bookHref={bookHref}
      themed
      externalHref={sourceHref}
      externalLabel="Project Gutenberg"
      toolbarExtra={<ReaderSettings />}
    >
      {error ? (
        <div role="alert" className="absolute inset-0 grid place-items-center p-6 text-center">
          <div className="max-w-md">
            <h2 className="font-display text-h3 font-semibold">The text didn’t load</h2>
            <p className="mt-2 text-ui opacity-80">Project Gutenberg didn’t respond. Try again, or read it on their site.</p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <button type="button" className={buttonClasses('primary', 'md')} onClick={() => setAttempt((a) => a + 1)}>
                Try again
              </button>
              <a href={sourceHref} target="_blank" rel="noopener noreferrer" className={buttonClasses('secondary', 'md')}>
                Open on Project Gutenberg
              </a>
            </div>
          </div>
        </div>
      ) : !blocks ? (
        <div className="absolute inset-0 grid place-items-center">
          <p className="flex items-center gap-2 text-ui opacity-80">
            <Loader2 aria-hidden className="size-4 animate-spin" /> Opening the book…
          </p>
        </div>
      ) : (
        <ReaderPages book={book} blocks={blocks} />
      )}
    </ReaderShell>
  );
}

function ReaderSettings() {
  const { theme, font, size, lineHeight, set } = useReaderPrefs();
  const colors = READER_THEMES[theme];
  const sizeIndex = FONT_SIZES.indexOf(size as (typeof FONT_SIZES)[number]);
  const seg = 'flex-1 rounded-xs px-2 py-2 text-caption font-semibold';
  return (
    <Popover.Root>
      <Popover.Trigger className="inline-flex h-10 items-center gap-1.5 rounded-sm px-2.5 text-ui font-medium hover:bg-black/5" aria-label="Reading settings" style={{ color: colors.fg }}>
        <Type aria-hidden className="size-4" strokeWidth={1.8} />
        <span className="max-md:sr-only">Text</span>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content align="end" sideOffset={8} className="z-50 w-72 rounded-sm border border-rule bg-paper-raised p-4 text-ink shadow-[0_18px_40px_-18px_rgb(40_25_10/0.45)] data-[state=open]:animate-fade-in">
          <p className="text-caption font-semibold">Theme</p>
          <div role="radiogroup" aria-label="Reading theme" className="mt-2 flex gap-2">
            {(Object.keys(READER_THEMES) as ReaderTheme[]).map((t) => (
              <button
                key={t}
                type="button"
                role="radio"
                aria-checked={theme === t}
                onClick={() => set({ theme: t })}
                className={cn('flex-1 rounded-sm border-2 px-2 py-2.5 text-caption font-semibold', theme === t ? 'border-forest' : 'border-rule')}
                style={{ backgroundColor: READER_THEMES[t].bg, color: READER_THEMES[t].fg }}
              >
                {READER_THEMES[t].label}
              </button>
            ))}
          </div>

          <p className="mt-4 text-caption font-semibold">Typeface</p>
          <div role="radiogroup" aria-label="Typeface" className="mt-2 flex gap-1 rounded-sm border border-rule p-0.5">
            {(['serif', 'sans'] as const).map((f) => (
              <button
                key={f}
                type="button"
                role="radio"
                aria-checked={font === f}
                onClick={() => set({ font: f })}
                className={cn(seg, f === 'serif' ? 'font-reading' : 'font-sans', font === f ? 'bg-ink text-paper' : 'text-ink')}
              >
                {f === 'serif' ? 'Serif' : 'Sans serif'}
              </button>
            ))}
          </div>

          <p className="mt-4 text-caption font-semibold" id="size-label">
            Text size
          </p>
          <div className="mt-2 flex items-center gap-3" role="group" aria-labelledby="size-label">
            <button
              type="button"
              className={buttonClasses('secondary', 'icon', 'size-9')}
              onClick={() => sizeIndex > 0 && set({ size: FONT_SIZES[sizeIndex - 1] })}
              disabled={sizeIndex <= 0}
              aria-label="Smaller text"
            >
              <Minus aria-hidden className="size-4" />
            </button>
            <span className="flex-1 text-center text-ui tabular-nums" aria-live="polite">
              {size}px
            </span>
            <button
              type="button"
              className={buttonClasses('secondary', 'icon', 'size-9')}
              onClick={() => sizeIndex < FONT_SIZES.length - 1 && set({ size: FONT_SIZES[sizeIndex + 1] })}
              disabled={sizeIndex >= FONT_SIZES.length - 1}
              aria-label="Larger text"
            >
              <Plus aria-hidden className="size-4" />
            </button>
          </div>

          <p className="mt-4 text-caption font-semibold">Line spacing</p>
          <div role="radiogroup" aria-label="Line spacing" className="mt-2 flex gap-1 rounded-sm border border-rule p-0.5">
            {LINE_HEIGHTS.map((lh, i) => (
              <button
                key={lh}
                type="button"
                role="radio"
                aria-checked={lineHeight === lh}
                onClick={() => set({ lineHeight: lh })}
                className={cn(seg, lineHeight === lh ? 'bg-ink text-paper' : 'text-ink')}
              >
                {['Tight', 'Normal', 'Loose'][i]}
              </button>
            ))}
          </div>
          <Popover.Arrow className="fill-paper-raised" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
