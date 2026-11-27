import { expect, test, type Locator, type Page } from '@playwright/test';
import { REGISTRY } from '../src/app/registry/registry';

/**
 * P2b 予定と記録の操作（機能・データのゲート、development-flow.md 5章）:
 * カウンターの行の削除と個別の元に戻す（ほかの行の変更は残る・保存された区画）、ハビットの達成の知らせと人前では隠すの伏せた文、
 * スケッチの線（全画面・前面表示で同じ線、すべて消去の元に戻す、保存しない）、録音（継続実行: 一時利用を閉じても続く。マイクを
 * 断られたときの知らせ）、予定が空のときの「メモを開く」、月間・週間の祝日（下線と読み上げの祝日名）.
 * 録音は Chromium の偽のマイク（playwright.config.ts `--use-fake-device-for-media-stream`）で回す。WebKit では回さない.
 */
const KINDS = ['agenda', 'month', 'week', 'habit', 'counter', 'recorder', 'sketch', 'memo'];
const VEILED_TOAST = '通知があります。人前では隠すがオンなので、内容はウィジェットで確認してください';

type Seed = { gs?: Record<string, unknown>; unplaced?: string[]; at?: string };

/** Opens the board with the P2b kinds (and メモ) placed. `widgets` are written to `lgd.v1:w:<id>` as `{ v: 1, ...sec }`. */
async function open(page: Page, widgets: Record<string, Record<string, unknown>> = {}, seed: Seed = {}): Promise<void> {
  await page.clock.install({ time: new Date(seed.at ?? '2026-11-19T10:24:36+09:00') });
  const placed = KINDS.filter(k => !(seed.unplaced ?? []).includes(k));
  const items: Record<string, string> = {
    'lgd.v1:global': JSON.stringify({
      v: 1, tourDone: true, groups: [{ id: 'g0', n: 'ボード 1' }], order: Object.keys(REGISTRY),
      off: Object.fromEntries(Object.keys(REGISTRY).filter(k => !placed.includes(k)).map(k => [k, true])),
      place: Object.fromEntries(KINDS.map(k => [k, 'g0'])),
      ...(seed.gs ? { gs: seed.gs } : {}),
    }),
  };
  for (const [id, sec] of Object.entries(widgets)) items['lgd.v1:w:' + id] = JSON.stringify({ v: 1, ...sec });
  await page.addInitScript((s) => {
    if (sessionStorage.getItem('seeded')) return;
    for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v);
    sessionStorage.setItem('seeded', '1');
  }, items);
  await page.goto('/');
  await expect(page.locator('.w[data-w="agenda"]')).toBeAttached();
}
const w = (page: Page, kind: string) => page.locator('.w[data-wid="' + kind + '"]');
type DashHandle = { layout: { value: { pos: Record<string, { page: number }>; fullScreens: { id: string; page: number }[] } }; go: (p: number, s: boolean) => void };
/** Moves the board to the page that has the placement (mobile splits the board into pages; a full-screen view has its own page). */
async function toWidget(page: Page, kind: string): Promise<void> {
  await page.evaluate((k) => {
    const d = (window as unknown as { __lgdDash?: DashHandle }).__lgdDash;
    const L = d?.layout.value;
    const p = L?.fullScreens.find(s => s.id === k)?.page ?? L?.pos[k]?.page;
    if (d && p !== undefined) d.go(p, false);
  }, kind);
}
const toast = (page: Page, text: string) => page.locator('.toast').filter({ hasText: text });

test.use({ timezoneId: 'Asia/Tokyo', locale: 'ja-JP' });

// ----- カウンター -----

