'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

/**
 * Covers scroll horizontally above a fixed ledge, like books sliding along a shelf.
 * Arrow buttons are a pointer convenience; keyboard users tab through the links, which
 * scroll into view on focus, and touch users swipe.
 */
export function ShelfScroller({ children, label }: { children: ReactNode; label: string }) {
  const ref = useRef<HTMLUListElement>(null);
  const [edges, setEdges] = useState({ start: true, end: true });

  const measure = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    // scrollLeft is negative in RTL documents; compare magnitudes.
    const pos = Math.abs(el.scrollLeft);
    setEdges({ start: pos <= 2, end: pos >= max - 2 });
  }, []);

  useEffect(() => {
    measure();
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [measure]);

  function scroll(dir: 1 | -1) {
    const el = ref.current;
    if (!el) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: reduce ? 'auto' : 'smooth' });
  }

  const arrow =
    'absolute top-[92px] z-10 hidden size-10 -translate-y-1/2 place-items-center rounded-full border border-rule-strong bg-paper-raised/95 text-ink shadow-md transition-opacity hover:bg-paper sm:grid sm:top-[107px] disabled:pointer-events-none disabled:opacity-0';

  return (
    <div className="relative mt-5">
      <div aria-hidden className="ledge-bar pointer-events-none absolute inset-x-0 top-[176px] sm:top-[206px]" />
      <ul
        ref={ref}
        onScroll={measure}
        aria-label={label}
        className="scrollbar-none relative flex snap-x snap-mandatory scroll-px-1 gap-5 overflow-x-auto px-1 pt-2 pb-3 sm:gap-7"
      >
        {children}
      </ul>
      <button type="button" className={cn(arrow, '-left-3')} onClick={() => scroll(-1)} disabled={edges.start} aria-label={`Scroll ${label} back`}>
        <ChevronLeft aria-hidden className="size-5" strokeWidth={1.7} />
      </button>
      <button type="button" className={cn(arrow, '-right-3')} onClick={() => scroll(1)} disabled={edges.end} aria-label={`Scroll ${label} forward`}>
        <ChevronRight aria-hidden className="size-5" strokeWidth={1.7} />
      </button>
    </div>
  );
}
