import { expect, test, type Page } from '@playwright/test';
import { REGISTRY } from '../src/app/registry/registry';

/**
 * P2a 時間のウィジェットの操作（機能・データのゲート）: 打刻→タイムログと個別の元に戻す、ポモドーロの許可のお願いと終わり、
 * アラームが鳴る、ストップウォッチは始めた時刻から計算する。時刻は page.clock で進める（`clock.install` の時計は実時間でも
 * 進むので、期限の前後を確かめるときは準備のあとに `pauseAt` で止めてから `runFor` で進める）.
 * 実行管理（p2a-followup.md 1章）: 未配置のアラームが鳴る、一時利用で始めたポモドーロが閉じても一度だけ終わる・開き直しても
 * 二重に始まらない、人前では隠すの伏せた通知、設定パネルの「開いている間だけ」の一文、再読み込みで進行は消え設定は残る.
 */
const KINDS = ['gantt', 'world', 'alarm', 'pomo', 'countdown', 'stopwatch', 'punch', 'timelog'];
const VEILED_TOAST = '通知があります。人前では隠すがオンなので、内容はウィジェットで確認してください';

type Seed = { gs?: Record<string, unknown>; unplaced?: string[] };

async function open(page: Page, at: string, widgets: Record<string, Record<string, unknown>> = {}, seed: Seed = {}): Promise<void> {
  await page.clock.install({ time: new Date(at) });
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
  await expect(page.locator('.w[data-w="gantt"]')).toBeVisible();
}
const w = (page: Page, kind: string) => page.locator('.w[data-wid="' + kind + '"]');
const toWidget = async (page: Page, kind: string): Promise<void> => {
  await page.evaluate((k) => {
    const d = (window as unknown as { __lgdDash?: { layout: { value: { pos: Record<string, { page: number }> } }; go: (p: number, s: boolean) => void } }).__lgdDash;
    const p = d?.layout.value.pos[k];
    if (d && p) d.go(p.page, false);
  }, kind);
};

test.use({ timezoneId: 'Asia/Tokyo', locale: 'ja-JP' });

test('打刻: 出勤でタイムログにも記録し、元に戻すはその行だけを消す（あとの記入は残る）', async ({ page }) => {
  await open(page, '2026-11-19T10:24:36+09:00');
  await toWidget(page, 'punch');
  await w(page, 'punch').getByRole('button', { name: '出勤' }).click();
  const toast = page.locator('.toast').filter({ hasText: '出勤 10:24' });
  await expect(toast).toBeVisible();
  await expect(w(page, 'punch')).toContainText('勤務中');
  await toWidget(page, 'timelog');
  await expect(w(page, 'timelog').locator('li.tl').first()).toContainText('10:24出勤');
  await w(page, 'timelog').getByRole('textbox', { name: 'タイムログに記録' }).fill('会議');
  await w(page, 'timelog').getByRole('textbox', { name: 'タイムログに記録' }).press('Enter');
  await toast.getByRole('button', { name: '元に戻す' }).click();
  await expect(w(page, 'timelog').locator('li.tl')).toHaveCount(4);
  await expect(w(page, 'timelog')).not.toContainText('出勤');
  await expect(w(page, 'timelog').locator('li.tl').first()).toContainText('会議');
  await expect(w(page, 'punch')).toContainText('未出勤');
  const saved = await page.evaluate(() => [localStorage.getItem('lgd.v1:w:timelog') ?? '', localStorage.getItem('lgd.v1:w:punch') ?? '']);
  expect(saved[0]).toContain('会議');
  expect(saved[0]).not.toContain('出勤');
  expect(saved[1]).toContain('"sessions":[]');
});

test('ポモドーロ: 通知の許否がまだなら共通の枠の許可のお願い。「通知しない」で設定を切って始める', async ({ page }) => {
  await open(page, '2026-11-19T10:24:36+09:00');
  const pomo = w(page, 'pomo');
  const perm = await page.evaluate(() => Notification.permission);
  test.skip(perm !== 'default', 'この環境の通知の許可が ' + perm);
  await pomo.getByRole('button', { name: 'スタート・一時停止' }).click();
  await expect(pomo.locator('.pmw .perm')).toContainText('終わったら通知しますか？');
  await pomo.getByRole('button', { name: '通知しない' }).click();
  await expect(pomo.locator('.pmw')).toHaveCount(0);
  await expect(pomo.getByRole('button', { name: 'スタート・一時停止' })).toHaveAttribute('aria-pressed', 'true');
  expect(await page.evaluate(() => localStorage.getItem('lgd.v1:w:pomo') ?? '')).toContain('"notify":false');
});

