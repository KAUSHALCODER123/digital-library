'use client';

import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { BookmarkCheck, BookmarkPlus, Check, ChevronDown, Heart, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { buttonClasses } from '@/components/ui/button';
import { cn } from '@/lib/cn';
import { selectItem, useShelf, useShelfHydrated } from '@/lib/shelf/store';
import { READING_STATUSES, type ReadingStatus, type ShelfBook } from '@/lib/shelf/types';

const LABEL: Record<ReadingStatus, string> = { WANT_TO_READ: 'Want to read', READING: 'Currently reading', READ: 'Read' };

const menuContent =
  'z-50 min-w-52 rounded-sm border border-rule bg-paper-raised p-1.5 shadow-[0_18px_40px_-18px_rgb(40_25_10/0.45)] data-[state=open]:animate-fade-in';
const menuItem =
  'flex cursor-pointer items-center gap-2.5 rounded-xs px-2.5 py-2 text-ui text-ink outline-none data-[highlighted]:bg-ink/[0.06]';

type Props = {
  book: ShelfBook;
  variant?: 'full' | 'compact';
  /** Secondary when another primary action (e.g. Read now) sits beside it. */
  emphasis?: 'primary' | 'secondary';
  className?: string;
};

export function ShelfButton({ book, variant = 'full', emphasis = 'primary', className }: Props) {
  const hydrated = useShelfHydrated();
  const item = useShelf(selectItem(book.id));
  const setStatus = useShelf((s) => s.setStatus);
  const status = hydrated ? (item?.status ?? null) : null;

  function choose(next: ReadingStatus | null) {
    if (next === status) return;
    setStatus(book, next);
    if (next) toast.success(status ? `Moved to ${LABEL[next]}` : `Added to ${LABEL[next]}`, { description: book.title });
    else toast(`Removed from your shelf`, { description: book.title });
  }

  const compact = variant === 'compact';
  const Icon = status ? BookmarkCheck : BookmarkPlus;

  return (
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger
        disabled={!hydrated}
        aria-label={compact ? (status ? `On your shelf: ${LABEL[status]}. Change shelf for ${book.title}` : `Add ${book.title} to your shelf`) : undefined}
        className={cn(
          compact
            ? buttonClasses(status ? 'secondary' : 'ghost', 'sm', 'h-9 gap-1.5 px-2.5 text-caption')
            : buttonClasses(status || emphasis === 'secondary' ? 'secondary' : 'primary', 'lg'),
          className,
        )}
      >
        <Icon aria-hidden className={cn('size-4', status && 'text-forest')} strokeWidth={1.8} />
        <span className={cn(compact && 'max-sm:sr-only')}>{status ? LABEL[status] : compact ? 'Add' : 'Add to shelf'}</span>
        <ChevronDown aria-hidden className="size-3.5 opacity-70" />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content align="start" sideOffset={6} className={menuContent}>
          <DropdownMenu.Label className="px-2.5 pt-1 pb-1.5 text-caption text-ink-muted">Put on shelf</DropdownMenu.Label>
          <DropdownMenu.RadioGroup value={status ?? ''} onValueChange={(v) => choose(v as ReadingStatus)}>
            {READING_STATUSES.map((s) => (
              <DropdownMenu.RadioItem key={s.value} value={s.value} className={menuItem}>
                <span className="grid size-4 place-items-center">
                  <DropdownMenu.ItemIndicator>
                    <Check aria-hidden className="size-4 text-forest" />
                  </DropdownMenu.ItemIndicator>
                </span>
                {s.label}
              </DropdownMenu.RadioItem>
            ))}
          </DropdownMenu.RadioGroup>
          {status && (
            <>
              <DropdownMenu.Separator className="my-1 h-px bg-rule" />
              <DropdownMenu.Item className={cn(menuItem, 'text-danger')} onSelect={() => choose(null)}>
                <Trash2 aria-hidden className="size-4" strokeWidth={1.7} />
                Remove from shelf
              </DropdownMenu.Item>
            </>
          )}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

export function FavoriteButton({ book, size = 'md', className }: { book: ShelfBook; size?: 'sm' | 'md'; className?: string }) {
  const hydrated = useShelfHydrated();
  const favorite = useShelf((s) => (hydrated ? !!s.items[book.id]?.favorite : false));
  const toggle = useShelf((s) => s.toggleFavorite);
  return (
    <button
      type="button"
      disabled={!hydrated}
      aria-pressed={favorite}
      aria-label={favorite ? `Remove ${book.title} from favorites` : `Add ${book.title} to favorites`}
      title={favorite ? 'Remove from favorites' : 'Add to favorites'}
      onClick={() => {
        toggle(book);
        toast(favorite ? 'Removed from favorites' : 'Added to favorites', { description: book.title });
      }}
      className={cn(
        size === 'sm' ? buttonClasses('ghost', 'sm', 'size-9 px-0') : buttonClasses('secondary', 'lg', 'w-12 px-0'),
        className,
      )}
    >
      <Heart
        aria-hidden
        className={cn('size-[18px] transition-colors', favorite ? 'fill-[#b4474f] text-[#b4474f]' : 'text-ink-muted')}
        strokeWidth={1.7}
      />
    </button>
  );
}
