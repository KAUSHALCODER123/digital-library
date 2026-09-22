import Link from 'next/link';

/** Three spines on a shelf: the one decorative mark in the header. */
export function LibraryMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 28 28" fill="none" aria-hidden className={className}>
      <rect x="4.5" y="6" width="5" height="17" rx="0.8" stroke="currentColor" strokeWidth="1.5" />
      <rect x="11" y="3.5" width="5" height="19.5" rx="0.8" stroke="currentColor" strokeWidth="1.5" />
      <path d="M17.6 7.2l4.7-1.3 4 15.9-4.7 1.3z" stroke="var(--brass)" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M2 24.25h24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M11 8h5M4.5 10h5" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}

export function Wordmark() {
  return (
    <Link href="/" className="group inline-flex items-center gap-2 rounded-xs text-ink no-underline">
      <LibraryMark className="size-7 text-forest" />
      <span className="font-display text-[1.35rem] leading-none font-semibold tracking-[-0.015em]">Bibliotheca</span>
    </Link>
  );
}
