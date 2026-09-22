import { describe, expect, it } from 'vitest';
import { authErrorMessage, safeNext } from './redirect';

describe('safeNext', () => {
  it('allows same-site paths', () => {
    expect(safeNext('/shelf')).toBe('/shelf');
    expect(safeNext('/books/dune--OL893414W?x=1')).toBe('/books/dune--OL893414W?x=1');
    expect(safeNext(encodeURIComponent('/search?q=a b'))).toBe('/search?q=a b');
  });

  it('rejects anything that could leave the site', () => {
    const bad = [
      'https://evil.com',
      '//evil.com',
      '/\\evil.com',
      'javascript:alert(1)',
      '/%2F%2Fevil.com',
      'evil.com',
      '/\u0000x',
      '%E0%A4%A',
    ];
    for (const b of bad) expect(safeNext(b)).toBe('/');
  });

  it('never bounces back into auth handlers', () => {
    expect(safeNext('/auth/callback')).toBe('/');
    expect(safeNext('/auth/update-password')).toBe('/auth/update-password');
  });

  it('uses the fallback for empty input', () => {
    expect(safeNext(null, '/account')).toBe('/account');
    expect(safeNext('', '/x')).toBe('/x');
  });
});

describe('authErrorMessage', () => {
  it('maps known Supabase errors to plain language', () => {
    expect(authErrorMessage({ code: 'invalid_credentials' })).toMatch(/don’t match/);
    expect(authErrorMessage({ message: 'Email not confirmed' })).toMatch(/Confirm your email/);
    expect(authErrorMessage({ status: 429 })).toMatch(/Too many attempts/);
    expect(authErrorMessage({ message: 'Unsupported provider: provider is not enabled' })).toMatch(/Google sign-in/);
    expect(authErrorMessage(null)).toMatch(/Something went wrong/);
  });
});
