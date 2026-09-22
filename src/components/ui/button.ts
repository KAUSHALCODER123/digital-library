import { cn } from '@/lib/cn';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'quiet';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-forest text-on-forest hover:bg-forest-hover shadow-[0_1px_0_rgb(0_0_0/0.12)]',
  secondary: 'border border-rule-strong bg-paper-raised text-ink hover:border-ink-muted hover:bg-paper',
  ghost: 'text-ink hover:bg-ink/[0.06]',
  quiet: 'text-ink-muted hover:text-ink hover:bg-ink/[0.05]',
  danger: 'bg-danger text-paper hover:opacity-90',
};

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-caption gap-1.5',
  md: 'h-10 px-4 text-ui gap-2',
  lg: 'h-12 px-5 text-ui gap-2',
  icon: 'h-10 w-10 justify-center',
};

/** Shared by <button>, <a> and <Link> so every action looks the same. */
export function buttonClasses(variant: ButtonVariant = 'primary', size: ButtonSize = 'md', extra?: string): string {
  return cn(
    'inline-flex shrink-0 items-center justify-center rounded-sm font-semibold whitespace-nowrap transition-colors',
    'disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50',
    VARIANTS[variant],
    SIZES[size],
    extra,
  );
}
