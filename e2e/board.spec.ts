import { expect, test, type Page } from '@playwright/test';

async function colorWidgets(page: Page) {
  return page.locator('section.panel').filter({ has: page.getByRole('heading', { name: 'カラー変換', exact: true }) });
}

test('independent widgets persist; invalid draft stays editable; detach and restore', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'カラーを追加' }).click();
  await page.getByRole('button', { name: 'カラーを追加' }).click();
  const cards = await colorWidgets(page);
  await expect(cards).toHaveCount(2);
  await cards.nth(0).getByLabel('HEXカラー').fill('#112233');
  await cards.nth(0).getByRole('button', { name: '変換して保存' }).click();
  await expect(cards.nth(0).locator('output')).toContainText('RGB(17, 34, 51)');
  await cards.nth(1).getByLabel('HEXカラー').fill('#aabbcc');
  await cards.nth(1).getByRole('button', { name: '変換して保存' }).click();
  await expect(cards.nth(1).locator('output')).toContainText('RGB(170, 187, 204)');
  await page.reload();
  await expect(cards.nth(0).getByLabel('HEXカラー')).toHaveValue('#112233');
  await expect(cards.nth(1).getByLabel('HEXカラー')).toHaveValue('#aabbcc');
  await cards.nth(0).getByLabel('HEXカラー').fill('');
  await cards.nth(0).getByRole('button', { name: '変換して保存' }).click();
  await expect(cards.nth(0).getByRole('alert')).toBeVisible();
  await expect(cards.nth(0).getByLabel('HEXカラー')).toHaveValue('');
  await page.getByRole('button', { name: '編集モード' }).click();
  await cards.nth(0).getByRole('button', { name: '取り外し・削除' }).click();
  await page.getByRole('dialog').getByRole('button', { name: '選択した操作を確定' }).click();
  await expect(cards).toHaveCount(1);
  await page.getByRole('button', { name: 'ボードに戻す' }).click();
  await expect(cards).toHaveCount(2);
  await expect(page.getByLabel('HEXカラー')).toHaveCount(2);
  const values = await page.getByLabel('HEXカラー').evaluateAll(inputs => inputs.map(input => (input as HTMLInputElement).value));
  expect(values.sort()).toEqual(['#112233', '#aabbcc']);
});

test('standalone is usable without adding to the board', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '単独ツール' }).click();
  await page.getByLabel('HEXカラー').fill('#abcdef');
  await page.getByRole('button', { name: '変換して保存' }).click();
  await expect(page.locator('output')).toContainText('RGB(171, 205, 239)');
  await page.reload();
  await page.getByRole('button', { name: '単独ツール' }).click();
  await expect(page.getByLabel('HEXカラー')).toHaveValue('#abcdef');
  await page.getByRole('button', { name: 'ボード', exact: true }).click();
  await expect(page.getByText('ツールを追加してボードを始めましょう。')).toBeVisible();
});

test('a dirty draft survives another tab committing and cannot overwrite it', async ({ page, context }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'カラーを追加' }).click();
  await expect(page.getByLabel('HEXカラー')).toBeVisible();
  const other = await context.newPage();
  await other.goto('/');
  await page.getByLabel('HEXカラー').fill('#aabbcc');
  await other.getByLabel('HEXカラー').fill('#112233');
  await other.getByRole('button', { name: '変換して保存' }).click();
  await expect(page.getByText(/別の画面で設定が変更されました/)).toBeVisible();
  await expect(page.getByLabel('HEXカラー')).toHaveValue('#aabbcc');
  await page.getByRole('button', { name: '変換して保存' }).click();
  await expect(page.getByText(/保存できませんでした/)).toBeVisible();
  await page.getByRole('button', { name: '最新の設定を読み込む' }).click();
  await expect(page.getByLabel('HEXカラー')).toHaveValue('#112233');
});

