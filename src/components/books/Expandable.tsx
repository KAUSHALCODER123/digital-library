'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { cn } from '@/lib/cn';

const FADE = {
  maskImage: 'linear-gradient(to bottom, black 70%, transparent)',
  WebkitMaskImage: 'linear-gradient(to bottom, black 70%, transparent)',
};

/** Clamps long text; shows "Read more" only when the text actually overflows. */
export function Expandable({
  paragraphs,
  lines = 7,
  lang,
  className,
}: {
  paragraphs: string[];
  lines?: number;
  lang?: string;
  className?: string;
}) {
  const id = useId();
  const ref = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [overflows, setOverflows] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const check = () => setOverflows(el.scrollHeight - el.clientHeight > 4);
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div className={className}>
      <div
        id={id}
        ref={ref}
        lang={lang}
        dir="auto"
        className={cn('prose-reading max-w-[68ch] text-body text-ink', !open && 'overflow-hidden')}
        style={open ? undefined : { maxHeight: `${lines * 1.65}em`, ...(overflows ? FADE : {}) }}
      >
        {paragraphs.map((p, i) => (
          <p key={i} className="whitespace-pre-line">
            {p}
          </p>
        ))}
      </div>
      {(overflows || open) && (
        <button
          type="button"
          aria-expanded={open}
          aria-controls={id}
          onClick={() => setOpen((o) => !o)}
          className="mt-2 text-ui font-semibold text-forest underline-offset-4 hover:underline"
        >
          {open ? 'Show less' : 'Read more'}
        </button>
      )}
    </div>
  );
}
