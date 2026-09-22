'use client';

import { Share2 } from 'lucide-react';
import { toast } from 'sonner';
import { buttonClasses } from '@/components/ui/button';

export function ShareButton({ title, path }: { title: string; path: string }) {
  async function share() {
    const url = new URL(path, window.location.origin).toString();
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title, url });
        return;
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return; // user closed the sheet
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Link copied');
    } catch {
      toast.error('The link couldn’t be copied. Copy it from the address bar instead.');
    }
  }
  return (
    <button type="button" onClick={share} className={buttonClasses('secondary', 'lg', 'w-12 px-0')} aria-label={`Share ${title}`} title="Share">
      <Share2 aria-hidden className="size-[18px] text-ink-muted" strokeWidth={1.7} />
    </button>
  );
}
