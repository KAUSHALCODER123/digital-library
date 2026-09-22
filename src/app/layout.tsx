import type { Metadata, Viewport } from 'next';
import { Courier_Prime, Fraunces, Literata, Manrope } from 'next/font/google';
import { Toaster } from 'sonner';
import { InlineScript } from '@/components/InlineScript';
import { SessionSync } from '@/components/layout/SessionSync';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { siteUrl } from '@/lib/seo';
import { themeScript } from '@/lib/theme';
import './globals.css';

const fraunces = Fraunces({ subsets: ['latin'], variable: '--font-fraunces', axes: ['opsz', 'SOFT'], display: 'swap' });
const manrope = Manrope({ subsets: ['latin'], variable: '--font-manrope', display: 'swap' });
const literata = Literata({ subsets: ['latin'], variable: '--font-literata', axes: ['opsz'], display: 'swap', preload: false });
const courier = Courier_Prime({ subsets: ['latin'], weight: ['400', '700'], variable: '--font-courier', display: 'swap', preload: false });

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: 'Bibliotheca: your library’s digital catalog', template: '%s | Bibliotheca' },
  description:
    'Search millions of books, read public-domain classics free in your browser, and keep a shelf of what you want to read next.',
  applicationName: 'Bibliotheca',
  openGraph: { type: 'website', siteName: 'Bibliotheca', locale: 'en_US' },
  twitter: { card: 'summary_large_image' },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f6f1e6' },
    { media: '(prefers-color-scheme: dark)', color: '#1a1714' },
  ],
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      data-theme="light"
      suppressHydrationWarning
      className={`${fraunces.variable} ${manrope.variable} ${literata.variable} ${courier.variable}`}
    >
      <head>
        <InlineScript html={themeScript} />
      </head>
      <body className="flex min-h-dvh flex-col antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[60] focus:rounded-sm focus:bg-forest focus:px-4 focus:py-2 focus:text-on-forest"
        >
          Skip to content
        </a>
        <SiteHeader />
        <main id="main" tabIndex={-1} className="flex-1 outline-none">
          {children}
        </main>
        <SiteFooter />
        <SessionSync />
        <Toaster
          position="bottom-center"
          toastOptions={{
            classNames: {
              toast: '!rounded-sm !border-rule !bg-paper-raised !text-ink !font-sans !shadow-lg',
              description: '!text-ink-muted',
            },
          }}
        />
      </body>
    </html>
  );
}
