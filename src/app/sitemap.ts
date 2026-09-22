import type { MetadataRoute } from 'next';
import { GENRES } from '@/lib/genres';
import { siteUrl } from '@/lib/seo';

/** Static entry points; book pages are discovered through links and their own canonical URLs. */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  const now = new Date();
  return [
    { url: `${base}/`, lastModified: now, changeFrequency: 'daily', priority: 1 },
    { url: `${base}/genres`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    ...GENRES.map((g) => ({ url: `${base}/genres/${g.slug}`, lastModified: now, changeFrequency: 'daily' as const, priority: 0.7 })),
  ];
}
