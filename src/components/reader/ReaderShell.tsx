'use client';

import { ArrowLeft, CheckCircle2, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { useEffect, type ReactNode } from 'react';
import { toast } from 'sonner';
import { cn } from '@/lib/cn';
import { READER_THEMES, useReaderPrefs } from '@/lib/reader/prefs';
import { useShelf, useShelfHydrated } from '@/lib/shelf/store';
import type { ShelfBook } from '@/lib/shelf/types';

type Props = {
  book: ShelfBook;
  bookHref: string;
  /** "Open in new tab" target for embedded readers. */
  externalHref?: string;
  externalLabel?: string;
  /** Embedded readers use the site theme; the Gutenberg reader uses the reading theme. */
  themed?: boolean;
  toolbarExtra?: ReactNode;
  children: ReactNode;
};

/**
 * Full-screen reading surface. It sits above the site chrome and sizes itself to the dynamic
 * viewport, so mobile browser toolbars never clip the page or the controls.
 */
export function ReaderShell({ book, bookHref, externalHref, externalLabel, themed, toolbarExtra, children }: Props) {
  const theme = useReaderPrefs((s) => s.theme);
  const colors = READER_THEMES[theme];
  const hydrated = useShelfHydrated();
  const status = useShelf((s) => s.items[book.id]?.status ?? null);
  const setStatus = useShelf((s) => s.setStatus);

  useEffect(() => {
    void useReaderPrefs.persist.rehydrate();
    const html = document.documentElement;
    const prev = html.style.overflow;
    html.style.overflow = 'hidden';
    return () => {
      html.style.overflow = prev;
    };
  }, []);

  const isRead = hydrated && status === 'READ';

  return (
    <div
      className="fixed inset-0 z-[45] flex h-[100svh] flex-col supports-[height:100dvh]:h-[100dvh]"
      style={themed ? { backgroundColor: colors.bg, color: colors.fg } : undefined}
      data-reader-theme={themed ? theme : undefined}
    >
      <header
        className={cn('pt-safe shrink-0 border-b', themed ? '' : 'border-rule bg-paper-raised text-ink')}
        style={themed ? { backgroundColor: colors.chrome, borderColor: `${colors.muted}33` } : undefined}
      >
        <div className="flex h-14 items-center gap-2 px-2 sm:px-4">
          <Link
            href={bookHref}
            className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-sm px-2.5 text-ui font-semibold no-underline hover:bg-black/5"
            style={themed ? { color: colors.fg } : undefined}
          >
            <ArrowLeft aria-hidden className="size-4" strokeWidth={1.8} />
            <span className="max-sm:sr-only">Book details</span>
          </Link>
          <h1 className="min-w-0 flex-1 truncate text-center font-display text-[1.02rem] font-semibold" dir="auto">
            {book.title}
          </h1>
          <div className="flex shrink-0 items-center gap-1">
            {toolbarExtra}
            {externalHref && (
              <a
                href={externalHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-10 items-center gap-1.5 rounded-sm px-2.5 text-ui font-medium no-underline hover:bg-black/5"
                style={themed ? { color: colors.fg } : undefined}
              >
                <ExternalLink aria-hidden className="size-4" strokeWidth={1.8} />
                <span className="max-md:sr-only">{externalLabel ?? 'Open in new tab'}</span>
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
            )}
            <button
              type="button"
              disabled={!hydrated}
              aria-pressed={isRead}
              onClick={() => {
                if (isRead) return;
                setStatus(book, 'READ');
                toast.success('Marked as read', { description: book.title });
              }}
              className={cn(
                'inline-flex h-10 items-center gap-1.5 rounded-sm px-2.5 text-ui font-semibold hover:bg-black/5 disabled:opacity-50',
                isRead && 'cursor-default',
              )}
              style={themed ? { color: colors.fg } : undefined}
            >
              <CheckCircle2 aria-hidden className={cn('size-4', isRead && 'text-[#2f7a57]')} strokeWidth={1.8} />
              <span className="max-sm:sr-only">{isRead ? 'Read' : 'Mark as read'}</span>
            </button>
          </div>
        </div>
      </header>
      <div className="relative min-h-0 flex-1">{children}</div>
    </div>
  );
}
