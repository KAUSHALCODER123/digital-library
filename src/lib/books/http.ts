export type UpstreamErrorKind = 'timeout' | 'rate-limited' | 'not-found' | 'upstream' | 'network';

export class UpstreamError extends Error {
  constructor(
    public readonly kind: UpstreamErrorKind,
    public readonly url: string,
    public readonly status?: number,
  ) {
    super(`${kind}${status ? ` (${status})` : ''}: ${redact(url)}`);
    this.name = 'UpstreamError';
  }
}

/** Never let an API key end up in logs or error messages. */
function redact(url: string): string {
  return url.replace(/([?&]key=)[^&]+/, '$1***');
}

export const DEFAULT_TIMEOUT_MS = 5000;
/** Book metadata rarely changes; one hour keeps pages fresh enough. */
export const DEFAULT_REVALIDATE = 3600;

type FetchOptions = {
  timeoutMs?: number;
  revalidate?: number;
  accept?: string;
};

async function request(url: string, opts: FetchOptions): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: opts.accept ?? 'application/json',
        'User-Agent': 'Bibliotheca/1.0 (digital library catalog)',
      },
      // revalidate: 0 means "don't use the data cache" (e.g. multi-MB texts over its 2MB item limit).
      ...(opts.revalidate === 0
        ? { cache: 'no-store' as const }
        : { next: { revalidate: opts.revalidate ?? DEFAULT_REVALIDATE } }),
    });
  } catch {
    if (controller.signal.aborted) throw new UpstreamError('timeout', url);
    throw new UpstreamError('network', url, undefined);
  } finally {
    clearTimeout(timer);
  }
  if (res.status === 404) throw new UpstreamError('not-found', url, 404);
  if (res.status === 403 || res.status === 429) throw new UpstreamError('rate-limited', url, res.status);
  if (!res.ok) throw new UpstreamError('upstream', url, res.status);
  return res;
}

export async function fetchJson<T>(url: string, opts: FetchOptions = {}): Promise<T> {
  const res = await request(url, opts);
  try {
    return (await res.json()) as T;
  } catch {
    throw new UpstreamError('upstream', url, res.status);
  }
}

export async function fetchText(url: string, opts: FetchOptions = {}): Promise<string> {
  const res = await request(url, { ...opts, accept: opts.accept ?? 'text/plain' });
  return res.text();
}

export function describeError(err: unknown): string {
  if (err instanceof UpstreamError) return err.kind;
  return 'unknown';
}
