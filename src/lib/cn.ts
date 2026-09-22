import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

// Teach tailwind-merge our custom type scale so `text-ui` and `text-ink` aren't treated as the same group.
const twMerge = extendTailwindMerge({
  extend: {
    theme: { text: ['caption', 'ui', 'body', 'lead', 'h3', 'h2', 'h1', 'display'] },
  },
});

/** Joins classes; later classes win over conflicting earlier ones (e.g. `px-5` then `px-0`). */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
