import { expect, test } from './test';
import { HOBBIT } from './helpers';

test.describe('shelf (guest)', () => {
  test('adds a book from search results without leaving the page', async ({ page }) => {
    await page.goto('/search?q=dune');
    const card = page.getByRole('article').filter({ hasText: 'Dune' }).first();
    await card.getByRole('button', { name: 'Add Dune to your shelf' }).click();
    await page.getByRole('menuitemradio', { name: 'Want to read' }).click();
    await expect(page.getByText('Added to Want to read')).toBeVisible();
    await expect(page).toHaveURL(/\/search\?q=dune/);
    await expect(card.getByRole('button', { name: /On your shelf: Want to read/ })).toBeVisible();
  });

  test('moves books between shelves, favorites and removes them, and persists across reloads', async ({ page }) => {
    await page.goto(HOBBIT);
    await page.getByRole('button', { name: 'Add to shelf' }).click();
    await page.getByRole('menuitemradio', { name: 'Currently reading' }).click();
    await page.getByRole('button', { name: 'Add The Hobbit to favorites' }).click();

    await page.goto('/shelf?tab=READING');
    const reading = page.getByRole('tabpanel');
    await expect(reading.getByRole('link', { name: 'The Hobbit' })).toBeVisible();
    await expect(page.getByRole('tab', { name: /Favorites/ })).toContainText('1');

    await reading.getByLabel('Shelf for The Hobbit').selectOption('READ');
    await page.getByRole('tab', { name: /^Read/ }).click();
    await expect(page.getByRole('tabpanel').getByRole('link', { name: 'The Hobbit' })).toBeVisible();
    await expect(page.getByText(/Finished/)).toBeVisible();

    await page.reload();
    await page.getByRole('tab', { name: /^Read/ }).click();
    await expect(page.getByRole('tabpanel').getByRole('link', { name: 'The Hobbit' })).toBeVisible();

    await page.getByRole('tabpanel').getByRole('button', { name: 'Remove The Hobbit', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Nothing here yet' })).toBeVisible();
    // Removing from the reading shelf leaves nothing behind in favorites either.
    await page.getByRole('tab', { name: /Favorites/ }).click();
    await expect(page.getByRole('heading', { name: 'Nothing here yet' })).toBeVisible();
  });

  test('keeps two open tabs in sync without duplicates', async ({ context }) => {
    const a = await context.newPage();
    const b = await context.newPage();
    await a.goto(HOBBIT);
    await b.goto('/shelf');
    await expect(b.getByRole('heading', { name: 'Nothing here yet' })).toBeVisible();
    await a.getByRole('button', { name: 'Add to shelf' }).click();
    await a.getByRole('menuitemradio', { name: 'Want to read' }).click();
    await expect(b.getByRole('tabpanel').getByRole('link', { name: 'The Hobbit' })).toHaveCount(1);
    // Writing from the second tab too: last write wins, still one entry.
    await b.getByLabel('Shelf for The Hobbit').selectOption('READING');
    await a.goto('/shelf?tab=READING');
    await expect(a.getByRole('tabpanel').getByRole('link', { name: 'The Hobbit' })).toHaveCount(1);
  });

  test('shows reading stats', async ({ page }) => {
    await page.goto(HOBBIT);
    await page.getByRole('button', { name: 'Add to shelf' }).click();
    await page.getByRole('menuitemradio', { name: 'Read', exact: true }).click();
    await page.goto('/shelf');
    const stats = page.locator('dl').first();
    await expect(stats.getByText(`Read in ${new Date().getFullYear()}`)).toBeVisible();
    await expect(stats).toContainText('300'); // The Hobbit's page count
  });
});
