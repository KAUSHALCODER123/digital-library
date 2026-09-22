'use client';

import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { LogOut, Settings, ShieldCheck, UserRound } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { buttonClasses } from '@/components/ui/button';
import { useAuth } from '@/lib/auth/store';
import { signOutEverywhere } from '@/lib/auth/signOut';
import { cn } from '@/lib/cn';

export function AccountMenu() {
  const { status, user, enabled } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  if (!enabled) return null;
  if (status === 'loading') return <span aria-hidden className="block h-8 w-[72px] rounded-sm bg-ink/[0.05]" />;

  if (status === 'guest' || !user) {
    const next = pathname && pathname !== '/login' && pathname !== '/register' ? `?next=${encodeURIComponent(pathname)}` : '';
    return (
      <Link href={`/login${next}`} className={buttonClasses('secondary', 'sm')}>
        Sign in
      </Link>
    );
  }

  const initial = (user.name || user.email || '?').trim().charAt(0).toUpperCase();
  const itemClass =
    'flex cursor-pointer items-center gap-2.5 rounded-xs px-2.5 py-2 text-ui text-ink outline-none data-[highlighted]:bg-ink/[0.06]';

  return (
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger
        className="grid size-9 place-items-center rounded-full border border-rule-strong bg-paper-raised font-display text-[1.05rem] text-forest hover:border-ink-muted"
        aria-label={`Account menu for ${user.name || user.email}`}
      >
        {initial}
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          className="z-50 min-w-56 rounded-sm border border-rule bg-paper-raised p-1.5 shadow-[0_18px_40px_-18px_rgb(40_25_10/0.45)] data-[state=open]:animate-fade-in"
        >
          <div className="px-2.5 pt-1.5 pb-2">
            <p className="truncate text-ui font-semibold text-ink">{user.name || 'Reader'}</p>
            {user.email && <p className="truncate text-caption text-ink-muted">{user.email}</p>}
          </div>
          <DropdownMenu.Separator className="my-1 h-px bg-rule" />
          <DropdownMenu.Item asChild className={itemClass}>
            <Link href="/shelf">
              <UserRound aria-hidden className="size-4 text-ink-muted" strokeWidth={1.7} /> My shelf
            </Link>
          </DropdownMenu.Item>
          <DropdownMenu.Item asChild className={itemClass}>
            <Link href="/account">
              <Settings aria-hidden className="size-4 text-ink-muted" strokeWidth={1.7} /> Account settings
            </Link>
          </DropdownMenu.Item>
          {user.role === 'staff' && (
            <DropdownMenu.Item asChild className={itemClass}>
              <Link href="/admin">
                <ShieldCheck aria-hidden className="size-4 text-ink-muted" strokeWidth={1.7} /> Library staff tools
              </Link>
            </DropdownMenu.Item>
          )}
          <DropdownMenu.Separator className="my-1 h-px bg-rule" />
          <DropdownMenu.Item
            className={cn(itemClass)}
            onSelect={async () => {
              await signOutEverywhere();
              router.push('/');
              router.refresh();
            }}
          >
            <LogOut aria-hidden className="size-4 text-ink-muted" strokeWidth={1.7} /> Sign out
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
