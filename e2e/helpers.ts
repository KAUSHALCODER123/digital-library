import { expect, type Page } from '@playwright/test';

export const HOBBIT = '/books/the-hobbit--g-mockHobbit01';
export const FRANKENSTEIN_READER = '/read/frankenstein--pg-84';

/** Browser-side third parties (IA iframe, Google viewer) are stubbed so tests stay offline. */
export async function blockThirdParties(page: Page, opts: { googleViewer?: 'fail' } = {}) {
  await page.route(/archive\.org/, (route) =>
    route.fulfill({ status: 200, contentType: 'text/html', body: '<html><body>Internet Archive reader</body></html>' }),
  );
  await page.route(/google\.com\/books\/jsapi\.js/, (route) =>
    opts.googleViewer === 'fail' ? route.abort() : route.fulfill({ status: 200, contentType: 'text/javascript', body: '' }),
  );
}

/** Missing metadata must never leak into the UI as placeholder words. */
export async function expectNoPlaceholderText(page: Page) {
  const text = await page.locator('main').innerText();
  expect(text).not.toMatch(/\bundefined\b|\bNaN\b|\[object Object\]|\bnull\b/);
}

export async function clearStorage(page: Page) {
  await page.goto('/');
  await page.evaluate(() => window.localStorage.clear());
}

/** Wait until client JavaScript has taken over the search box. */
export async function searchReady(page: Page) {
  await expect(page.locator('form[role="search"][data-hydrated="true"]').first()).toBeAttached();
}
