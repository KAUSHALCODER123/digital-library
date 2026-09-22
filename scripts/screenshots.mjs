// Captures documentation screenshots from a running instance (default http://localhost:3000).
// Usage: node scripts/screenshots.mjs [baseUrl]
import { chromium, devices } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const base = process.argv[2] ?? 'http://localhost:3000';
const out = 'docs/screenshots';
mkdirSync(out, { recursive: true });

const shots = [
  { name: 'home-desktop-light', path: '/', theme: 'light', device: 'desktop', fullPage: false },
  { name: 'home-desktop-dark', path: '/', theme: 'dark', device: 'desktop', fullPage: false },
  { name: 'search-desktop-light', path: '/search?q=dune', theme: 'light', device: 'desktop' },
  { name: 'detail-desktop-light', path: '/books/pride-and-prejudice--OL66554W', theme: 'light', device: 'desktop' },
  { name: 'detail-desktop-dark', path: '/books/pride-and-prejudice--OL66554W', theme: 'dark', device: 'desktop' },
  { name: 'reader-desktop-sepia', path: '/read/pride-and-prejudice--pg-1342', theme: 'light', device: 'desktop', reader: 'sepia' },
  { name: 'genres-desktop-light', path: '/genres', theme: 'light', device: 'desktop' },
  { name: 'shelf-desktop-light', path: '/shelf', theme: 'light', device: 'desktop', seedShelf: true },
  { name: 'home-mobile-light', path: '/', theme: 'light', device: 'mobile' },
  { name: 'search-mobile-dark', path: '/search?q=dune', theme: 'dark', device: 'mobile' },
  { name: 'detail-mobile-light', path: '/books/pride-and-prejudice--OL66554W', theme: 'light', device: 'mobile' },
  { name: 'reader-mobile-dark', path: '/read/pride-and-prejudice--pg-1342', theme: 'dark', device: 'mobile', reader: 'dark' },
];

const shelfSeed = {
  state: {
    items: {
      'ol:OL66554W': {
        bookId: 'ol:OL66554W',
        book: { id: 'ol:OL66554W', title: 'Pride and Prejudice', authors: ['Jane Austen'], pageCount: 432 },
        status: 'READING', favorite: true, progress: 0.42,
        addedAt: '2026-09-01T10:00:00.000Z', updatedAt: '2026-09-21T10:00:00.000Z', finishedAt: null,
      },
      'ol:OL893414W': {
        bookId: 'ol:OL893414W',
        book: { id: 'ol:OL893414W', title: 'Dune', authors: ['Frank Herbert'], pageCount: 688, coverUrl: 'https://covers.openlibrary.org/b/id/11481354-L.jpg' },
        status: 'READING', favorite: false, progress: 0.18,
        addedAt: '2026-09-10T10:00:00.000Z', updatedAt: '2026-09-20T10:00:00.000Z', finishedAt: null,
      },
    },
  },
  version: 1,
};

const browser = await chromium.launch();
for (const s of shots) {
  const context = await browser.newContext(
    s.device === 'mobile' ? { ...devices['iPhone 13'], defaultBrowserType: undefined } : { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
  );
  await context.addInitScript(
    ({ theme, reader, seed }) => {
      localStorage.setItem('bib-theme', theme);
      if (reader) localStorage.setItem('bib-reader-prefs', JSON.stringify({ state: { theme: reader }, version: 1 }));
      if (seed) localStorage.setItem('bib-shelf', JSON.stringify(seed));
    },
    { theme: s.theme, reader: s.reader, seed: s.seedShelf ? shelfSeed : null },
  );
  const page = await context.newPage();
  try {
    await page.goto(base + s.path, { waitUntil: 'load', timeout: 90_000 });
    if (s.path.startsWith('/read/')) await page.locator('[data-ready="true"]').waitFor({ timeout: 60_000 });
    await page.waitForTimeout(4000); // let streamed shelves and covers arrive
    await page.screenshot({ path: `${out}/${s.name}.png`, fullPage: s.fullPage ?? false });
    console.log('saved', s.name);
  } catch (err) {
    console.error('failed', s.name, err.message);
  }
  await context.close();
}
await browser.close();
