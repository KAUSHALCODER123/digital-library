import type { Contributor, ContributorRole } from './types';

const ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  mdash: '—',
  ndash: '–',
  hellip: '…',
  rsquo: '’',
  lsquo: '‘',
  rdquo: '”',
  ldquo: '“',
};

export function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, code: string) => {
    if (code[0] === '#') {
      const n = code[1] === 'x' || code[1] === 'X' ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isFinite(n) && n > 0 && n < 0x110000 ? String.fromCodePoint(n) : m;
    }
    return ENTITIES[code.toLowerCase()] ?? m;
  });
}

/**
 * Upstream descriptions arrive as HTML (Google) or Markdown-ish text (Open Library).
 * We never render upstream HTML; this turns it into plain paragraphs separated by blank lines.
 */
export function toPlainText(raw: unknown): string | undefined {
  if (typeof raw !== 'string') {
    if (raw && typeof raw === 'object' && 'value' in raw && typeof (raw as { value: unknown }).value === 'string') {
      return toPlainText((raw as { value: string }).value);
    }
    return undefined;
  }
  const text = decodeEntities(
    raw
      .replace(/<\s*br\s*\/?>/gi, '\n')
      .replace(/<\/\s*(p|div|li|h[1-6])\s*>/gi, '\n\n')
      .replace(/<[^>]*>/g, ''),
  )
    // Open Library markdown links: [text](url) -> text
    .replace(/\[([^\]]+)\]\((?:https?:\/\/|\/)[^)]*\)/g, '$1')
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n /g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return text.length > 0 ? text : undefined;
}

export function cleanString(s: unknown): string | undefined {
  if (typeof s !== 'string') return undefined;
  const t = s.replace(/\s+/g, ' ').trim();
  return t.length ? t : undefined;
}

