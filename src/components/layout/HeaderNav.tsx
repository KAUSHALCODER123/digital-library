'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SearchBox } from '@/components/search/SearchBox';
import { cn } from '@/lib/cn';

export function HeaderNav() {
  const pathname = usePathname();
  const links = [
    { href: '/genres', label: 'Browse' },
    { href: '/shelf', label: 'My shelf' },
  ];
  return (
    <nav aria-label="Primary" className="hidden items-center gap-1 md:flex">
      {links.map((l) => {
        const current = pathname === l.href || pathname.startsWith(`${l.href}/`);
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={current ? 'page' : undefined}
            className={cn(
              'rounded-xs px-3 py-2 text-ui font-medium text-ink-muted no-underline hover:text-ink',
              current && 'text-ink underline decoration-brass decoration-2 underline-offset-[10px]',
            )}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}

/** The header search hides on pages that have their own prominent search box. */
export function HeaderSearch() {
  const pathname = usePathname();
  if (pathname === '/' || pathname === '/search' || pathname.startsWith('/read/')) return null;
  return <SearchBox variant="header" className="hidden w-full max-w-sm sm:block" />;
}