test('カウンター: 行を削除 → 別の行を増やす → 元に戻すで消した行だけが元の位置に戻り、増やした数は残る（保存も同じ）', async ({ page }) => {
  const seed = { dv: 1, data: { items: [{ id: 1, n: '水', v: 2 }, { id: 2, n: 'コーヒー', v: 3 }, { id: 3, n: '散歩', v: 0 }] } };
  await open(page, { counter: seed });
  await toWidget(page, 'counter');
  const cn = w(page, 'counter');
  const names = cn.locator('.cnr .cnn');
  await expect(names).toHaveCount(3);

  await cn.getByRole('button', { name: '項目を削除するモード' }).click();
  await cn.getByRole('button', { name: 'コーヒー を削除' }).click();
  await expect(names).toHaveCount(2);
  const removed = toast(page, 'コーヒー を削除しました');
  await expect(removed).toBeVisible();
  await cn.getByRole('button', { name: '項目を削除するモード' }).click();
  await cn.getByRole('group', { name: '散歩の数' }).getByRole('button', { name: '増やす' }).click();
  await expect(cn.getByRole('spinbutton', { name: '散歩の数' })).toHaveValue('1');

  await removed.getByRole('button', { name: '元に戻す' }).click();
  await expect(names).toHaveCount(3);
  expect(await names.evaluateAll(els => els.map(e => (e as HTMLInputElement).value))).toEqual(['水', 'コーヒー', '散歩']);
  await expect(cn.getByRole('spinbutton', { name: 'コーヒーの数' })).toHaveValue('3');
  await expect(cn.getByRole('spinbutton', { name: '散歩の数' })).toHaveValue('1');

  await expect.poll(async () => {
    const raw = await page.evaluate(() => localStorage.getItem('lgd.v1:w:counter'));
    return (JSON.parse(raw ?? 'null') as { data?: unknown } | null)?.data;
  }).toEqual({ items: [{ id: 1, n: '水', v: 2 }, { id: 2, n: 'コーヒー', v: 3 }, { id: 3, n: '散歩', v: 1 }] });
});

// ----- ハビット -----

test('ハビット: 項目を押すと「〇〇 達成」のトースト', async ({ page }) => {
  await open(page);
  await toWidget(page, 'habit');
  const hb = w(page, 'habit');
  const item = hb.getByRole('button', { name: '読書' });
  await expect(item).toHaveAttribute('aria-pressed', 'false');
  await item.click();
  await expect(item).toHaveAttribute('aria-pressed', 'true');
  await expect(toast(page, '読書 達成')).toBeVisible();
  // Turning it off does not notify.
  await item.click();
  await expect(item).toHaveAttribute('aria-pressed', 'false');
  await expect(toast(page, '読書 達成')).toHaveCount(1);
});

test('ハビット: 人前では隠すがオン（全体とハビット）なら伏せた文だけを出し、項目名を出さない', async ({ page }) => {
  await open(page, { habit: { cfg: { veil: true } } }, { gs: { veil: true } });
  await toWidget(page, 'habit');
  const hb = w(page, 'habit');
  await expect(hb).toHaveClass(/\bveil\b/);
  // The items are hidden while veiled (visibility: hidden), so a pointer cannot reach them; the press is dispatched directly
  // to check what the shared notice says if one arrives while hidden.
  const item = hb.locator('button[aria-label="運動"]');
  await expect(item).toBeHidden();
  await item.dispatchEvent('click');
  await expect(item).toHaveAttribute('aria-pressed', 'true');
  await expect(toast(page, VEILED_TOAST)).toBeVisible();
  await expect(page.locator('.toasts')).not.toContainText('運動');
  await expect(page.locator('.toasts')).not.toContainText('達成');
});

// ----- スケッチ -----

/** Path `d` strings of a drawing surface that hold a stroke (an empty layer is `M0 0`). */
const drawn = (surface: Locator) => surface.locator('path').evaluateAll(ps => ps.map(p => p.getAttribute('d') ?? '').filter(d => d !== 'M0 0'));

async function drawOn(page: Page, surface: Locator): Promise<void> {
  const box = await surface.boundingBox();
  if (!box) throw new Error('no drawing surface');
  const x = box.x + box.width * 0.3, y = box.y + box.height * 0.3;
  await page.mouse.move(x, y);
  await page.mouse.down();
  for (let i = 1; i <= 8; i++) await page.mouse.move(x + i * 8, y + i * 5);
  await page.mouse.up();
}

