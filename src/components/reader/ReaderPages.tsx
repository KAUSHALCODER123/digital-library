'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { TextBlock } from '@/lib/books/gutenbergText';
import { cn } from '@/lib/cn';
import { READER_THEMES, readPosition, useReaderPrefs, writePosition } from '@/lib/reader/prefs';
import { locate, overallFraction, splitSections } from '@/lib/reader/sections';
import { useShelf } from '@/lib/shelf/store';
import type { ShelfBook } from '@/lib/shelf/types';

const GAP = 48;

type Landing = { within: number } | { end: true };

/**
 * Paginates one section (roughly a chapter) at a time using CSS columns, so layout stays fast
 * even for very long books. Position is tracked across the whole book as a fraction of its text.
 */
export function ReaderPages({ book, blocks }: { book: ShelfBook; blocks: TextBlock[] }) {
  const { theme, font, size, lineHeight } = useReaderPrefs();
  const colors = READER_THEMES[theme];
  const setProgress = useShelf((s) => s.setProgress);
  const sections = useMemo(() => splitSections(blocks), [blocks]);

  // Blocks are fetched on the client, so reading the saved position here is safe.
  const [start] = useState(() => locate(sections, readPosition(book.id)));
  const [section, setSection] = useState(start.section);
  const [page, setPage] = useState(0);
  const [pages, setPages] = useState(1);
  const [width, setWidth] = useState(0);
  const [ready, setReady] = useState(false);
  /** True while a (re)layout is pending; page turns wait for it. */
  const [measuring, setMeasuring] = useState(true);

  const viewport = useRef<HTMLDivElement>(null);
  const turnLayer = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const landing = useRef<Landing | null>({ within: start.within });
  const pos = useRef({ section: start.section, page: 0, pages: 1 });

  useEffect(() => {
    pos.current = { section, page, pages };
  }, [section, page, pages]);

  // A page's position is where it starts, so the last page of one section and the first page
  // of the next never share a value.
  const within = () => pos.current.page / Math.max(1, pos.current.pages);

  const layout = useCallback(() => {
    const vp = viewport.current;
    const el = content.current;
    if (!vp || !el) return;
    const w = vp.clientWidth;
    if (!w) return;
    setWidth(w);
    requestAnimationFrame(() => {
      const total = Math.max(1, Math.round((el.scrollWidth + GAP) / (w + GAP)));
      const land = landing.current;
      landing.current = null;
      const target = !land
        ? Math.min(pos.current.page, total - 1)
        : 'end' in land
          ? total - 1
          : Math.min(total - 1, Math.max(0, Math.round(land.within * total)));
      pos.current = { ...pos.current, page: target, pages: total };
      setPages(total);
      setPage(target);
      setReady(true);
      setMeasuring(false);
    });
  }, []);

  // Lay out again when the section or the text settings change, keeping the reader's place.
  const settings = `${font}|${size}|${lineHeight}`;
  const lastSettings = useRef(settings);
  useLayoutEffect(() => {
    if (lastSettings.current !== settings) {
      lastSettings.current = settings;
      landing.current ??= { within: within() };
    }
    layout();
  }, [layout, section, settings]);

  useEffect(() => {
    const vp = viewport.current;
    if (!vp) return;
    let lastWidth = vp.clientWidth;
    let t: ReturnType<typeof setTimeout>;
    const ro = new ResizeObserver(() => {
      if (vp.clientWidth === lastWidth) return;
      lastWidth = vp.clientWidth;
      clearTimeout(t);
      t = setTimeout(() => {
        landing.current = { within: within() };
        layout();
      }, 120);
    });
    ro.observe(vp);
    return () => {
      clearTimeout(t);
      ro.disconnect();
    };
  }, [layout]);

  const atStart = section === 0 && page === 0;
  const atEnd = section === sections.length - 1 && page >= pages - 1;
  const overall = atEnd && ready ? 1 : overallFraction(sections, section, page / Math.max(1, pages));

  useEffect(() => {
    if (!ready) return;
    writePosition(book.id, overall);
    if (overall <= 0) return;
    const t = setTimeout(() => setProgress(book, overall), 800);
    return () => clearTimeout(t);
  }, [ready, overall, book, setProgress]);

  const animate = (dir: 1 | -1) => {
    if (!turnLayer.current || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    turnLayer.current.animate(
      [
        { opacity: 0.4, transform: `translateX(${dir * 14}px)` },
        { opacity: 1, transform: 'none' },
      ],
      { duration: 180, easing: 'ease-out' },
    );
  };

  const readyRef = useRef(false);
  useEffect(() => {
    readyRef.current = ready;
  }, [ready]);

  const go = useCallback(
    (dir: 1 | -1) => {
      // Until the section is measured, page counts are unknown; ignore turns rather than guess.
      if (!readyRef.current || landing.current) return;
      const { section: s, page: p, pages: total } = pos.current;
      const next = p + dir;
      if (next >= 0 && next < total) {
        pos.current = { ...pos.current, page: next };
        setPage(next);
        animate(dir);
      } else if (dir > 0 && s < sections.length - 1) {
        landing.current = { within: 0 };
        setMeasuring(true);
        pos.current = { section: s + 1, page: 0, pages: 1 };
        setPage(0);
        setSection(s + 1);
        animate(dir);
      } else if (dir < 0 && s > 0) {
        landing.current = { end: true };
        setMeasuring(true);
        pos.current = { section: s - 1, page: 0, pages: 1 };
        setPage(0);
        setSection(s - 1);
        animate(dir);
      }
    },
    [sections.length],
  );

  const jumpTo = useCallback(
    (fraction: number) => {
      const loc = locate(sections, fraction);
      landing.current = { within: loc.within };
      setMeasuring(true);
      if (loc.section === pos.current.section) layout();
      else setSection(loc.section);
    },
    [sections, layout],
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.closest('input, select, textarea, [role="dialog"], [data-radix-popper-content-wrapper]') || t.isContentEditable)) return;
      if (e.key === ' ' && t?.closest('button, a')) return;
      if (e.key === 'ArrowRight' || e.key === 'PageDown' || (e.key === ' ' && !e.shiftKey)) {
        e.preventDefault();
        go(1);
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp' || (e.key === ' ' && e.shiftKey)) {
        e.preventDefault();
        go(-1);
      } else if (e.key === 'Home') {
        e.preventDefault();
        jumpTo(0);
      } else if (e.key === 'End') {
        e.preventDefault();
        jumpTo(1);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go, jumpTo]);

  const touch = useRef<{ x: number; y: number } | null>(null);
  const percent = Math.round(overall * 100);
  const current = sections[section];

  return (
    <div className="absolute inset-0 flex flex-col">
      <div
        className="relative min-h-0 flex-1 touch-pan-y px-5 py-6 sm:px-10 sm:py-10"
        onPointerDown={(e) => {
          if (e.pointerType === 'touch') touch.current = { x: e.clientX, y: e.clientY };
        }}
        onPointerUp={(e) => {
          const s = touch.current;
          touch.current = null;
          if (!s) return;
          const dx = e.clientX - s.x;
          const dy = e.clientY - s.y;
          if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) go(dx < 0 ? 1 : -1);
        }}
      >
        <div ref={viewport} className="mx-auto h-full max-w-[40rem] overflow-hidden" aria-busy={!ready}>
          <div ref={turnLayer} className={cn('h-full transition-opacity', ready ? 'opacity-100' : 'opacity-0')}>
            <div
              ref={content}
              lang="en"
              data-testid="reader-content"
              data-ready={ready && !measuring}
              data-progress={overall.toFixed(5)}
              className={cn('h-full', font === 'serif' ? 'font-reading' : 'font-sans')}
              style={{
                columnWidth: width ? `${width}px` : undefined,
                columnGap: `${GAP}px`,
                columnFill: 'auto',
                fontSize: `${size}px`,
                lineHeight,
                transform: `translateX(-${page * (width + GAP)}px)`,
                hyphens: 'auto',
                textAlign: 'justify',
              }}
            >
              {current?.blocks.map((b, i) =>
                b.type === 'heading' ? (
                  <h2
                    key={i}
                    className={cn(
                      'mb-[0.8em] text-center font-display text-[1.25em] leading-tight font-semibold whitespace-pre-line',
                      i === 0 ? 'mt-[1.2em]' : 'mt-[1.6em]',
                    )}
                    style={{ breakAfter: 'avoid', textAlign: 'center' }}
                  >
                    {b.text}
                  </h2>
                ) : b.type === 'break' ? (
                  <p key={i} aria-hidden className="my-[1em] text-center opacity-60">
                    ⁂
                  </p>
                ) : (
                  <p
                    key={i}
                    className="mb-[0.65em] whitespace-pre-line"
                    style={{
                      textIndent: b.text.includes('\n') || (i > 0 && current.blocks[i - 1].type === 'heading') ? 0 : '1.2em',
                      textAlign: b.text.includes('\n') ? 'start' : undefined,
                      orphans: 2,
                      widows: 2,
                    }}
                  >
                    {b.text}
                  </p>
                ),
              )}
            </div>
          </div>
        </div>
        {/* Generous tap targets at the page edges for touch screens. */}
        <button type="button" tabIndex={-1} aria-hidden onClick={() => go(-1)} disabled={atStart} className="absolute inset-y-0 left-0 w-[18%] cursor-w-resize opacity-0" />
        <button type="button" tabIndex={-1} aria-hidden onClick={() => go(1)} disabled={atEnd} className="absolute inset-y-0 right-0 w-[18%] cursor-e-resize opacity-0" />
      </div>

      <div className="pb-safe shrink-0 border-t" style={{ borderColor: `${colors.muted}33`, backgroundColor: colors.chrome }}>
        <div className="mx-auto flex h-14 max-w-[40rem] items-center gap-3 px-3">
          <button
            type="button"
            onClick={() => go(-1)}
            disabled={atStart}
            aria-label="Previous page"
            className="grid size-10 shrink-0 place-items-center rounded-sm hover:bg-black/5 disabled:opacity-30"
          >
            <ChevronLeft aria-hidden className="size-5" />
          </button>
          <div className="min-w-0 flex-1">
            <div
              role="progressbar"
              aria-label="Progress through the book"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={percent}
              aria-valuetext={`${percent}% of the book`}
              className="h-1 overflow-hidden rounded-full"
              style={{ backgroundColor: `${colors.muted}40` }}
            >
              <div className="h-full rounded-full transition-[width]" style={{ width: `${percent}%`, backgroundColor: colors.fg }} />
            </div>
            <p className="mt-1.5 flex justify-between gap-2 text-caption tabular-nums" style={{ color: colors.muted }}>
              <span>{percent}% of the book</span>
              <span aria-live="polite" data-testid="reader-page">
                Page {page + 1} of {pages} in this part
              </span>
            </p>
          </div>
          <button
            type="button"
            onClick={() => go(1)}
            disabled={atEnd}
            aria-label="Next page"
            className="grid size-10 shrink-0 place-items-center rounded-sm hover:bg-black/5 disabled:opacity-30"
          >
            <ChevronRight aria-hidden className="size-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

