import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import { REGISTRY } from '../src/app/registry/registry';

/**
 * P2c 情報の操作（機能・データのゲート、development-flow.md 5章）:
 * 日の出・日の入りの場所と現在地（共通の許可のお願い、断られたときの東京とトースト、「都市を選ぶ」の場所の選択メニューと
 * 閉じたあとのフォーカス、許可済みの現在地、現在地を保存しない）、RSS の選んでいるフィード（保存しない）、外部の情報の状態の覆い
 * （開発時だけの全体設定「表示テスト」で状態を変え、「もう一度」で読み込み中を経て通常に戻る）.
 * 位置は Playwright の geolocation のエミュレート（許可しない context では、ブラウザは位置を断る）.
 */
const KINDS = ['sun', 'today', 'quote', 'github', 'rss', 'weather'];
const GEO_FAIL = '現在地を使えません。東京で表示しています';

type Seed = { sizes?: Record<string, [number, number]> };

/** Opens a board with the P2c kinds (and 天気). `widgets` are written to `lgd.v1:w:<id>` as `{ v: 1, ...sec }`. */
async function open(page: Page, widgets: Record<string, Record<string, unknown>> = {}, seed: Seed = {}): Promise<void> {
  await page.clock.install({ time: new Date('2026-11-19T10:24:36+09:00') });
  const items: Record<string, string> = {
    'lgd.v1:global': JSON.stringify({
      v: 1, tourDone: true, groups: [{ id: 'g0', n: 'ボード 1' }], order: [...KINDS, ...Object.keys(REGISTRY).filter(k => !KINDS.includes(k))],
      off: Object.fromEntries(Object.keys(REGISTRY).filter(k => !KINDS.includes(k)).map(k => [k, true])),
      place: Object.fromEntries(KINDS.map(k => [k, 'g0'])),
      ...(seed.sizes ? { sizes: seed.sizes } : {}),
    }),
  };
  for (const [id, sec] of Object.entries(widgets)) items['lgd.v1:w:' + id] = JSON.stringify({ v: 1, ...sec });
  await page.addInitScript((s) => {
    if (sessionStorage.getItem('seeded')) return;
    for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v);
    sessionStorage.setItem('seeded', '1');
  }, items);
  await page.goto('/');
  await expect(page.locator('.w[data-w="sun"]')).toBeAttached();
}
const w = (page: Page, id: string) => page.locator('.w[data-wid="' + id + '"]');
type DashHandle = { layout: { value: { pos: Record<string, { page: number }> } }; go: (p: number, s: boolean) => void };
/** Moves the board to the page that has the placement (mobile splits the board into pages). */
async function toWidget(page: Page, id: string): Promise<void> {
  await page.evaluate((k) => {
    const d = (window as unknown as { __lgdDash?: DashHandle }).__lgdDash;
    const p = d?.layout.value.pos[k]?.page;
    if (d && p !== undefined) d.go(p, false);
  }, id);
  await expect(w(page, id)).toBeInViewport();
}
const toast = (page: Page, text: string) => page.locator('.toast').filter({ hasText: text });
const placeMenu = (page: Page) => page.locator('.mnuw.open .mnu[role="listbox"][aria-label="場所"]');
/** Everything saved (global and every section). */
const saved = (page: Page): Promise<string> => page.evaluate(() => Object.keys(localStorage).map(k => k + '=' + (localStorage.getItem(k) ?? '')).join('\n'));

test.use({ timezoneId: 'Asia/Tokyo', locale: 'ja-JP' });

// ----- 日の出・日の入り -----