test('スケッチ: 2×2 の線が全画面・前面表示でも残る。すべて消去は元に戻せる。再読み込みで消える（保存しない）', async ({ page }) => {
  await open(page);
  await toWidget(page, 'sketch');
  const sk = w(page, 'sketch');
  const pad = sk.locator('svg[aria-label="手書きパッド"]');
  await expect(drawn(pad)).resolves.toHaveLength(0);
  await drawOn(page, pad);
  const lines = await drawn(pad);
  expect(lines).toHaveLength(1);
  expect(lines[0]).toContain(' L');

  // 設定で全画面に: the full-screen view shows the same strokes.
  await page.locator('.nav button[aria-label="ウィジェットを編集"]').click();
  await sk.click({ position: { x: 8, y: 8 } });
  const sheet = page.locator('.sheet.open[aria-label="ウィジェットの設定"]');
  await expect(sheet.locator('.sh .st')).toHaveText('スケッチ');
  await sheet.getByRole('button', { name: '全画面' }).click();
  await expect(sheet.getByRole('button', { name: '全画面' })).toHaveAttribute('aria-pressed', 'true');
  const fs = page.locator('.fsw[data-wid="sketch"]');
  await expect(fs).toBeAttached();
  await expect(drawn(fs.locator('.fsw-surf'))).resolves.toEqual(lines);
  // Back to 2×2.
  await sheet.getByRole('button', { name: '横2、縦2' }).click();
  await expect(page.locator('.fsw[data-wid="sketch"]')).toHaveCount(0);
  await sheet.getByRole('button', { name: '設定を閉じる' }).click();
  await page.keyboard.press('Escape');
  await expect(page.locator('.dash.edit')).toHaveCount(0);
  await toWidget(page, 'sketch');
  await expect(drawn(pad)).resolves.toEqual(lines);

  // 前面表示.
  await sk.getByRole('button', { name: '大きく表示' }).click();
  await expect(sk).toHaveClass(/\bbig\b/);
  await expect(drawn(pad)).resolves.toEqual(lines);

  // すべて消去 → 元に戻す.
  await sk.getByRole('button', { name: 'すべて消去' }).click();
  await expect(drawn(pad)).resolves.toHaveLength(0);
  await toast(page, 'スケッチを消去しました').getByRole('button', { name: '元に戻す' }).click();
  await expect(drawn(pad)).resolves.toEqual(lines);
  await sk.getByRole('button', { name: '元の大きさに戻す' }).click();
  await expect(sk).not.toHaveClass(/\bbig\b/);
  await expect(drawn(pad)).resolves.toEqual(lines);

  // Not saved: nothing of the strokes is in storage, and a reload starts empty.
  const firstPoint = /M([\d.]+ [\d.]+) L/.exec(lines[0] ?? '')?.[1] ?? '';
  expect(firstPoint).not.toBe('');
  expect(await page.evaluate(() => Object.keys(localStorage).map(k => localStorage.getItem(k) ?? '').join('\n'))).not.toContain(firstPoint);
  await page.reload();
  await toWidget(page, 'sketch');
  await expect(w(page, 'sketch').locator('svg[aria-label="手書きパッド"]')).toBeAttached();
  await expect(drawn(w(page, 'sketch').locator('svg[aria-label="手書きパッド"]'))).resolves.toHaveLength(0);
});

// ----- 録音（Chromium の偽のマイク） -----

async function openAdd(page: Page): Promise<void> {
  await page.locator('.nav button[aria-label^="ウィジェット一覧"]').click();
  await page.locator('.sheet.open[aria-label="ウィジェット一覧"]').getByRole('button', { name: 'ウィジェットを追加' }).click();
  await expect(page.locator('.sheet.open[aria-label="ウィジェットを追加"]')).toBeVisible();
}
async function useWithoutPlacing(page: Page, name: string): Promise<void> {
  if (!await page.locator('.sheet.open[aria-label="ウィジェットを追加"]').isVisible()) await openAdd(page);
  await page.locator('.sheet.open[aria-label="ウィジェットを追加"]').getByRole('button', { name: name + 'を置かずに使う' }).click();
}

