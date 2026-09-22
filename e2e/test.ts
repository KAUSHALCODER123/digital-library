import { test as base, expect, type Page } from '@playwright/test';

async function hydrated(page: Page) {
  // Pages that fail to render (404s, reader shell) still set this; a missing flag just times out quietly.
  await page.locator('html[data-hydrated="true"]').waitFor({ state: 'attached', timeout: 20_000 }).catch(() => undefined);
}

/** `page.goto` and `page.reload` wait until the app has hydrated, so clicks never race React. */
export const test = base.extend({
  page: async ({ page }, provide) => {
    const goto = page.goto.bind(page);
    const reload = page.reload.bind(page);
    page.goto = async (url, opts) => {
      const res = await goto(url, opts);
      await hydrated(page);
      return res;
    };
    page.reload = async (opts) => {
      const res = await reload(opts);
      await hydrated(page);
      return res;
    };
    await provide(page);
  },
});

export { expect };