test('export requires saved confirmation and can be restored', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'カラーを追加' }).click();
  await page.getByLabel('HEXカラー').fill('#123456');
  await page.getByRole('button', { name: '変換して保存' }).click();
  await expect(page.locator('output')).toContainText('RGB(18, 52, 86)');
  await page.getByRole('button', { name: '編集モード' }).click();
  await page.getByRole('button', { name: '取り外し・削除' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('エクスポートしてから削除').check();
  await expect(dialog.getByRole('button', { name: '選択した操作を確定' })).toBeDisabled();
  const downloadPromise = page.waitForEvent('download');
  await dialog.getByRole('button', { name: 'エクスポートを保存' }).click();
  const download = await downloadPromise;
  await expect(dialog.getByRole('button', { name: '選択した操作を確定' })).toBeDisabled();
  await dialog.getByLabel('エクスポートファイルを保存したことを確認しました').check();
  await dialog.getByRole('button', { name: '選択した操作を確定' }).click();
  await expect(page.getByLabel('HEXカラー')).toHaveCount(0);
  const path = await download.path();
  await page.getByLabel('エクスポートファイルを選択').setInputFiles(path);
  await page.getByRole('button', { name: 'インポートする' }).click();
  await expect(page.getByLabel('HEXカラー')).toHaveValue('#123456');
});

test('keyboard controls work without requests to a remote service', async ({ page }) => {
  const remoteRequests: string[] = [];
  page.on('request', request => { if (!request.url().startsWith('http://127.0.0.1:4173/')) remoteRequests.push(request.url()); });
  await page.goto('/');
  const add = page.getByRole('button', { name: '時計を追加' });
  await add.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByLabel('タイムゾーン')).toBeVisible();
  await page.getByRole('button', { name: '編集モード' }).focus();
  await page.keyboard.press('Enter');
  await page.getByRole('button', { name: '幅を広げる' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: '幅を狭める' })).toBeVisible();
  expect(remoteRequests).toEqual([]);
});

test('a change after export prevents deletion', async ({ page, context }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'カラーを追加' }).click();
  await expect(page.getByLabel('HEXカラー')).toBeVisible();
  const other = await context.newPage();
  await other.goto('/');
  await page.getByRole('button', { name: '編集モード' }).click();
  await page.getByRole('button', { name: '取り外し・削除' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('エクスポートしてから削除').check();
  const download = page.waitForEvent('download');
  await dialog.getByRole('button', { name: 'エクスポートを保存' }).click();
  await download;
  await dialog.getByLabel('エクスポートファイルを保存したことを確認しました').check();
  await other.getByLabel('HEXカラー').fill('#445566');
  await other.getByRole('button', { name: '変換して保存' }).click();
  await expect(other.locator('output')).toContainText('RGB(68, 85, 102)');
  await dialog.getByRole('button', { name: '選択した操作を確定' }).click();
  await expect(dialog.getByRole('alert').filter({ hasText: '操作できませんでした' })).toBeVisible();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.reload();
  await expect(page.getByLabel('HEXカラー')).toHaveValue('#445566');
});

test('an already loaded app edits and saves while the browser is offline', async ({ page, context }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'カラーを追加' }).click();
  await expect(page.getByLabel('HEXカラー')).toBeVisible();
  await context.setOffline(true);
  try {
    await page.getByLabel('HEXカラー').fill('#13579b');
    await page.getByRole('button', { name: '変換して保存' }).click();
    await expect(page.locator('output')).toContainText('RGB(19, 87, 155)');
    await page.getByRole('button', { name: '単独ツール' }).click();
    await page.getByRole('button', { name: 'ボード', exact: true }).click();
    await expect(page.getByLabel('HEXカラー')).toHaveValue('#13579b');
  } finally {
    await context.setOffline(false);
  }
});

test('removal dialog traps keyboard focus and Escape restores it', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '時計を追加' }).click();
  await page.getByRole('button', { name: '編集モード' }).click();
  const opener = page.getByRole('button', { name: '取り外し・削除' });
  await opener.focus();
  await page.keyboard.press('Enter');
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(dialog.getByRole('button', { name: 'キャンセル' })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(dialog.getByLabel('ボードから外し、設定とデータを残す')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(opener).toBeFocused();
});
