import { expect, test, type Page } from '@playwright/test';

/** Flows from 仕様書 2章・5章・7章. Time is fixed so the clock and sample data are stable. */
const T0 = new Date('2026-11-19T10:24:36+09:00');

async function open(page: Page, seed: Record<string, unknown> | null = { tourDone: true }): Promise<void> {
  await page.clock.setFixedTime(T0);
  if (seed) {
    await page.addInitScript(s => {
      if (!sessionStorage.getItem('seeded')) {
        localStorage.setItem('lgd.v1:global', s);
        sessionStorage.setItem('seeded', '1');
      }
    }, JSON.stringify(seed));
  }
  await page.goto('/');
  await expect(page.locator('.w[data-w="todo"]')).toBeVisible();
}

test.use({ timezoneId: 'Asia/Tokyo', locale: 'ja-JP' });

test('first open shows the 5-step tour; skipping is remembered', async ({ page }) => {
  await open(page, null);
  const card = page.locator('.tcard.open');
  await expect(card).toBeVisible();
  await expect(card).toContainText('1 / 5');
  await card.getByRole('button', { name: 'スキップ' }).click();
  await expect(card).toBeHidden();
  await page.reload();
  await expect(page.locator('.w[data-w="todo"]')).toBeVisible();
  await expect(page.locator('.tcard.open')).toBeHidden();
});

test('global settings sheet opens from the bottom bar and closes with Escape', async ({ page }) => {
  await open(page);
  const gear = page.locator('.nav button[aria-label="全体の設定"]');
  await gear.click();
  const sheet = page.locator('.sheet.open[aria-label="全体の設定"]');
  await expect(sheet).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(sheet).toBeHidden();
});

test('child sheet goes back to its parent (操作ヒント → 設定)', async ({ page }) => {
  await open(page);
  await page.locator('.nav button[aria-label="全体の設定"]').click();
  await page.locator('.sheet.open[aria-label="全体の設定"]').getByRole('button', { name: '操作ヒント' }).click();
  const help = page.locator('.sheet.open[aria-label="操作ヒント"]');
  await expect(help).toBeVisible();
  await help.locator('.bk').click();
  await expect(page.locator('.sheet.open[aria-label="全体の設定"]')).toBeVisible();
});

test('removing a widget from the board can be undone from the toast', async ({ page, isMobile }) => {
  test.skip(isMobile, 'long-press path is covered by the visual test');
  await open(page);
  await page.locator('.w[data-w="todo"]').click({ button: 'right' });
  await page.getByRole('menuitem', { name: 'ボードから外す' }).click();
  await expect(page.locator('.w[data-w="todo"]')).toHaveCount(0);
  await page.locator('.toast').getByRole('button', { name: '元に戻す' }).click();
  await expect(page.locator('.w[data-w="todo"]')).toBeVisible();
});

test('TODO changes are saved and survive a reload', async ({ page }) => {
  await open(page);
  const row = page.locator('.w[data-w="todo"] .todo', { hasText: 'メール返信' });
  await expect(row).toHaveAttribute('aria-pressed', 'false');
  await row.click();
  await expect(row).toHaveAttribute('aria-pressed', 'true');
  await page.reload();
  await expect(page.locator('.w[data-w="todo"] .todo', { hasText: 'メール返信' })).toHaveAttribute('aria-pressed', 'true');
});

test('single-key shortcuts open the index and edit mode (仕様書 2章「画面切替の手段」)', async ({ page, isMobile }) => {
  test.skip(isMobile, 'keyboard shortcuts are a desktop path');
  await open(page);
  await page.locator('.dash').focus();
  await page.keyboard.press('/');
  await expect(page.locator('.sheet.open[aria-label="ウィジェット一覧"]')).toBeVisible();
  await page.keyboard.press('Escape');
  await page.locator('.dash').focus();
  await page.keyboard.press('e');
  await expect(page.locator('.dash.edit')).toHaveCount(1);
  await expect(page.locator('.epill.open')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('.dash.edit')).toHaveCount(0);
});

test('catalog search ignores kana and width differences (仕様書 2章「ウィジェットを探す」)', async ({ page }) => {
  await open(page);
  await page.locator('.nav button[aria-label="ウィジェットを編集"]').click();
  await page.locator('.nav .ebar').getByRole('button', { name: 'ウィジェット' }).click();
  const add = page.locator('.sheet.open[aria-label="ウィジェットを追加"]');
  await expect(add).toBeVisible();
  await add.locator('input').first().fill('デンタク');
  await expect(add).toContainText('電卓');
  await expect(add).not.toContainText('ストップウォッチ');
});

test('screens move with the bottom bar arrows on a phone', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'one board fits one screen on desktop');
  await open(page);
  const dots = page.locator('.nav .dot');
  await expect(dots.nth(0)).toHaveAttribute('aria-current', 'page');
  await page.locator('.nav button[aria-label="次の画面"]').click();
  await expect(dots.nth(1)).toHaveAttribute('aria-current', 'page');
  await expect(page).toHaveURL(/#p=2$/);
  await page.locator('.nav button[aria-label="ホームへ"]').click();
  await expect(dots.nth(0)).toHaveAttribute('aria-current', 'page');
});
