'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { Menu, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { buttonClasses } from '@/components/ui/button';
import { NAV_LINKS } from './nav';

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  // eslint-disable-next-line react-hooks/set-state-in-effect -- close the sheet after navigation
  useEffect(() => setOpen(false), [pathname]);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger className={buttonClasses('quiet', 'icon', 'md:hidden')} aria-label="Open menu">
        <Menu aria-hidden className="size-5" strokeWidth={1.7} />
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-ink/40 data-[state=open]:animate-fade-in" />
        <Dialog.Content className="fixed inset-x-0 bottom-0 z-50 max-h-[85dvh] overflow-y-auto rounded-t-sm border-t border-rule bg-paper-raised px-4 pt-3 pb-safe data-[state=open]:animate-sheet-up">
          <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-rule-strong" aria-hidden />
          <div className="flex items-center justify-between">
            <Dialog.Title className="font-display text-h3">Menu</Dialog.Title>
            <Dialog.Close className={buttonClasses('quiet', 'icon')} aria-label="Close menu">
              <X aria-hidden className="size-5" />
            </Dialog.Close>
          </div>
          <Dialog.Description className="sr-only">Site navigation</Dialog.Description>
          <nav aria-label="Mobile" className="mt-2 pb-6">
            <ul className="divide-y divide-rule">
              {NAV_LINKS.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    aria-current={pathname === l.href ? 'page' : undefined}
                    className="flex items-center justify-between py-3.5 text-body text-ink no-underline aria-[current=page]:font-semibold aria-[current=page]:text-forest"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
