import { expect, test, type Page } from '@playwright/test';
import { REGISTRY, STARTER } from '../src/app/registry/registry';
import type { Dashboard } from '../src/app/store/store';

/**
 * review #6: 人前では隠すが最優先（通常・状態の覆い・1×1 の知らせ・前面表示・全画面で中身・読み上げ・知らせを出さない）。
 * review #9: 未実装の種類は「準備中」で置き換え、追加を成功扱いにしない。
 */
const T0 = new Date('2026-11-19T10:24:36+09:00');
/** An unimplemented kind for the 準備中 checks (P2a implemented アラーム; メーター is in the last category, P2f). */
const PENDING = 'meter';
const PN = REGISTRY[PENDING]?.n ?? PENDING;

type Seed = Readonly<{ global?: Record<string, unknown>; widgets?: Record<string, Record<string, unknown>> }>;

async function open(page: Page, seed: Seed = {}): Promise<void> {
  await page.clock.setFixedTime(T0);
  const items: Record<string, string> = { 'lgd.v1:global': JSON.stringify({ v: 1, tourDone: true, ...seed.global }) };
  for (const [id, sec] of Object.entries(seed.widgets ?? {})) items['lgd.v1:w:' + id] = JSON.stringify({ v: 1, ...sec });
  await page.addInitScript((s) => {
    if (sessionStorage.getItem('seeded')) return;
    for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v);
    sessionStorage.setItem('seeded', '1');
  }, items);
  await page.goto('/');
  await expect(page.locator('.w[data-w="todo"]')).toBeVisible();
}

/** Layout with every kind unplaced except the first 7 and `extra` (`off` is read together with `order`). */
const placeAlso = (...extra: string[]): Record<string, unknown> => ({
  order: Object.keys(REGISTRY),
  off: Object.fromEntries(Object.keys(REGISTRY).filter(k => !STARTER.includes(k) && !extra.includes(k)).map(k => [k, true])),
});

/** Toasts seen during `ms` (the 1×1 notices scan every 1.2 s). */
async function toastsDuring(page: Page, ms: number): Promise<string[]> {
  const seen = new Set<string>();
  const end = Date.now() + ms;
  while (Date.now() < end) {
    for (const t of await page.locator('.toast').allTextContents()) seen.add(t);
    await page.waitForTimeout(150);
  }
  return [...seen];
}

test.use({ timezoneId: 'Asia/Tokyo', locale: 'ja-JP' });

