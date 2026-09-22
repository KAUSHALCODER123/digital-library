import { expect, test } from './test';
import { expectNoPlaceholderText, searchReady } from './helpers';

test.describe('search', () => {
  test('suggests books while typing and opens the results page', async ({ page }) => {
    await page.goto('/');
    await searchReady(page);
    const box = page.getByRole('combobox', { name: 'Search the catalog' });
    await box.fill('field notes');
    const list = page.getByRole('listbox', { name: 'Suggestions' });
    await expect(list.getByRole('option').first()).toContainText('Field Notes on Northern Birds');
    await box.press('Enter');
    await expect(page).toHaveURL(/\/search\?q=field\+notes/);
    await expect(page.getByText(/45 results for/)).toBeVisible();
    await expect(page.getByRole('list', { name: 'Search results' }).getByRole('article')).toHaveCount(20);
    await expectNoPlaceholderText(page);
  });

  test('picks a suggestion with the keyboard', async ({ page }) => {
    await page.goto('/');
    await searchReady(page);
    const box = page.getByRole('combobox', { name: 'Search the catalog' });
    await box.fill('hobbit');
    await expect(page.getByRole('option').first()).toContainText('The Hobbit');
    await box.press('ArrowDown');
    await box.press('Enter');
    await expect(page).toHaveURL(/\/books\/the-hobbit--g-mockHobbit01/);
  });

  test('paginates with shareable URLs', async ({ page }) => {
    await page.goto('/search?q=field+notes');
    const nav = page.getByRole('navigation', { name: 'Pages' });
    await nav.getByRole('link', { name: 'Page 2' }).click();
    await expect(page).toHaveURL(/page=2/);
    await expect(page.getByText(/page 2/)).toBeVisible();
    await page.reload();
    await expect(nav.getByRole('link', { name: 'Page 2' })).toHaveAttribute('aria-current', 'page');
    await nav.getByRole('link', { name: 'Page 3' }).click();
    await expect(page.getByRole('list', { name: 'Search results' }).getByRole('article')).toHaveCount(5);
    await expect(nav.getByRole('link', { name: 'Next' })).toHaveCount(0);
  });

  test('sorts and filters', async ({ page }) => {
    await page.goto('/search?q=field+notes&sort=newest');
    await expect(page.getByRole('article').first()).toContainText('Volume 45');
    await page.goto('/search?q=field+notes&sort=title');
    await expect(page.getByRole('article').first()).toContainText('Volume 1');
    await page.goto('/search?q=field+notes&minRating=4');
    await expect(page.getByText(/results for/)).toContainText('22');
    await page.goto('/search?q=field+notes&yearFrom=2000&yearTo=1990');
    // A reversed range is swapped, not rejected.
    await expect(page.getByText(/results for/)).toContainText('11');
  });

  test('filters from the sidebar update the URL', async ({ page, isMobile }) => {
    test.skip(isMobile, 'Mobile uses the bottom sheet; covered separately.');
    await page.goto('/search?q=field+notes');
    await page.getByRole('radio', { name: '4 stars and up' }).check({ force: true });
    await expect(page).toHaveURL(/minRating=4/);
    await page.getByRole('link', { name: 'Clear all' }).click();
    await expect(page).not.toHaveURL(/minRating/);
  });

  test('filters open in a bottom sheet on small screens', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'Desktop uses the sidebar.');
    await page.goto('/search?q=field+notes');
    await page.getByRole('button', { name: 'Filters' }).click();
    const sheet = page.getByRole('dialog', { name: 'Refine results' });
    await expect(sheet).toBeVisible();
    await sheet.getByText('4 stars and up').click();
    await sheet.getByRole('button', { name: 'Show results' }).click();
    await expect(page).toHaveURL(/minRating=4/);
    await expect(page.getByRole('button', { name: /Filters.*1.*active/ })).toBeVisible();
  });

  test('types-ahead on the results page without losing focus', async ({ page }) => {
    await page.goto('/search?q=field');
    await searchReady(page);
    const box = page.getByRole('searchbox', { name: 'Search the catalog' });
    await box.fill('hobbit');
    await expect(page).toHaveURL(/q=hobbit/);
    await expect(box).toBeFocused();
    await expect(page.getByRole('article').first()).toContainText('The Hobbit');
  });

  test('continuous scroll loads more results as you scroll', async ({ page }) => {
    await page.goto('/search?q=field+notes&view=scroll');
    const items = page.getByRole('list', { name: 'Search results' }).getByRole('article');
    await expect(items).toHaveCount(20);
    const scroll = () => page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await scroll();
    await expect.poll(() => items.count()).toBeGreaterThanOrEqual(40);
    await scroll();
    await expect(items).toHaveCount(45);
    await expect(page.getByText('You’ve reached the end of the results.')).toBeVisible();
  });

  test('the Load more button works without automatic loading', async ({ page }) => {
    // Browsers without IntersectionObserver (and keyboard users) rely on the button.
    await page.addInitScript(() => {
      // @ts-expect-error removing the API on purpose
      delete window.IntersectionObserver;
    });
    await page.goto('/search?q=field+notes&view=scroll');
    const items = page.getByRole('list', { name: 'Search results' }).getByRole('article');
    await expect(items).toHaveCount(20);
    await page.getByRole('button', { name: 'Load more' }).click();
    await expect(items).toHaveCount(40);
    await expect(page.getByText('20 more books loaded.')).toBeAttached();
  });

  test('ISBN searches go straight to the book', async ({ page }) => {
    await page.goto('/search?q=978-0-547-92822-7');
    await expect(page).toHaveURL(/\/books\/the-hobbit--g-mockHobbit01/);
  });

  test('shows friendly states for empty, symbol-only and unknown searches', async ({ page }) => {
    await page.goto('/search?q=%F0%9F%99%82%F0%9F%99%82');
    await expect(page.getByRole('heading', { name: 'That search has no letters or numbers' })).toBeVisible();
    await page.goto('/search?q=zzqqxxunfindable');
    await expect(page.getByRole('heading', { name: 'We couldn’t find that title' })).toBeVisible();
    await page.goto('/search');
    await expect(page.getByRole('heading', { name: 'Start with a genre' })).toBeVisible();
  });

  test('explains outages and offers a retry', async ({ page }) => {
    await page.goto('/search?q=__fail__');
    await expect(page.getByRole('alert').filter({ hasText: 'The catalog didn’t respond' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Try again' })).toBeVisible();
  });

  test('says when one source is missing', async ({ page }) => {
    await page.goto('/search?q=__partial__');
    await expect(page.getByRole('status').filter({ hasText: 'Google Books didn’t respond' })).toBeVisible();
  });

  test('keeps non-Latin titles readable and marked with their language', async ({ page }) => {
    await page.goto('/search?q=%D9%83%D8%AA%D8%A7%D8%A8');
    const card = page.getByRole('article').first();
    await expect(card).toHaveAttribute('lang', 'ar');
    await expect(card).toHaveAttribute('dir', 'rtl');
  });
});
