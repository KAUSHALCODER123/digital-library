import type { NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/proxy';

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  // Skip static assets, image optimization and the public text/metadata routes.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icon|apple-icon|robots.txt|sitemap.xml|api/gutenberg|.*\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)'],
};