test('ポモドーロ: 終わる時刻で終わり、完了を知らせる。計測は保存しない', async ({ page, context }) => {
  await context.grantPermissions(['notifications']);
  await open(page, '2026-11-19T10:24:36+09:00', { pomo: { cfg: { min: 5 } } });
  const pomo = w(page, 'pomo');
  await expect(pomo).toContainText('05:00');
  await pomo.getByRole('button', { name: 'スタート・一時停止' }).click();
  await expect(pomo.locator('.pmw')).toHaveCount(0);
  await page.clock.runFor(61_000);
  await expect(pomo).toContainText('03:59');
  expect(await page.evaluate(() => Object.keys(localStorage).map(k => localStorage.getItem(k) ?? '').join())).not.toContain('endAt');
  await page.clock.runFor(4 * 60_000);
  await expect(page.locator('.toast').filter({ hasText: 'ポモドーロ完了' })).toBeVisible();
  await expect(pomo).toContainText('05:00');
});

test('アラーム: オンの時刻の分に入ると鳴る。スイッチは保存される', async ({ page }) => {
  // `clock.install` の時計は実時間でも進む（読み込みとクリックで約1秒）。境目の前後を確かめるため、準備のあとで止めてから進める.
  await open(page, '2026-11-19T06:59:00+09:00');
  const alarm = w(page, 'alarm');
  await alarm.getByRole('switch', { name: 'アラーム 22:30' }).click();
  await expect(page.locator('.toast').filter({ hasText: '22:30 オン' })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('lgd.v1:w:alarm') ?? '')).toContain('"on":[true,true]');
  await page.clock.pauseAt(new Date('2026-11-19T06:59:50+09:00'));
  // Rings at 07:00:00, not before (the toast stays 3 s; the clock is paused, so it stays while the assertions wait).
  await page.clock.runFor(9_000);
  await expect(page.locator('.toast').filter({ hasText: 'アラーム 07:00' })).toHaveCount(0);
  await page.clock.runFor(2_000);
  await expect(page.locator('.toast').filter({ hasText: 'アラーム 07:00' })).toBeVisible();
});

test('ストップウォッチ: 経過は始めた時刻から。ラップ', async ({ page }) => {
  await open(page, '2026-11-19T10:24:36+09:00');
  await toWidget(page, 'stopwatch');
  const sw = w(page, 'stopwatch');
  await sw.getByRole('button', { name: 'スタート・ストップ' }).click();
  await page.clock.runFor(2_500);
  const face = sw.locator('.num').first();
  await expect(face).toHaveText(/^00:0[23]\.\d$/);
  await sw.getByRole('button', { name: 'ラップ' }).click();
  await expect(sw).toContainText('L1');
  await sw.getByRole('button', { name: 'スタート・ストップ' }).click();
  const stopped = await face.textContent();
  await page.clock.runFor(5_000);
  await expect(face).toHaveText(stopped ?? '');
  await sw.getByRole('button', { name: 'リセット' }).click();
  await expect(face).toHaveText('00:00.0');
});

async function openAdd(page: Page): Promise<void> {
  await page.locator('.nav button[aria-label^="ウィジェット一覧"]').click();
  await page.locator('.sheet.open[aria-label="ウィジェット一覧"]').getByRole('button', { name: 'ウィジェットを追加' }).click();
  await expect(page.locator('.sheet.open[aria-label="ウィジェットを追加"]')).toBeVisible();
}
/** ▶ 置かずに使う from 「ウィジェットを追加」 (closing temporary use returns to that sheet, so it may be open already). */
async function useWithoutPlacing(page: Page, name: string): Promise<void> {
  if (!await page.locator('.sheet.open[aria-label="ウィジェットを追加"]').isVisible()) await openAdd(page);
  await page.locator('.sheet.open[aria-label="ウィジェットを追加"]').getByRole('button', { name: name + 'を置かずに使う' }).click();
}
const closeTemp = async (page: Page): Promise<void> => { await page.locator('.tmpbar.open').getByRole('button', { name: '戻る' }).click(); };

