export type ThemePreference = 'light' | 'dark' | 'system';
export const THEME_KEY = 'bib-theme';

/** Inline, pre-paint: resolves the stored preference onto <html data-theme>. */
export const themeScript = `(function(){try{var t=localStorage.getItem('${THEME_KEY}');var d=t==='dark'||((t!=='light')&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.setAttribute('data-theme',d?'dark':'light');}catch(e){document.documentElement.setAttribute('data-theme','light');}})();`;

export function resolveTheme(pref: ThemePreference): 'light' | 'dark' {
  if (pref !== 'system') return pref;
  return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}
