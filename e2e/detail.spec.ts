import { expect, test } from './test';
import { expectNoPlaceholderText, HOBBIT } from './helpers';

test.describe('book detail', () => {
  test('shows full metadata, description, editions and similar books', async ({ page }) => {
    await page.goto(HOBBIT);
    await expect(page).toHaveTitle(/The Hobbit by J\. R\. R\. Tolkien \| Bibliotheca/);
    await expect(page.getByRole('heading', { level: 1, name: 'The Hobbit' })).toBeVisible();
    await expect(page.getByText('Or There and Back Again')).toBeVisible();
    await expect(page.getByRole('link', { name: 'J. R. R. Tolkien' }).first()).toHaveAttribute('href', /\/authors\/J\.%20R\.%20R\.%20Tolkien/);
    await expect(page.getByRole('definition').filter({ hasText: '9780547928227' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Read a preview' })).toBeVisible();

    const readMore = page.getByRole('button', { name: 'Read more' });
    await expect(readMore).toHaveAttribute('aria-expanded', 'false');
    await readMore.click();
    await expect(page.getByRole('button', { name: 'Show less' })).toHaveAttribute('aria-expanded', 'true');

    const editions = page.getByRole('table');
    await expect(editions.getByRole('row')).toHaveCount(4); // header + 3 editions
    await expect(page.getByRole('heading', { name: 'More like this' })).toBeVisible();
    await expectNoPlaceholderText(page);
  });

  test('publishes structured data and a meta description from the book', async ({ page }) => {
    await page.goto(HOBBIT);
    const ld = JSON.parse((await page.locator('script[type="application/ld+json"]').first().textContent()) ?? '{}');
    expect(ld).toMatchObject({ '@type': 'Book', name: 'The Hobbit', isbn: '9780547928227' });
    expect(ld.author[0].name).toBe('J. R. R. Tolkien');
    await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /In a hole in the ground/);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /\/books\/the-hobbit--g-mockHobbit01$/);
  });

  test('redirects edited slugs to the canonical URL and 404s unknown books', async ({ page }) => {
    await page.goto('/books/some-other-words--g-mockHobbit01');
    await expect(page).toHaveURL(new RegExp(`${HOBBIT}$`));
    const res = await page.goto('/books/nothing--g-doesnotexist1');
    expect(res?.status()).toBe(404);
    await expect(page.getByRole('heading', { name: 'This page isn’t in the catalog' })).toBeVisible();
    const bad = await page.goto('/books/%%%');
    expect(bad?.status()).toBeGreaterThanOrEqual(400);
  });

  test('lists translators and illustrators separately from authors', async ({ page }) => {
    await page.goto('/books/the-little-prince--g-mockPrince01');
    await expect(page.getByText('Translated by').first()).toBeVisible();
    await expect(page.getByText('Richard Howard').first()).toBeVisible();
    await expect(page.getByText('Illustrated by').first()).toBeVisible();
  });

  test('hides sections for missing data and offers availability instead of a reader', async ({ page }) => {
    await page.goto('/books/untitled-pamphlet--g-mockBare0001');
    await expect(page.getByRole('heading', { level: 1, name: 'Untitled Pamphlet' })).toBeVisible();
    await expect(page.getByRole('link', { name: /Check availability/ })).toHaveAttribute('href', /worldcat\.org/);
    await expect(page.getByRole('link', { name: /Read now|Read a preview/ })).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Subjects' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Read more' })).toHaveCount(0);
    await expectNoPlaceholderText(page);
  });

  test('blurs mature covers until the reader chooses to see them', async ({ page }) => {
    await page.goto('/books/midnight-confessions--g-mockMature01');
    const reveal = page.getByRole('button', { name: /Show cover of Midnight Confessions/ });
    await expect(reveal).toBeVisible();
    await reveal.click();
    await expect(reveal).toHaveCount(0);
  });

  test('renders right-to-left titles in their own direction', async ({ page }) => {
    await page.goto('/books/book--OL100001W');
    const h1 = page.getByRole('heading', { level: 1 });
    await expect(h1).toHaveText('كتاب الأغاني');
    await expect(page.locator('[lang="ar"][dir="rtl"]').first()).toBeVisible();
  });

  test('keeps very long titles inside the layout', async ({ page }) => {
    await page.goto('/books/x--OL100002W'); // redirects to the canonical slug
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const width = await page.evaluate(() => window.innerWidth);
    expect(scrollWidth).toBeLessThanOrEqual(width);
  });
});
