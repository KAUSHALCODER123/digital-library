'use client';

import { EyeOff } from 'lucide-react';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/lib/auth/store';
import { coverAlt, placeholderCloth, titleInitials } from '@/lib/books/cover';
import { isRtl } from '@/lib/books/normalize';
import { cn } from '@/lib/cn';

export type CoverBook = {
  title: string;
  authors: string[];
  coverUrl?: string;
  categories?: string[];
  mature?: boolean;
  language?: string;
};

const WIDTHS = { xs: 48, sm: 96, md: 128, lg: 176, xl: 260 } as const;
export type CoverSize = keyof typeof WIDTHS;

type Props = {
  book: CoverBook;
  size?: CoverSize;
  /** Above-the-fold covers (detail page hero) load eagerly. */
  preload?: boolean;
  className?: string;
  /** Decorative when the title is printed right next to the cover. */
  decorative?: boolean;
};

export function BookCover({ book, size = 'md', preload, className, decorative }: Props) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  // A cached image can finish before hydration attaches onLoad; check once after mount.
  useEffect(() => {
    const img = imgRef.current;
    if (img?.complete && img.naturalWidth > 0) setLoaded(true);
  }, []);
  const [revealed, setRevealed] = useState(false);
  const showMaturePref = useAuth((s) => s.user?.showMature ?? false);
  const width = WIDTHS[size];
  const alt = decorative ? '' : coverAlt(book.title, book.authors);
  const hidden = !!book.mature && !showMaturePref && !revealed;
  const showImage = !!book.coverUrl && !failed;

  return (
    <div
      className={cn('book-object relative aspect-[2/3] shrink-0 overflow-hidden bg-paper-sunk', className)}
      style={{ width: `min(${width}px, 100%)` }}
    >
      {/* The designed placeholder sits underneath, so slow or missing covers never show a blank box. */}
      {(!showImage || !loaded) && <PlaceholderCover book={book} size={size} alt={showImage ? '' : alt} blurred={hidden} />}
      {showImage && (
        <Image
          ref={imgRef}
          src={book.coverUrl!}
          alt={alt}
          fill
          sizes={`${width}px`}
          preload={preload}
          loading={preload ? undefined : 'lazy'}
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
          className={cn(
            'object-cover transition-opacity duration-300',
            loaded ? 'opacity-100' : 'opacity-0',
            hidden && 'scale-110 blur-xl',
          )}
        />
      )}
      {hidden && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setRevealed(true);
          }}
          className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-1.5 bg-ink/55 p-2 text-center text-paper"
          aria-label={`Show cover of ${book.title}. It may contain mature content.`}
        >
          <EyeOff aria-hidden className="size-5" strokeWidth={1.6} />
          {size !== 'xs' && <span className="text-caption leading-tight font-semibold">Mature content. Show cover</span>}
        </button>
      )}
    </div>
  );
}

function PlaceholderCover({ book, size, alt, blurred }: { book: CoverBook; size: CoverSize; alt: string; blurred: boolean }) {
  const cloth = placeholderCloth(book.title, book.categories);
  const tiny = size === 'xs';
  const small = size === 'sm';
  const rtl = isRtl(book.language);
  return (
    <div
      role={alt ? 'img' : undefined}
      aria-label={alt || undefined}
      className={cn('absolute inset-0 flex flex-col text-[#f3ecdc]', blurred && 'blur-md')}
      style={{ backgroundColor: cloth }}
    >
      {/* Cloth texture and spine band */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.18] mix-blend-overlay"
        style={{
          backgroundImage:
            'repeating-linear-gradient(45deg, rgba(255,255,255,.35) 0 1px, transparent 1px 3px), repeating-linear-gradient(-45deg, rgba(0,0,0,.35) 0 1px, transparent 1px 3px)',
        }}
      />
      <div aria-hidden className="absolute inset-y-0 left-0 w-[9%] bg-black/20" />
      {tiny ? (
        <span aria-hidden className="relative m-auto font-display text-[0.8rem] font-semibold tracking-wide">
          {titleInitials(book.title)}
        </span>
      ) : (
        <div
          aria-hidden
          dir={rtl ? 'rtl' : 'auto'}
          lang={book.language}
          className={cn('relative flex h-full flex-col ps-[16%] pe-[9%]', small ? 'py-3' : 'py-5')}
        >
          <div className="mb-auto h-px w-8 bg-[#d8b77a]/80" />
          <p
            className={cn(
              'font-display leading-[1.12] font-semibold break-words hyphens-auto',
              small ? 'line-clamp-4 text-[0.78rem]' : size === 'md' ? 'line-clamp-5 text-[0.95rem]' : 'line-clamp-6 text-[1.2rem]',
            )}
          >
            {book.title}
          </p>
          {book.authors[0] && (
            <p className={cn('mt-2 line-clamp-2 font-sans opacity-80', small ? 'text-[0.6rem]' : 'text-[0.7rem]')}>
              {book.authors[0]}
            </p>
          )}
          <div className="mt-auto h-px w-8 bg-[#d8b77a]/80" />
        </div>
      )}
    </div>
  );
}