test.describe('日の出・日の入り: 場所と現在地', () => {
  test('設定の「場所」で「現在地」を選ぶと、共通の枠に許可のお願いのカードが出る', async ({ page }) => {
    await open(page);
    await toWidget(page, 'sun');
    const sun = w(page, 'sun');
    await expect(sun.locator('.pmw .perm')).toHaveCount(0);
    await page.locator('.nav button[aria-label="ウィジェットを編集"]').click();
    await sun.click();
    const sheet = page.locator('.sheet.open[aria-label="ウィジェットの設定"]');
    await expect(sheet.locator('.sh .st')).toHaveText('日の出・日の入り');
    await sheet.getByRole('button', { name: '場所：' }).click();
    await placeMenu(page).getByRole('option', { name: '現在地' }).click();
    await expect(placeMenu(page)).toHaveCount(0);
    await sheet.getByRole('button', { name: '設定を閉じる' }).click();
    await page.keyboard.press('Escape');
    await expect(page.locator('.dash.edit')).toHaveCount(0);
    await expect(sun.locator('.pmw .perm')).toContainText('現在地を使いますか？');
    await expect(sun.locator('.pmw .perm').getByRole('button', { name: '位置を使う' })).toBeVisible();
    await expect(sun.locator('.pmw .perm').getByRole('button', { name: '都市を選ぶ' })).toBeVisible();
    expect(await page.evaluate(() => localStorage.getItem('lgd.v1:w:sun') ?? '')).toContain('現在地');
  });

  test('位置の許可を断ると、断られたカードとトーストが出て東京で表示する。「都市を選ぶ」で選ぶとカードが消え、フォーカスはウィジェットへ', async ({ page }) => {
    await open(page, { sun: { cfg: { loc: '現在地' } } }, { sizes: { sun: [2, 2] } });
    await toWidget(page, 'sun');
    const sun = w(page, 'sun');
    const card = sun.locator('.pmw .perm');
    await expect(card).toContainText('現在地を使いますか？');
    await card.getByRole('button', { name: '位置を使う' }).click();
    await expect(card).toContainText('現在地を使えません');
    await expect(card).toContainText('いまは東京で表示中');
    await expect(toast(page, GEO_FAIL)).toBeVisible();
    await expect(sun).toContainText('現在地（取得するまで東京）・今日');
    // 「都市を選ぶ」: その配置の場所の選択メニュー。選ばずに閉じるとカードは残り、フォーカスはボタンへ戻る.
    await card.getByRole('button', { name: '都市を選ぶ' }).click();
    await expect(placeMenu(page)).toBeVisible();
    await expect(placeMenu(page).getByRole('option', { name: '現在地' })).toHaveAttribute('aria-selected', 'true');
    await page.keyboard.press('Escape');
    await expect(placeMenu(page)).toHaveCount(0);
    await expect(card.getByRole('button', { name: '都市を選ぶ' })).toBeFocused();
    // 都市を選ぶとカードが消える。押したボタンは無くなるので、フォーカスはウィジェットへ戻る.
    await card.getByRole('button', { name: '都市を選ぶ' }).click();
    await placeMenu(page).getByRole('option', { name: '大阪' }).click();
    await expect(placeMenu(page)).toHaveCount(0);
    await expect(card).toHaveCount(0);
    await expect(sun).toContainText('大阪・今日');
    await expect(sun).toBeFocused();
    expect(await page.evaluate(() => localStorage.getItem('lgd.v1:w:sun') ?? '')).toContain('大阪');
  });

  test.describe('位置の許可済み（geolocation をエミュレート）', () => {
    const grant = async (context: BrowserContext): Promise<void> => {
      await context.grantPermissions(['geolocation']);
      await context.setGeolocation({ latitude: 43.0621, longitude: 141.3544 });
    };

    test('場所が「現在地」なら、カードを出さずに現在地で表示する（「現在地・今日」）。位置は保存しない', async ({ page, context }) => {
      await grant(context);
      await open(page, { sun: { cfg: { loc: '現在地' } } }, { sizes: { sun: [2, 2] } });
      await toWidget(page, 'sun');
      const sun = w(page, 'sun');
      await expect(sun).toContainText('現在地・今日');
      await expect(sun.locator('.pmw .perm')).toHaveCount(0);
      const all = await saved(page);
      expect(all).not.toContain('43.06');
      expect(all).not.toContain('141.35');
      expect(all).not.toMatch(/"(lat|lng|geo)"/);
    });

    test('再読み込みで現在地は消える（保存しないので、許可を外すと取得するまで東京に戻る）', async ({ page, context }) => {
      await grant(context);
      await open(page, { sun: { cfg: { loc: '現在地' } } }, { sizes: { sun: [2, 2] } });
      await toWidget(page, 'sun');
      const sun = w(page, 'sun');
      await expect(sun).toContainText('現在地・今日');
      await context.clearPermissions();
      await page.reload();
      await toWidget(page, 'sun');
      await expect(sun).toContainText('現在地（取得するまで東京）・今日');
      await expect(sun.locator('.pmw .perm')).toContainText('現在地を使いますか？');
      // 場所の設定は残る.
      expect(await page.evaluate(() => localStorage.getItem('lgd.v1:w:sun') ?? '')).toContain('現在地');
    });
  });

  test('2個目の配置（sun#2）の場所を変えても、1個目の場所は変わらない', async ({ page }) => {
    await open(page);
    await page.evaluate(() => {
      const d = (window as unknown as { __lgdDash?: { addInstance: (k: string) => string | null } }).__lgdDash;
      d?.addInstance('sun');
    });
    await toWidget(page, 'sun#2');
    await page.locator('.nav button[aria-label="ウィジェットを編集"]').click();
    await w(page, 'sun#2').click();
    const sheet = page.locator('.sheet.open[aria-label="ウィジェットの設定"]');
    await sheet.getByRole('button', { name: '場所：' }).click();
    await placeMenu(page).getByRole('option', { name: '那覇' }).click();
    await sheet.getByRole('button', { name: '設定を閉じる' }).click();
    await page.keyboard.press('Escape');
    const kept = await page.evaluate(() => [localStorage.getItem('lgd.v1:w:sun#2') ?? '', localStorage.getItem('lgd.v1:w:sun') ?? '']);
    expect(kept[0]).toContain('那覇');
    expect(kept[1]).not.toContain('那覇');
  });
});

