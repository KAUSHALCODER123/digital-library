import type { NextConfig } from 'next';

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()' },
];

const nextConfig: NextConfig = {
  turbopack: { root: __dirname },
  images: {
    // Only cover hosts from the book sources. Open Library covers redirect to archive.org mirrors.
    remotePatterns: [
      { protocol: 'https', hostname: 'books.google.com', pathname: '/books/**' },
      { protocol: 'https', hostname: 'books.googleusercontent.com' },
      { protocol: 'https', hostname: 'covers.openlibrary.org', pathname: '/**' },
      { protocol: 'https', hostname: '**.archive.org' },
      { protocol: 'https', hostname: 'www.gutenberg.org', pathname: '/cache/epub/**' },
    ],
    qualities: [75],
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60 * 60 * 24 * 7,
    maximumRedirects: 3,
  },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
  poweredByHeader: false,
};

export default nextConfig;
