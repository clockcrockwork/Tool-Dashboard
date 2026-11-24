import { expect, test, type Page } from '@playwright/test';
import { REGISTRY } from '../src/app/registry/registry';

/**
 * P2a 時間のウィジェットの操作（機能・データのゲート）: 打刻→タイムログと個別の元に戻す、ポモドーロの許可のお願いと終わり、
 * アラームが鳴る、ストップウォッチは始めた時刻から計算する。時刻は page.clock で進める.
 */
const KINDS = ['gantt', 'world', 'alarm', 'pomo', 'countdown', 'stopwatch', 'punch', 'timelog'];

async function open(page: Page, at: string, widgets: Record<string, Record<string, unknown>> = {}): Promise<void> {
  await page.clock.install({ time: new Date(at) });
  const items: Record<string, string> = {
    'lgd.v1:global': JSON.stringify({
      v: 1, tourDone: true, groups: [{ id: 'g0', n: 'ボード 1' }], order: Object.keys(REGISTRY),
      off: Object.fromEntries(Object.keys(REGISTRY).filter(k => !KINDS.includes(k)).map(k => [k, true])),
      place: Object.fromEntries(KINDS.map(k => [k, 'g0'])),
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
  expect(saved[1]).toContain('"stamps":[]');
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
  await open(page, '2026-11-19T06:59:50+09:00');
  const alarm = w(page, 'alarm');
  await alarm.getByRole('switch', { name: 'アラーム 22:30' }).click();
  await expect(page.locator('.toast').filter({ hasText: '22:30 オン' })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('lgd.v1:w:alarm') ?? '')).toContain('"on":[true,true]');
  // Rings at 07:00:00 (the toast stays 3 s, so stop just after).
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
