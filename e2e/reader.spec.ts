import { expect, test } from './test';
import { blockThirdParties, FRANKENSTEIN_READER } from './helpers';

test.describe('reader', () => {
  test('pages through a public-domain book and remembers the place', async ({ page }) => {
    await page.goto(FRANKENSTEIN_READER);
    const content = page.getByTestId('reader-content');
    await expect(content).toHaveAttribute('data-ready', 'true');
    await expect(content).toContainText('You will rejoice to hear');
    await expect(content).not.toContainText('START OF THE PROJECT GUTENBERG');
    await expect(page.getByTestId('reader-page')).toHaveText(/Page 1 of \d+/);
    // Precise position (the visible percentage rounds, and small screens have many pages).
    const value = async () => Number(await content.getAttribute('data-progress'));
    expect(await value()).toBe(0);
    await expect(page.getByRole('button', { name: 'Previous page' })).toBeDisabled();

    // Page counts depend on screen size, so assert on movement through the book instead.
    await page.getByRole('button', { name: 'Next page' }).click();
    await expect.poll(value).toBeGreaterThan(0);
    const afterOne = await value();
    await expect(content).toHaveAttribute('data-ready', 'true');
    await page.keyboard.press('ArrowRight');
    await expect.poll(value).toBeGreaterThan(afterOne);
    await expect(content).toHaveAttribute('data-ready', 'true');
    await page.keyboard.press('ArrowLeft');
    await expect.poll(value).toBe(afterOne);

    // Move into a later chapter, then reload.
    for (let i = 0; i < 12; i++) {
      await page.keyboard.press('ArrowRight');
      await expect(content).toHaveAttribute('data-ready', 'true');
    }
    const before = await page.getByRole('progressbar', { name: 'Progress through the book' }).getAttribute('aria-valuenow');
    expect(await value()).toBeGreaterThan(0);
    await page.waitForTimeout(300);
    await page.reload();
    await expect(page.getByTestId('reader-content')).toHaveAttribute('data-ready', 'true');
    await expect(page.getByRole('progressbar', { name: 'Progress through the book' })).toHaveAttribute('aria-valuenow', before!);
  });

  test('changes theme, typeface and size', async ({ page }) => {
    await page.goto(FRANKENSTEIN_READER);
    await expect(page.getByTestId('reader-content')).toContainText('You will rejoice');
    await page.getByRole('button', { name: 'Reading settings' }).click();
    await page.getByRole('radio', { name: 'Sepia' }).click();
    await expect(page.locator('[data-reader-theme="sepia"]')).toBeVisible();
    await page.getByRole('radio', { name: 'Sans serif' }).click();
    await expect(page.getByTestId('reader-content')).toHaveClass(/font-sans/);
    const before = await page.getByTestId('reader-content').evaluate((el) => getComputedStyle(el).fontSize);
    await page.getByRole('button', { name: 'Larger text' }).click();
    const after = await page.getByTestId('reader-content').evaluate((el) => getComputedStyle(el).fontSize);
    expect(parseFloat(after)).toBeGreaterThan(parseFloat(before));
    await page.keyboard.press('Escape');
    await page.reload();
    await expect(page.locator('[data-reader-theme="sepia"]')).toBeVisible();
  });

  test('marks a book as read from the reader', async ({ page }) => {
    await page.goto(FRANKENSTEIN_READER);
    await page.getByRole('button', { name: 'Mark as read' }).click();
    await expect(page.getByText('Marked as read')).toBeVisible();
    await page.goto('/shelf?tab=READ');
    await expect(page.getByRole('tabpanel').getByRole('link', { name: 'Frankenstein' })).toBeVisible();
  });

  test('fits the dynamic viewport so controls are never cut off', async ({ page }) => {
    await page.goto(FRANKENSTEIN_READER);
    const next = page.getByRole('button', { name: 'Next page' });
    await expect(next).toBeInViewport();
    await expect(page.getByRole('link', { name: /Book details/ })).toBeInViewport();
  });

  test('embeds the Internet Archive reader with exit and new-tab controls', async ({ page }) => {
    await blockThirdParties(page);
    await page.goto('/read/pride-and-prejudice--OL66554W');
    const frame = page.locator('iframe[title*="Internet Archive reader"]');
    await expect(frame).toHaveAttribute('src', 'https://archive.org/embed/prideprejudice00austuoft');
    await expect(page.getByRole('link', { name: /Open on archive\.org/ })).toHaveAttribute('target', '_blank');
    await page.getByRole('link', { name: /Book details/ }).click();
    await expect(page).toHaveURL(/\/books\/pride-and-prejudice--OL66554W/);
  });

  test('falls back to a Google Books link when the preview can’t be embedded', async ({ page }) => {
    await blockThirdParties(page, { googleViewer: 'fail' });
    await page.goto('/read/the-hobbit--g-mockHobbit01');
    await expect(page.getByRole('heading', { name: 'This preview can’t be shown here' })).toBeVisible();
    await expect(page.getByRole('link', { name: /Continue reading on Google Books/ })).toHaveAttribute('href', /books\.google\.com/);
  });

  test('refuses to open books without a legal full text or preview', async ({ page }) => {
    await page.goto('/read/dune--g-mockDune0001');
    await expect(page.getByRole('heading', { name: 'This book can’t be read here' })).toBeVisible();
    await expect(page.getByRole('link', { name: /library near you/ })).toBeVisible();
  });
});
