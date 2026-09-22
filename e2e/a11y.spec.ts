import AxeBuilder from '@axe-core/playwright';
import { expect, test } from './test';
import { FRANKENSTEIN_READER, HOBBIT, searchReady } from './helpers';

const PAGES = ['/', '/search?q=field+notes', HOBBIT, '/shelf', '/genres', '/genres/science', '/authors/Ada%20Marlow', '/login', '/nope-not-here'];

for (const theme of ['light', 'dark'] as const) {
  test.describe(`accessibility (${theme})`, () => {
    test.beforeEach(async ({ page }) => {
      await page.addInitScript((t) => window.localStorage.setItem('bib-theme', t), theme);
    });

    for (const path of PAGES) {
      test(`no serious violations on ${path}`, async ({ page }) => {
        await page.goto(path);
        await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
        await page.waitForLoadState('load');
        await page.waitForTimeout(500);
        const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
        const serious = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
        expect(serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).slice(0, 3).join(', ')}`)).toEqual([]);
      });
    }
  });
}

test('reader themes meet contrast requirements', async ({ page }) => {
  for (const t of ['light', 'sepia', 'dark']) {
    await page.addInitScript((theme) => window.localStorage.setItem('bib-reader-prefs', JSON.stringify({ state: { theme }, version: 1 })), t);
    await page.goto(FRANKENSTEIN_READER);
    await expect(page.getByTestId('reader-content')).toHaveAttribute('data-ready', 'true');
    await page.waitForTimeout(400); // let the fade-in finish before sampling colors
    const results = await new AxeBuilder({ page }).withRules(['color-contrast']).analyze();
    expect(results.violations, `theme ${t}`).toEqual([]);
  }
});

test.describe('keyboard', () => {
  test('skip link, search and shelf work without a mouse', async ({ page, isMobile }) => {
    test.skip(isMobile, 'Keyboard flow is a desktop concern.');
    await page.goto('/');
    await searchReady(page);
    await page.keyboard.press('Tab');
    const skip = page.getByRole('link', { name: 'Skip to content' });
    await expect(skip).toBeFocused();
    await page.keyboard.press('Enter');
    await page.getByRole('combobox', { name: 'Search the catalog' }).focus();
    await page.keyboard.type('hobbit');
    await expect(page.getByRole('option').first()).toBeVisible();
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/the-hobbit/);

    const shelfButton = page.getByRole('button', { name: 'Add to shelf' });
    await shelfButton.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('menu')).toBeVisible();
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await expect(page.getByRole('button', { name: /Want to read|Currently reading/ }).first()).toBeVisible();
  });
});