export function httpsify(url: string | undefined | null): string | undefined {
  if (!url) return undefined;
  const u = url.trim().replace(/^http:\/\//i, 'https://');
  return /^https:\/\//i.test(u) ? u : undefined;
}

export function parseYear(raw: unknown): number | undefined {
  if (typeof raw === 'number') return raw > 0 && raw <= new Date().getFullYear() + 2 ? raw : undefined;
  if (typeof raw !== 'string') return undefined;
  const m = raw.match(/(\d{4})/);
  if (!m) return undefined;
  const y = Number(m[1]);
  return y > 0 && y <= new Date().getFullYear() + 2 ? y : undefined;
}

export function positiveInt(raw: unknown): number | undefined {
  const n = typeof raw === 'string' ? Number(raw) : raw;
  return typeof n === 'number' && Number.isFinite(n) && n > 0 ? Math.round(n) : undefined;
}

export function rating(raw: unknown): number | undefined {
  const n = typeof raw === 'number' ? raw : undefined;
  if (n === undefined || !Number.isFinite(n) || n <= 0) return undefined;
  return Math.min(5, Math.round(n * 10) / 10);
}

const ROLE_PATTERNS: Array<[RegExp, ContributorRole]> = [
  [/\s*\((?:illustrator|illus\.?|illustrations?)\)\s*$/i, 'illustrator'],
  [/^\s*illustrated by\s+/i, 'illustrator'],
  [/\s*\((?:translator|trans\.?|tr\.)\)\s*$/i, 'translator'],
  [/^\s*translated by\s+/i, 'translator'],
  [/\s*\((?:editor|ed\.|eds\.)\)\s*$/i, 'editor'],
  [/^\s*edited by\s+/i, 'editor'],
  [/\s*\((?:narrator|reader)\)\s*$/i, 'narrator'],
  [/^\s*(?:narrated|read) by\s+/i, 'narrator'],
  [/\s*\((?:author)\)\s*$/i, 'author'],
];

/** Split raw name strings into people with roles instead of comma-joining everyone as "author". */
export function parseContributors(names: unknown[]): Contributor[] {
  const out: Contributor[] = [];
  const seen = new Set<string>();
  for (const raw of names) {
    let name = cleanString(raw);
    if (!name) continue;
    let role: ContributorRole = 'author';
    for (const [re, r] of ROLE_PATTERNS) {
      if (re.test(name)) {
        role = r;
        name = name.replace(re, '').trim();
        break;
      }
    }
    if (!name) continue;
    const key = `${role}:${name.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ name, role });
  }
  return out;
}

/** Gutenberg stores names as "Austen, Jane"; show them as "Jane Austen". */
export function flipName(name: string): string {
  const parts = name.split(',').map((p) => p.trim());
  if (parts.length === 2 && parts[0] && parts[1] && !/\d/.test(parts[1])) return `${parts[1]} ${parts[0]}`;
  return name.trim();
}

const JUNK_SUBJECTS = [
  /^accessible book$/i,
  /^protected daisy$/i,
  /^in library$/i,
  /^lending library$/i,
  /^overdrive$/i,
  /^large type books$/i,
  /^open library/i,
  /^internet archive/i,
  /^nyt:/i,
  /^collectionid:/i,
  /^reading level/i,
  /^long now/i,
  /^general$/i,
  /^fiction, general$/i,
  /^english language$/i,
];

export function cleanCategories(raw: unknown[], limit = 8): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const r of raw) {
    const s = cleanString(r);
    if (!s) continue;
    // Google: "Fiction / Fantasy / Epic" -> ["Fiction", "Fantasy", "Epic"]
    for (const part of s.split(/\s+\/\s+/)) {
      const p = part.replace(/\s*\(.*?\)\s*$/, '').trim();
      if (!p || p.length > 48 || JUNK_SUBJECTS.some((re) => re.test(p))) continue;
      const key = p.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(p.charAt(0).toUpperCase() + p.slice(1));
      if (out.length >= limit) return out;
    }
  }
  return out;
}

/** ISO 639-1/2 codes (Google uses "en", Open Library "eng") -> two-letter code when known. */
const ISO3_TO_2: Record<string, string> = {
  eng: 'en', fre: 'fr', fra: 'fr', ger: 'de', deu: 'de', spa: 'es', ita: 'it', por: 'pt', rus: 'ru',
  jpn: 'ja', chi: 'zh', zho: 'zh', ara: 'ar', heb: 'he', hin: 'hi', kor: 'ko', dut: 'nl', nld: 'nl',
  swe: 'sv', dan: 'da', nor: 'no', fin: 'fi', pol: 'pl', tur: 'tr', gre: 'el', ell: 'el', lat: 'la',
  per: 'fa', fas: 'fa', urd: 'ur', ben: 'bn', tam: 'ta', mar: 'mr', ukr: 'uk', cze: 'cs', ces: 'cs',
};

export function languageCode(raw: unknown): string | undefined {
  const s = cleanString(raw)?.toLowerCase();
  if (!s) return undefined;
  if (/^[a-z]{2}$/.test(s)) return s;
  if (/^[a-z]{2}-[a-z]{2,4}$/.test(s)) return s.slice(0, 2);
  return ISO3_TO_2[s];
}

const RTL = new Set(['ar', 'he', 'fa', 'ur', 'yi', 'ps', 'sd', 'ug', 'dv']);
export function isRtl(lang: string | undefined): boolean {
  return !!lang && RTL.has(lang);
}

export function languageName(code: string | undefined): string | undefined {
  if (!code) return undefined;
  try {
    return new Intl.DisplayNames(['en'], { type: 'language' }).of(code) ?? code;
  } catch {
    return code;
  }
}

export function uniqueStrings(values: Array<string | undefined>): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of values) {
    const s = v?.trim();
    if (!s) continue;
    const k = s.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(s);
  }
  return out;
}

/** Key used to match the same work across sources when there is no ISBN. */
export function titleAuthorKey(title: string, author: string | undefined): string {
  const norm = (s: string) =>
    s
      .normalize('NFKD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/^(the|a|an)\s+/, '')
      .replace(/[^\p{L}\p{N}]+/gu, ' ')
      .trim();
  // Subtitles vary between sources ("Dune" vs "Dune: Deluxe Edition"); compare main titles.
  const main = title.split(/[:(;]/)[0] ?? title;
  const surname = author ? norm(author).split(' ').pop() ?? '' : '';
  return `${norm(main)}|${surname}`;
}