test.describe('実行管理（Dashboard が持つ。配置・表示と分ける）', () => {
  test('アラーム: 未配置で部品が無くても、オンの時刻に鳴る', async ({ page }) => {
    await open(page, '2026-11-19T06:59:00+09:00', {}, { unplaced: ['alarm'] });
    await expect(page.locator('.w[data-wid="alarm"]')).toHaveCount(0);
    await page.clock.pauseAt(new Date('2026-11-19T06:59:50+09:00'));
    await page.clock.runFor(11_000);
    await expect(page.locator('.toast').filter({ hasText: 'アラーム 07:00' })).toBeVisible();
  });

  test('アラーム: 人前では隠すがオンでも鳴り、伏せた文だけを出す（時刻を出さない）', async ({ page }) => {
    await open(page, '2026-11-19T06:59:00+09:00', { alarm: { cfg: { veil: true }, dv: 1, data: { on: [true, false] } } }, { gs: { veil: true } });
    await expect(w(page, 'alarm')).toHaveClass(/\bveil\b/);
    await page.clock.pauseAt(new Date('2026-11-19T06:59:50+09:00'));
    await page.clock.runFor(11_000);
    await expect(page.locator('.toast').filter({ hasText: VEILED_TOAST })).toBeVisible();
    await expect(page.locator('.toasts')).not.toContainText('07:00');
    await expect(page.locator('.toasts')).not.toContainText('アラーム');
  });

  test('アラーム: スイッチをオンにしたとき、通知の許否がまだなら共通の枠の許可のお願い（オンのまま）', async ({ page }) => {
    await open(page, '2026-11-19T10:24:36+09:00');
    const perm = await page.evaluate(() => Notification.permission);
    test.skip(perm !== 'default', 'この環境の通知の許可が ' + perm);
    const alarm = w(page, 'alarm');
    await alarm.getByRole('switch', { name: 'アラーム 22:30' }).click();
    await expect(alarm.locator('.pmw .perm')).toContainText('鳴ったら通知しますか？');
    await alarm.getByRole('button', { name: '通知しない' }).click();
    await expect(alarm.locator('.pmw')).toHaveCount(0);
    await expect(alarm.getByRole('switch', { name: 'アラーム 22:30' })).toHaveAttribute('aria-checked', 'true');
    // Not asked again for this placement in this session.
    await alarm.getByRole('switch', { name: 'アラーム 22:30' }).click();
    await alarm.getByRole('switch', { name: 'アラーム 22:30' }).click();
    await expect(alarm.locator('.pmw')).toHaveCount(0);
  });

  test('ポモドーロ: 一時利用で始めて閉じても一度だけ終わる。開き直しても二重に始まらない', async ({ page, context }) => {
    await context.grantPermissions(['notifications']);
    await open(page, '2026-11-19T10:24:36+09:00', { pomo: { cfg: { min: 5 } } }, { unplaced: ['pomo'] });
    await useWithoutPlacing(page, 'ポモドーロ');
    const pomo = w(page, 'pomo');
    await expect(pomo).toHaveClass(/\btmp\b/);
    await pomo.getByRole('button', { name: 'スタート・一時停止' }).click();
    await expect(pomo.getByRole('button', { name: 'スタート・一時停止' })).toHaveAttribute('aria-pressed', 'true');
    await closeTemp(page);
    await expect(page.locator('.w[data-wid="pomo"]')).toHaveCount(0);
    await page.clock.runFor(2 * 60_000);
    // Reopened: the same run goes on (not started again from 05:00).
    await useWithoutPlacing(page, 'ポモドーロ');
    await expect(pomo).toContainText('03:00');
    await expect(pomo.getByRole('button', { name: 'スタート・一時停止' })).toHaveAttribute('aria-pressed', 'true');
    await closeTemp(page);
    const done = page.locator('.toast').filter({ hasText: 'ポモドーロ完了' });
    await page.clock.runFor(3 * 60_000);
    await expect(done).toHaveCount(1);
    await page.clock.runFor(10 * 60_000);
    await expect(done).toHaveCount(0);
    await useWithoutPlacing(page, 'ポモドーロ');
    await expect(pomo).toContainText('05:00');
    await expect(pomo.getByRole('button', { name: 'スタート・一時停止' })).toHaveAttribute('aria-pressed', 'false');
  });

  test('再読み込み: ポモドーロの進行は消え、アラームの設定とスイッチは残る', async ({ page, context }) => {
    await context.grantPermissions(['notifications']);
    await open(page, '2026-11-19T10:24:36+09:00', { pomo: { cfg: { min: 5 } } });
    await w(page, 'pomo').getByRole('button', { name: 'スタート・一時停止' }).click();
    await w(page, 'alarm').getByRole('switch', { name: 'アラーム 22:30' }).click();
    await page.clock.runFor(61_000);
    await expect(w(page, 'pomo')).toContainText('03:59');
    await page.reload();
    await expect(w(page, 'pomo')).toContainText('05:00');
    await expect(w(page, 'pomo').getByRole('button', { name: 'スタート・一時停止' })).toHaveAttribute('aria-pressed', 'false');
    await expect(w(page, 'alarm').getByRole('switch', { name: 'アラーム 22:30' })).toHaveAttribute('aria-checked', 'true');
  });

  test('設定パネル: 通知を使う種類には「開いている間だけ知らせます」の一文（共通の部品）', async ({ page }) => {
    await open(page, '2026-11-19T10:24:36+09:00');
    await page.locator('.nav button[aria-label="ウィジェットを編集"]').click();
    const sheet = page.locator('.sheet.open[aria-label="ウィジェットの設定"]');
    const settingsOf = async (kind: string): Promise<void> => {
      await w(page, kind).click();
      await expect(sheet.locator('.sh .st')).toHaveText(REGISTRY[kind]?.n ?? '');
    };
    const closeSheet = async (): Promise<void> => { await sheet.getByRole('button', { name: '設定を閉じる' }).click(); await expect(sheet).toHaveCount(0); };
    await settingsOf('pomo');
    await expect(sheet).toContainText('ダッシュボードを開いている間だけ知らせます');
    await closeSheet();
    await settingsOf('alarm');
    await expect(sheet).toContainText('ダッシュボードを開いている間だけ知らせます');
    await closeSheet();
    await settingsOf('countdown');
    await expect(sheet).not.toContainText('開いている間だけ');
  });
});