test.describe('人前では隠す (review #6)', () => {
  test('hides content from view and from the accessibility tree; 表示する shows it again', async ({ page }) => {
    await open(page, { global: { gs: { veil: true } } });
    const memo = page.locator('.w[data-wid="memo"]');
    await expect(memo).toHaveClass(/\bveil\b/);
    await expect(memo.locator('.in')).toBeHidden();
    const tree = await page.getByRole('group', { name: 'メモ', exact: true }).ariaSnapshot();
    expect(tree).toContain('メモを表示する');
    expect(tree).not.toContain('牛乳');
    // weather is not 「人前では隠す」 by default (priv), even though the switch is on.
    await expect(page.locator('.w[data-wid="weather"]')).not.toHaveClass(/\bveil\b/);
    await memo.getByRole('button', { name: 'メモを表示する' }).click();
    await expect(memo).not.toHaveClass(/\bveil\b/);
    await expect(memo.locator('.in')).toBeVisible();
  });

  test('1×1 failure and 準備中 + hidden: no state overlay, no content, no toast (shown again: the toast comes)', async ({ page }) => {
    await open(page, {
      global: { gs: { veil: true }, sizes: { weather: [1, 1], [PENDING]: [1, 1] }, ...placeAlso(PENDING) },
      widgets: { weather: { cfg: { veil: true } }, [PENDING]: { cfg: { veil: true } } },
    });
    await page.evaluate(async () => {
      const d = (window as Window & { __lgdDash?: Dashboard }).__lgdDash;
      const path = '/src/widgets/weather/status.ts';
      const m = await import(/* @vite-ignore */ path) as { setWeatherState: (dd: unknown, st: string) => void };
      m.setWeatherState(d, 'err');
    });
    const wx = page.locator('.w[data-wid="weather"]');
    const alarm = page.locator('.w[data-wid="' + PENDING + '"]');
    await expect(wx).toHaveClass(/\bveil\b/);
    await expect(wx).not.toHaveClass(/\bs-err\b/);
    await expect(wx.locator('.sto')).toHaveCount(0);
    await expect(wx.locator('.in')).toBeHidden();
    await expect(alarm.locator('.pmw')).toHaveCount(0);
    await expect(alarm.locator('.in')).toBeHidden();
    for (const g of ['天気', PN]) {
      const tree = await page.getByRole('group', { name: g, exact: true }).ariaSnapshot();
      expect(tree).not.toContain('取得できませんでした');
      expect(tree).not.toContain('準備中');
    }
    const quiet = await toastsDuring(page, 3000);
    expect(quiet.filter(t => t.includes('天気') || t.includes(PN))).toEqual([]);

    // Control: shown again, the same widgets do announce themselves (so the check above is meaningful).
    await wx.getByRole('button', { name: '天気を表示する' }).click();
    await alarm.getByRole('button', { name: PN + 'を表示する' }).click();
    await expect(wx).toHaveClass(/\bs-err\b/);
    await expect(alarm.locator('.pmw')).toHaveCount(1);
    const loud = await toastsDuring(page, 3000);
    expect(loud.some(t => t.includes('天気：取得できませんでした'))).toBe(true);
    expect(loud.some(t => t.includes(PN + '：準備中です'))).toBe(true);
  });

  test('normal → full screen while hidden: the full-screen view is not drawn, only the eye mark and 表示する', async ({ page }) => {
    await open(page, { global: { gs: { veil: true } }, widgets: { clock: { cfg: { veil: true } } } });
    const clock = page.locator('.w[data-wid="clock"]');
    await expect(clock).toHaveClass(/\bveil\b/);
    await expect(clock.locator('.in')).toBeHidden();
    // 通常 → 全画面 (ウィジェットの設定のサイズ「全画面」).
    await page.locator('.nav button[aria-label="ウィジェットを編集"]').click();
    await clock.click();
    await page.locator('.sheet.open[aria-label="ウィジェットの設定"]').getByRole('button', { name: '全画面', exact: true }).click();
    await page.keyboard.press('Escape');
    await page.keyboard.press('Escape');
    const fsw = page.locator('.fsw[data-wid="clock"]');
    await expect(fsw).toHaveCount(1);
    await page.evaluate(() => {
      const d = (window as Window & { __lgdDash?: Dashboard }).__lgdDash;
      const s = d?.layout.value.fullScreens.find(x => x.id === 'clock');
      if (d && s) d.go(s.page, false);
    });
    await expect(fsw).toHaveClass(/\bveil\b/);
    await expect(fsw.locator('.fsw-main')).toHaveCount(0);
    await expect(fsw.locator('.fsw-bg')).toHaveCount(0);
    await expect(fsw.getByRole('button', { name: '時計を表示する' })).toBeVisible();
    expect(await fsw.ariaSnapshot()).not.toContain('10:24');
    await fsw.getByRole('button', { name: '時計を表示する' }).click();
    await expect(fsw.locator('.fsw-main')).toContainText('10:24');
  });

  test('front view (大きく表示) of a hidden widget stays hidden', async ({ page }) => {
    await open(page, { global: { gs: { veil: true } } });
    const memo = page.locator('.w[data-wid="memo"]');
    // The veil covers the face (its menu cannot be opened there), so open the front view directly.
    await page.evaluate(() => {
      const d = (window as Window & { __lgdDash?: Dashboard }).__lgdDash;
      if (d) d.ui.big = 'memo';
    });
    await expect(memo).toHaveClass(/\bbig\b/);
    await expect(memo).toHaveClass(/\bveil\b/);
    await expect(memo.locator('.in')).toBeHidden();
    expect(await page.getByRole('group', { name: 'メモ', exact: true }).ariaSnapshot()).not.toContain('牛乳');
  });
});

test.describe('準備中の種類 (review #9)', () => {
  async function openAdd(page: Page): Promise<void> {
    await page.locator('.nav button[aria-label^="ウィジェット一覧"]').click();
    await page.locator('.sheet.open[aria-label="ウィジェット一覧"]').getByRole('button', { name: 'ウィジェットを追加' }).click();
    await expect(page.locator('.sheet.open[aria-label="ウィジェットを追加"]')).toBeVisible();
  }

  test('＋ 追加 does not place it and says 「〇〇 は準備中です」', async ({ page }) => {
    await open(page);
    await openAdd(page);
    const add = page.locator('.sheet.open[aria-label="ウィジェットを追加"]');
    await add.getByRole('button', { name: PN + 'を「ボード 1」に追加' }).click();
    await expect(page.locator('.toast').filter({ hasText: PN + ' は準備中です' })).toBeVisible();
    await expect(page.locator('.toast').filter({ hasText: PN + ' は準備中です' }).getByRole('button')).toHaveCount(0);
    await expect(page.locator('.w[data-wid="' + PENDING + '"]')).toHaveCount(0);
    // Still listed as not placed (▶ and ＋ remain).
    await expect(add.getByRole('button', { name: PN + 'を置かずに使う' })).toBeVisible();
  });

  test('▶ 置かずに使う opens the 準備中 replacement in front (not an empty face)', async ({ page }) => {
    await open(page);
    await openAdd(page);
    await page.locator('.sheet.open[aria-label="ウィジェットを追加"]').getByRole('button', { name: PN + 'を置かずに使う' }).click();
    const w = page.locator('.w[data-wid="' + PENDING + '"]');
    await expect(w).toHaveClass(/\bbig\b/);
    await expect(w.locator('.perm')).toContainText('準備中です');
    await expect(w.locator('.perm')).toContainText('このウィジェットは次の版で使えるようになります');
  });

  test('a saved placement of an unimplemented kind shows 準備中', async ({ page }) => {
    await open(page, { global: placeAlso(PENDING) });
    const w = page.locator('.w[data-wid="' + PENDING + '"]');
    await expect(w).toBeVisible();
    await expect(w.getByRole('group', { name: '準備中です' })).toBeVisible();
  });
});
