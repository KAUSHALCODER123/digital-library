'use client';

import { Monitor, Moon, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';
import { buttonClasses } from '@/components/ui/button';
import { readStorage, writeStorage } from '@/lib/storage';
import { resolveTheme, THEME_KEY, type ThemePreference } from '@/lib/theme';

const ORDER: ThemePreference[] = ['light', 'dark', 'system'];
const LABEL: Record<ThemePreference, string> = { light: 'Light', dark: 'Dark', system: 'Match system' };

function apply(pref: ThemePreference) {
  document.documentElement.setAttribute('data-theme', resolveTheme(pref));
}

export function ThemeToggle() {
  const [pref, setPref] = useState<ThemePreference | null>(null);

  useEffect(() => {
    const stored = readStorage(THEME_KEY);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reading a browser-only value after mount
    setPref(stored === 'light' || stored === 'dark' ? stored : 'system');
  }, []);

  useEffect(() => {
    if (pref !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => apply('system');
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [pref]);

  const current = pref ?? 'system';
  const next = ORDER[(ORDER.indexOf(current) + 1) % ORDER.length];
  const Icon = current === 'light' ? Sun : current === 'dark' ? Moon : Monitor;

  return (
    <button
      type="button"
      className={buttonClasses('quiet', 'icon')}
      aria-label={`Theme: ${LABEL[current]}. Switch to ${LABEL[next].toLowerCase()}.`}
      title={`Theme: ${LABEL[current]}`}
      onClick={() => {
        setPref(next);
        writeStorage(THEME_KEY, next === 'system' ? null : next);
        apply(next);
      }}
    >
      <Icon aria-hidden className="size-[18px]" strokeWidth={1.6} />
    </button>
  );
}
