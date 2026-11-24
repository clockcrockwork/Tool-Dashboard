import { expect, test } from '@playwright/test';

/**
 * 人間確認と公開の条件 (docs/lgd/development-flow.md 5章, review #9): プロトタイプ専用の機能が本番ビルドに出ないこと。
 * Runs only against a production build: `npm run build && npx vite preview --port 4191` and
 * `LGD_PROD_URL=http://127.0.0.1:4191/ npx playwright test e2e/production.spec.ts`. Skipped otherwise (the e2e server is dev).
 */
const PROD = process.env.LGD_PROD_URL;
test.skip(!PROD, 'set LGD_PROD_URL to a production build (vite preview)');
test.use({ timezoneId: 'Asia/Tokyo', locale: 'ja-JP' });

test('production build has no prototype-only features (表示テスト, すべて並べる, 傘のサンプル, dev hooks)', async ({ page }) => {
  await page.addInitScript(() => { localStorage.setItem('lgd.v1:global', JSON.stringify({ v: 1, tourDone: true })); });
  await page.goto(PROD ?? '/');
  await expect(page.locator('.w[data-w="todo"]')).toBeVisible();
  expect(await page.evaluate(() => ['__lgdDash', '__lgdOverlays'].filter(k => k in window))).toEqual([]);
  await page.locator('.nav button[aria-label="全体の設定"]').click();
  const gs = page.locator('.sheet.open[aria-label="全体の設定"]');
  await expect(gs).toBeVisible();
  await expect(gs.getByText('表示テスト')).toHaveCount(0);
  await expect(gs.getByRole('button', { name: 'すべて並べる' })).toHaveCount(0);
  await page.keyboard.press('Escape');
  await page.locator('.nav button[aria-label="ウィジェットを編集"]').click();
  await page.locator('.w[data-wid="rain"]').click();
  const ws = page.locator('.sheet.open[aria-label="ウィジェットの設定"]');
  await expect(ws).toBeVisible();
  await expect(ws.getByText('サンプル')).toHaveCount(0);
});
