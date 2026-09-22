import Link from 'next/link';
import { Search } from 'lucide-react';
import { buttonClasses } from '@/components/ui/button';
import { AccountMenu } from './AccountMenu';
import { HeaderNav, HeaderSearch } from './HeaderNav';
import { MobileNav } from './MobileNav';
import { ThemeToggle } from './ThemeToggle';
import { Wordmark } from './Wordmark';

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-rule bg-paper/92 backdrop-blur-md supports-[backdrop-filter]:bg-paper/80">
      <div className="mx-auto flex h-16 max-w-[1200px] items-center gap-3 px-4 sm:gap-5 sm:px-6">
        <Wordmark />
        <HeaderNav />
        <div className="flex flex-1 justify-end">
          <HeaderSearch />
        </div>
        <div className="flex items-center gap-1">
          <Link href="/search" className={buttonClasses('quiet', 'icon', 'sm:hidden')} aria-label="Search">
            <Search aria-hidden className="size-5" strokeWidth={1.7} />
          </Link>
          <ThemeToggle />
          <AccountMenu />
          <MobileNav />
        </div>
      </div>
    </header>
  );
}