// ----- RSS -----

test('RSS: 切替チップでフィードが変わり、再読み込みで最初のフィード（Dev）に戻る（選んでいるフィードは保存しない）', async ({ page }) => {
  await open(page);
  await toWidget(page, 'rss');
  const rss = w(page, 'rss');
  await expect(rss.getByRole('button', { name: 'Dev' })).toHaveAttribute('aria-pressed', 'true');
  await expect(rss).toContainText('View Transitions 実践メモ');
  await rss.getByRole('button', { name: 'Design' }).click();
  await expect(rss.getByRole('button', { name: 'Design' })).toHaveAttribute('aria-pressed', 'true');
  await expect(rss.getByRole('button', { name: 'Dev' })).toHaveAttribute('aria-pressed', 'false');
  await expect(rss).toContainText('ガラス表現と可読性');
  await expect(rss).not.toContainText('View Transitions 実践メモ');
  expect(await saved(page)).not.toContain('Design');
  await page.reload();
  await toWidget(page, 'rss');
  await expect(rss.getByRole('button', { name: 'Dev' })).toHaveAttribute('aria-pressed', 'true');
  await expect(rss).toContainText('View Transitions 実践メモ');
});

// ----- 状態の覆い（開発時だけの表示テスト） -----

test('表示テスト: 外部の情報の状態「失敗」が天気・GitHub PR・RSS に当たり、「もう一度」で読み込み中を経て通常に戻る', async ({ page }) => {
  await open(page);
  await page.locator('.nav button[aria-label="全体の設定"]').click();
  const gs = page.locator('.sheet.open[aria-label="全体の設定"]');
  await expect(gs).toBeVisible();
  await gs.getByRole('button', { name: '表示テスト' }).click();
  const demo = gs.getByRole('group', { name: '外部情報ウィジェットの状態' });
  await demo.getByRole('button', { name: '失敗' }).click();
  await expect(demo.getByRole('button', { name: '失敗' })).toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.press('Escape');
  await expect(gs).toHaveCount(0);
  for (const id of ['weather', 'github', 'rss']) {
    await toWidget(page, id);
    await expect(w(page, id)).toHaveClass(/\bs-err\b/);
    await expect(w(page, id).locator('.sto .stm')).toContainText('取得できませんでした');
  }
  // 当てる対象ではない種類には付かない.
  await expect(w(page, 'today')).not.toHaveClass(/\bs-err\b/);

  for (const id of ['rss', 'github', 'weather']) {
    await toWidget(page, id);
    const box = w(page, id);
    await box.locator('.sto').getByRole('button', { name: 'もう一度' }).click();
    await expect(box).toHaveClass(/\bs-load\b/);
    await expect(box).not.toHaveClass(/\bs-err\b/);
    await page.clock.runFor(1_500);
    await expect(box).not.toHaveClass(/\bs-(load|err|stale|empty)\b/);
  }
});

test('状態の覆い: 開発用のフックから「空」にすると「接続する」が出て、押すと読み込み中を経て通常に戻る', async ({ page }) => {
  await open(page);
  await page.evaluate(async () => {
    const d = (window as unknown as { __lgdDash?: object }).__lgdDash;
    // The dev server serves the same module instance the app uses.
    const path = '/src/widgets/github/index.ts';
    const m = (await import(/* @vite-ignore */ path)) as { setGithubState: (d: object, st: string) => void };
    if (d) m.setGithubState(d, 'empty');
  });
  await toWidget(page, 'github');
  const gh = w(page, 'github');
  await expect(gh).toHaveClass(/\bs-empty\b/);
  await gh.locator('.sto').getByRole('button', { name: '接続する' }).click();
  await expect(gh).toHaveClass(/\bs-load\b/);
  await page.clock.runFor(1_500);
  await expect(gh).not.toHaveClass(/\bs-(load|err|stale|empty)\b/);
});
