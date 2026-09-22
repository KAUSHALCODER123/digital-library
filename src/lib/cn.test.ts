import { describe, expect, it } from 'vitest';
import { cn } from './cn';

describe('cn', () => {
  it('lets later classes override conflicting earlier ones', () => {
    expect(cn('h-12 px-5', 'w-12 px-0')).toBe('h-12 w-12 px-0');
  });
  it('keeps custom font sizes and text colors apart', () => {
    expect(cn('text-ui text-ink', 'text-caption')).toBe('text-ink text-caption');
    expect(cn('text-ink-muted', 'text-forest')).toBe('text-forest');
  });
});
