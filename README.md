# Bibliotheca

A digital library catalog: search millions of books, read public-domain titles free in the browser, and keep a shelf of what you want to read next.

- **Search** Google Books and Open Library together, merged and de-duplicated (ISBN-13 → ISBN-10 → title + author).
- **Read** Project Gutenberg texts in a paginated reader (light, sepia, dark; serif or sans; adjustable size), Internet Archive scans, and Google Books previews — only when the source says the book is public domain or offers the publisher’s own preview.
- **Shelf**: Want to read, Currently reading, Read, Favorites. Works without an account; signing in syncs it across devices and merges the guest shelf.
- **Staff tools**: pin books to the home page shelves; see top searches and most-shelved books.
- Light and dark site themes, WCAG 2.1 AA checked, responsive down to 320 px.

The full project report (Word) is in [`docs/Bibliotheca_Project_Report.docx`](docs/Bibliotheca_Project_Report.docx); screenshots are in [`docs/screenshots`](docs/screenshots).

## Stack

Next.js 16 (App Router) · React 19 · TypeScript (strict) · Tailwind CSS 4 · Radix UI · Zustand · Zod · Supabase (Postgres, Auth, RLS) · Vitest · Playwright + axe-core

## Getting started

```bash
npm install
cp .env.example .env.local   # then fill in the values below
npm run db:push              # applies supabase/migrations using SUPABASE_DB_URL
npm run dev                  # http://localhost:3000
```

| Variable | Required | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | for accounts | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | for accounts | Public anon/publishable key. Without it the site runs in guest-only mode. |
| `GOOGLE_BOOKS_API_KEY` | recommended | Server-only. Anonymous Google Books requests are frequently rate-limited (HTTP 429); the app falls back to Open Library. |
| `NEXT_PUBLIC_SITE_URL` | production | Canonical URL for metadata, sitemap and auth redirects |
| `SUPABASE_DB_URL` | for `db:push` | Session-pooler connection string; used only by the CLI |

`NEXT_PUBLIC_*` values are inlined at build time, so rebuild after changing them.

### Supabase setup

1. Apply the schema: `npm run db:push`.
2. **Authentication → URL configuration**: set the Site URL and add `http://localhost:3000/auth/callback` and your production `/auth/callback` as redirect URLs.
3. Optional Google sign-in: **Authentication → Providers → Google**, and enable manual identity linking for “Connect Google” on the account page.
4. Make someone library staff:
   ```sql
   update public.profiles set role = 'staff' where id = '<user uuid>';
   ```

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build / server |
| `npm run typecheck` | TypeScript, strict |
| `npm run lint` | ESLint |
| `npm run test` | Unit tests (Vitest) |
| `npm run test:e2e` | End-to-end + accessibility tests on desktop Chrome and iPhone-sized WebKit, against a production build serving offline fixtures (`BOOKS_MOCK=1`) |
| `npm run db:push` | Apply database migrations |

## How it fits together

```
src/
  app/                 routes: home, search, books/[slug], read/[slug], shelf, genres, authors, auth, account, admin, api
  lib/books/           source clients, normalization, de-duplication, copyright gate (access.ts), filters, fixtures
  lib/shelf/           shelf store, guest→account merge, Supabase sync, stats
  lib/reader/          reader preferences and section pagination
  lib/supabase/        browser/server clients, session proxy, types
  components/          UI (books, search, shelf, reader, layout, auth, admin)
supabase/migrations/   schema, RLS policies and SQL functions
e2e/                   Playwright specs
```

Design notes:

- **Pagination** defaults to numbered pages (shareable, back-button friendly); `?view=scroll` switches to continuous scroll with a “Load more” fallback.
- **Book URLs** are `/books/{slug}--{code}` where the code is `g-<volumeId>`, `OL…W` or `pg-<n>`; edited slugs redirect to the canonical one.
- **Resilience**: every upstream call has a timeout; one failing source degrades gracefully with a notice; repeated failures trip a short per-host circuit breaker.
- **Privacy**: guests need no account; signed-in readers can export and delete their data; signing out clears the shelf from shared computers.

## Known limitations

- Result totals are source estimates; year and rating filters apply per page.
- Reading progress is tracked in the Gutenberg reader only (embedded readers don’t report it).
- No offline mode yet.
