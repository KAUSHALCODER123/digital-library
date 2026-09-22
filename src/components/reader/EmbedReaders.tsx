'use client';

import { ExternalLink, Loader2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { buttonClasses } from '@/components/ui/button';

const SLOW_MS = 12000;

function Fallback({ title, message, href, label }: { title: string; message: string; href: string; label: string }) {
  return (
    <div role="alert" className="absolute inset-0 grid place-items-center overflow-y-auto bg-paper p-6">
      <div className="max-w-md text-center">
        <h2 className="font-display text-h3 font-semibold text-ink">{title}</h2>
        <p className="mt-2 text-ui text-ink-muted">{message}</p>
        <a href={href} target="_blank" rel="noopener noreferrer" className={buttonClasses('primary', 'lg', 'mt-6')}>
          {label}
          <ExternalLink aria-hidden className="size-4" />
          <span className="sr-only">(opens in a new tab)</span>
        </a>
      </div>
    </div>
  );
}

/** Internet Archive BookReader embed. IA allows framing; the hint covers slow or blocked loads. */
export function IAReader({ identifier, title }: { identifier: string; title: string }) {
  const [loaded, setLoaded] = useState(false);
  const [slow, setSlow] = useState(false);
  const href = `https://archive.org/details/${encodeURIComponent(identifier)}`;

  useEffect(() => {
    const t = setTimeout(() => setSlow(true), SLOW_MS);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="absolute inset-0 bg-paper-sunk">
      {!loaded && (
        <div className="absolute inset-0 grid place-items-center">
          <p className="flex items-center gap-2 text-ui text-ink-muted">
            <Loader2 aria-hidden className="size-4 animate-spin" /> Opening the book from the Internet Archive…
          </p>
        </div>
      )}
      <iframe
        src={`https://archive.org/embed/${encodeURIComponent(identifier)}`}
        title={`${title}, Internet Archive reader`}
        className="absolute inset-0 size-full border-0"
        allow="fullscreen"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
        onLoad={() => setLoaded(true)}
      />
      {slow && !loaded && (
        <p role="status" className="absolute inset-x-4 bottom-4 mx-auto max-w-md rounded-sm border border-rule bg-paper-raised px-4 py-3 text-center text-ui text-ink shadow-lg">
          Taking a while?{' '}
          <a href={href} target="_blank" rel="noopener noreferrer" className="font-semibold text-forest">
            Read it on archive.org instead
          </a>
        </p>
      )}
    </div>
  );
}

type GoogleViewer = { load: (id: string, notFound: () => void, success: () => void) => void };
type GoogleBooksApi = { load: () => void; setOnLoadCallback: (cb: () => void) => void; DefaultViewer: new (el: HTMLElement) => GoogleViewer };
declare global {
  interface Window {
    google?: { books?: GoogleBooksApi };
  }
}

let scriptPromise: Promise<GoogleBooksApi> | null = null;
function loadGoogleBooks(): Promise<GoogleBooksApi> {
  if (window.google?.books?.DefaultViewer) return Promise.resolve(window.google.books);
  scriptPromise ??= new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://www.google.com/books/jsapi.js';
    s.async = true;
    s.onload = () => {
      const api = window.google?.books;
      if (!api) return reject(new Error('no api'));
      api.load();
      api.setOnLoadCallback(() => resolve(api));
    };
    s.onerror = () => {
      scriptPromise = null;
      reject(new Error('script failed'));
    };
    document.head.appendChild(s);
  });
  return scriptPromise;
}

/**
 * Google's own Embedded Viewer: the publisher-sanctioned preview widget. Unlike a raw iframe it
 * reports when a book can't be shown, so we can offer a link instead of a blank frame.
 */
export function GoogleReader({ volumeId, title, fallbackHref }: { volumeId: string; title: string; fallbackHref: string }) {
  const el = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'failed'>('loading');

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => !cancelled && setState((s) => (s === 'loading' ? 'failed' : s)), SLOW_MS);
    loadGoogleBooks()
      .then((api) => {
        if (cancelled || !el.current) return;
        const viewer = new api.DefaultViewer(el.current);
        viewer.load(
          volumeId,
          () => !cancelled && setState('failed'),
          () => !cancelled && setState('ready'),
        );
      })
      .catch(() => !cancelled && setState('failed'));
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [volumeId]);

  return (
    <div className="absolute inset-0 bg-paper-sunk">
      <div ref={el} className="absolute inset-0 size-full" aria-label={`${title}, Google Books preview`} role="region" />
      {state === 'loading' && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <p className="flex items-center gap-2 text-ui text-ink-muted">
            <Loader2 aria-hidden className="size-4 animate-spin" /> Loading the preview…
          </p>
        </div>
      )}
      {state === 'failed' && (
        <Fallback
          title="This preview can’t be shown here"
          message="The publisher doesn’t allow this preview to be embedded, or it didn’t load. You can keep reading on Google Books."
          href={fallbackHref}
          label="Continue reading on Google Books"
        />
      )}
    </div>
  );
}
