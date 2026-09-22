import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchJson, resetBreakers, UpstreamError } from './http';

describe('fetchJson', () => {
  beforeEach(() => resetBreakers());
  afterEach(() => vi.unstubAllGlobals());

  it('maps HTTP statuses to typed errors', async () => {
    for (const [status, kind] of [
      [404, 'not-found'],
      [429, 'rate-limited'],
      [403, 'rate-limited'],
      [500, 'upstream'],
    ] as const) {
      resetBreakers();
      vi.stubGlobal('fetch', vi.fn(async () => new Response('x', { status })));
      await expect(fetchJson(`https://a${status}.example/x`)).rejects.toMatchObject({ kind });
    }
  });

  it('times out slow requests', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((_url: string, init: RequestInit) => new Promise((_, reject) => init.signal?.addEventListener('abort', () => reject(new Error('aborted'))))),
    );
    await expect(fetchJson('https://slow.example/x', { timeoutMs: 20 })).rejects.toMatchObject({ kind: 'timeout' });
  });

  it('never leaks the API key into error messages', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('x', { status: 500 })));
    const err = await fetchJson('https://k.example/v?q=a&key=SECRET123').catch((e: unknown) => e);
    expect(err).toBeInstanceOf(UpstreamError);
    expect((err as Error).message).not.toContain('SECRET123');
  });

  it('fails fast after a rate limit, then recovers after reset', async () => {
    const fetchMock = vi.fn(async () => new Response('x', { status: 429 }));
    vi.stubGlobal('fetch', fetchMock);
    await expect(fetchJson('https://rl.example/1')).rejects.toMatchObject({ kind: 'rate-limited' });
    await expect(fetchJson('https://rl.example/2')).rejects.toMatchObject({ kind: 'rate-limited' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    resetBreakers();
    fetchMock.mockImplementation(async () => Response.json({ ok: true }));
    await expect(fetchJson('https://rl.example/3')).resolves.toEqual({ ok: true });
  });

  it('tolerates a single timeout without opening the breaker', async () => {
    let call = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn((_url: string, init: RequestInit) => {
        call++;
        if (call === 1) return new Promise((_, reject) => init.signal?.addEventListener('abort', () => reject(new Error('aborted'))));
        return Promise.resolve(Response.json({ ok: true }));
      }),
    );
    await expect(fetchJson('https://t.example/1', { timeoutMs: 10 })).rejects.toMatchObject({ kind: 'timeout' });
    await expect(fetchJson('https://t.example/2')).resolves.toEqual({ ok: true });
  });

  it('rejects invalid JSON as an upstream error', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('<html>', { status: 200 })));
    await expect(fetchJson('https://bad.example/x')).rejects.toMatchObject({ kind: 'upstream' });
  });
});