test.describe('録音（Chromium の偽のマイク）', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', '偽のマイクは Chromium の起動オプション。WebKit は未確認');

  test('許可 → 録音 → 置かずに使うを閉じても録音が続く → 止めると録音の行が増える', async ({ page, context }) => {
    await open(page, {}, { unplaced: ['recorder'] });
    await useWithoutPlacing(page, '録音');
    const rec = w(page, 'recorder');
    await expect(rec).toHaveClass(/\btmp\b/);
    await expect(rec.locator('.cnr')).toHaveCount(0);
    // Not allowed yet: the widget asks first (the browser is asked only from the card's button).
    await rec.getByRole('button', { name: '録音を始める' }).click();
    const card = rec.locator('.pmw .perm');
    await expect(card).toBeVisible();
    await expect(card).not.toHaveClass(/\bwarnx\b/);
    await context.grantPermissions(['microphone']);
    await card.locator('.chip.pri').click();
    const stop = rec.getByRole('button', { name: '録音を止める' });
    await expect(stop).toHaveAttribute('aria-pressed', 'true');
    await expect(card).toHaveCount(0);

    // Closing the temporary use does not stop it.
    await page.locator('.tmpbar.open').getByRole('button', { name: '戻る' }).click();
    await expect(page.locator('.w[data-wid="recorder"]')).toHaveCount(0);
    await page.clock.runFor(1500);
    await page.waitForTimeout(1500);
    await useWithoutPlacing(page, '録音');
    await expect(stop).toHaveAttribute('aria-pressed', 'true');
    await expect(rec.locator('.num').first()).not.toHaveText('00:00.0');
    await stop.click();
    await expect(rec.getByRole('button', { name: '録音を始める' })).toHaveAttribute('aria-pressed', 'false');
    await expect(rec.locator('.cnr')).toHaveCount(1);
    await expect(rec.locator('.cnr').getByRole('button', { name: /の録音を再生$/ })).toBeVisible();
    // Recordings are not saved.
    expect(await page.evaluate(() => Object.keys(localStorage).filter(k => k.includes('recorder')))).toEqual([]);
  });

  test('マイクを断られたとき: 断られたときのカード（警告・もう一度・閉じる）。録音は始まらない', async ({ page }) => {
    await open(page);
    await toWidget(page, 'recorder');
    const rec = w(page, 'recorder');
    await rec.getByRole('button', { name: '録音を始める' }).click();
    const card = rec.locator('.pmw .perm');
    await expect(card).toBeVisible();
    await card.locator('.chip.pri').click();
    // Refused (the permission is not granted): the card turns to the refusal.
    await expect(card).toHaveClass(/\bwarnx\b/);
    await expect(card.locator('b')).not.toBeEmpty();
    await expect(card.locator('.chip.pri')).toBeVisible();
    await expect(card.locator('.chip.ghost')).toBeVisible();
    // Trying again is refused again.
    await card.locator('.chip.pri').click();
    await expect(card).toHaveClass(/\bwarnx\b/);
    await card.locator('.chip.ghost').click();
    await expect(rec.locator('.pmw')).toHaveCount(0);
    await expect(rec.getByRole('button', { name: '録音を始める' })).toHaveAttribute('aria-pressed', 'false');
    await expect(rec.locator('.cnr')).toHaveCount(0);
  });
});

// ----- 予定 -----

test('予定: 記録が空なら「メモを開く」。押すとメモが開く（未配置なら置かずに使う）', async ({ page }) => {
  await open(page, { agenda: { dv: 1, data: { events: [] } } }, { unplaced: ['memo'] });
  await toWidget(page, 'agenda');
  const ag = w(page, 'agenda');
  await expect(ag.locator('.row')).toHaveCount(0);
  await expect(page.locator('.w[data-wid="memo"]')).toHaveCount(0);
  await ag.getByRole('button', { name: 'メモを開く' }).click();
  const memo = w(page, 'memo');
  await expect(memo).toBeVisible();
  await expect(memo).toHaveClass(/\btmp\b/);
});

test('予定: 記録が空なら「メモを開く」。メモが置いてあればその画面に移る', async ({ page }) => {
  await open(page, { agenda: { dv: 1, data: { events: [] } } });
  await toWidget(page, 'agenda');
  await w(page, 'agenda').getByRole('button', { name: 'メモを開く' }).click();
  await expect(w(page, 'memo')).toBeInViewport();
  await expect(w(page, 'memo')).not.toHaveClass(/\btmp\b/);
});

// ----- 月間・週間 -----

test('月間・週間: 2026-11-23（勤労感謝の日）に祝日の下線と読み上げの祝日名', async ({ page }) => {
  await open(page, {}, { at: '2026-11-23T10:24:36+09:00' });
  await toWidget(page, 'month');
  const mo = w(page, 'month');
  await expect(mo).toContainText('2026.11');
  await expect(mo).toContainText('今日 勤労感謝の日');
  const hol = mo.locator('.td.hol');
  await expect(hol).toHaveCount(2);
  await expect(hol.nth(0)).toHaveText('3、文化の日');
  const today = mo.locator('.td.on');
  await expect(today).toHaveText('23、勤労感謝の日');
  await expect(today).toHaveClass(/\bhol\b/);
  await expect(today.locator('.vh')).toHaveText('、勤労感謝の日');
  expect(await today.evaluate(e => getComputedStyle(e).textDecorationLine)).toContain('underline');
  await expect(mo.locator('.td:not(.hol)').filter({ hasText: /^22$/ })).toHaveCount(1);

  await toWidget(page, 'week');
  const wk = w(page, 'week');
  const days = wk.locator('.wd');
  await expect(days).toHaveCount(7);
  await expect(days.locator('.dn')).toHaveText(['23、勤労感謝の日', '24', '25', '26', '27', '28', '29']);
  const wh = wk.locator('.wd.hol');
  await expect(wh).toHaveCount(1);
  await expect(wh).toHaveClass(/\bon\b/);
  await expect(wh).toContainText('月');
  await expect(wh.locator('.vh')).toHaveText('、勤労感謝の日');
  expect(await wh.locator('.dn').evaluate(e => getComputedStyle(e).textDecorationLine)).toContain('underline');
});
