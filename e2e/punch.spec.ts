import { expect, test, type Page } from '@playwright/test';
import { REGISTRY } from '../src/app/registry/registry';

/**
 * 打刻（作り直し、docs/lgd/p2a-followup.md 4章）の機能・データのゲート:
 * (a) 業務の種類は前回選んだものが既定（再読み込みしても残る）、(b) 種類の追加・名前・削除と「元に戻す」で元の位置に戻る、
 * (c) v1 の記録（打刻の並び）はセッションに移って dv:2 で保存される／組にできない v1 は区画をロックして保存 bytes を変えない、
 * (d) 集計は出勤の時刻で決める（夜勤は出勤した日・月に入る）.
 * 打刻は見た目もプロトタイプから変わったので、再現度テストでは打刻の範囲を覆い隠している（docs/lgd/vrt.md）。見た目は
 * Storybook（PunchWidget）とここで確かめる.
 */
const KINDS = ['gantt', 'world', 'alarm', 'pomo', 'countdown', 'stopwatch', 'punch', 'timelog'];
const PUNCH_KEY = 'lgd.v1:w:punch';
const LOCKED_TOAST = 'この版では読めない保存データがあります。上書きせずに残しています';

/** Opens the board with the P2a kinds placed. `sections` are written to `lgd.v1:w:<id>` as given (raw strings). */
async function open(page: Page, at: string, sections: Record<string, string> = {}): Promise<void> {
  await page.clock.install({ time: new Date(at) });
  const items: Record<string, string> = {
    'lgd.v1:global': JSON.stringify({
      v: 1, tourDone: true, groups: [{ id: 'g0', n: 'ボード 1' }], order: Object.keys(REGISTRY),
      off: Object.fromEntries(Object.keys(REGISTRY).filter(k => !KINDS.includes(k)).map(k => [k, true])),
      place: Object.fromEntries(KINDS.map(k => [k, 'g0'])),
    }),
  };
  for (const [id, raw] of Object.entries(sections)) items['lgd.v1:w:' + id] = raw;
  await page.addInitScript((s) => {
    if (sessionStorage.getItem('seeded')) return;
    for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v);
    sessionStorage.setItem('seeded', '1');
  }, items);
  await page.goto('/');
  await expect(page.locator('.w[data-w="gantt"]')).toBeVisible();
}
const w = (page: Page, kind: string) => page.locator('.w[data-wid="' + kind + '"]');
/** Moves the board to the page that has the placement (mobile splits the board into pages). */
async function toWidget(page: Page, kind: string): Promise<void> {
  await page.evaluate((k) => {
    const d = (window as unknown as { __lgdDash?: { layout: { value: { pos: Record<string, { page: number }> } }; go: (p: number, s: boolean) => void } }).__lgdDash;
    const p = d?.layout.value.pos[k];
    if (d && p) d.go(p.page, false);
  }, kind);
  await expect(w(page, kind)).toBeInViewport();
}
const chips = (page: Page) => w(page, 'punch').locator('.tgts[aria-label="業務の種類"] .chip:not(.sm)');
const chip = (page: Page, name: string) => w(page, 'punch').locator('.tgts').getByRole('button', { name, exact: true });
const savedPunch = (page: Page) => page.evaluate((k) => localStorage.getItem(k), PUNCH_KEY);
type Saved = { v: number; dv: number; data: { types: { id: number; n: string }[]; last: number; sessions: { id: number; ty: number; n: string; st: number; en: number | null; br: { st: number; en: number | null }[] }[] } };
const parse = (raw: string | null): Saved => JSON.parse(raw ?? 'null') as Saved;
const T = (iso: string): number => new Date(iso).getTime();

test.use({ timezoneId: 'Asia/Tokyo', locale: 'ja-JP' });

test('(a) 副業を選んで出勤 → 再読み込みしても副業が選ばれたまま（前回選んだ種類が既定）', async ({ page }) => {
  await open(page, '2026-11-19T10:24:36+09:00');
  await toWidget(page, 'punch');
  await expect(chips(page)).toHaveText(['本業', '副業']);
  await expect(chip(page, '本業')).toHaveAttribute('aria-pressed', 'true');
  await chip(page, '副業').click();
  await expect(chip(page, '副業')).toHaveAttribute('aria-pressed', 'true');
  await w(page, 'punch').getByRole('button', { name: '出勤', exact: true }).click();
  await expect(page.locator('.toast').filter({ hasText: '出勤 10:24（副業）' })).toBeVisible();
  await expect(w(page, 'punch')).toContainText('勤務中');

  await page.reload();
  await expect(page.locator('.w[data-w="gantt"]')).toBeVisible();
  await toWidget(page, 'punch');
  await expect(chip(page, '副業')).toHaveAttribute('aria-pressed', 'true');
  await expect(chip(page, '本業')).toHaveAttribute('aria-pressed', 'false');
  await expect(w(page, 'punch')).toContainText('勤務中');
  const s = parse(await savedPunch(page));
  expect(s.dv).toBe(2);
  expect(s.data.last).toBe(2);
  expect(s.data.sessions).toHaveLength(1);
  expect(s.data.sessions[0]).toMatchObject({ ty: 2, n: '副業', st: T('2026-11-19T10:24:36+09:00'), en: null });
  // タイムログの行の文にも種類が入る.
  await toWidget(page, 'timelog');
  await expect(w(page, 'timelog').locator('li.tl').last()).toContainText('出勤（副業）');
});

test('(b) ＋で種類を追加 → 名前を変えて Enter → 削除 → 「元に戻す」で元の位置に戻る', async ({ page }) => {
  await open(page, '2026-11-19T10:24:36+09:00');
  await toWidget(page, 'punch');
  const punch = w(page, 'punch');
  await punch.getByRole('button', { name: '業務の種類を追加' }).click();
  await expect(chips(page)).toHaveText(['本業', '副業', '種類3']);
  await expect(chip(page, '種類3')).toHaveAttribute('aria-pressed', 'true');
  const name = punch.getByRole('textbox', { name: '種類の名前' });
  await expect(name).toHaveValue('種類3');
  await name.fill('残業');
  await name.press('Enter');
  await expect(chips(page)).toHaveText(['本業', '副業', '残業']);
  expect(parse(await savedPunch(page)).data.types.map(t => t.n)).toEqual(['本業', '副業', '残業']);

  // 名前を変えた種類（末尾）を消して戻す.
  await punch.getByRole('button', { name: 'この種類を削除' }).click();
  await expect(chips(page)).toHaveText(['本業', '副業']);
  expect(parse(await savedPunch(page)).data.types.map(t => t.n)).toEqual(['本業', '副業']);
  await page.locator('.toast').filter({ hasText: '「残業」を削除しました' }).getByRole('button', { name: '元に戻す' }).click();
  await expect(chips(page)).toHaveText(['本業', '副業', '残業']);
  await expect(chip(page, '残業')).toHaveAttribute('aria-pressed', 'true');

  // 間の種類を消して戻しても、元の位置（2番目）に戻る.
  await chip(page, '副業').click();
  await punch.getByRole('button', { name: 'この種類を削除' }).click();
  await expect(chips(page)).toHaveText(['本業', '残業']);
  await page.locator('.toast').filter({ hasText: '「副業」を削除しました' }).getByRole('button', { name: '元に戻す' }).click();
  await expect(chips(page)).toHaveText(['本業', '副業', '残業']);
  await expect(chip(page, '副業')).toHaveAttribute('aria-pressed', 'true');
  const s = parse(await savedPunch(page));
  expect(s.data.types).toEqual([{ id: 1, n: '本業' }, { id: 2, n: '副業' }, { id: 3, n: '残業' }]);
  expect(s.data.last).toBe(2);
});

test.describe('(c) v1 の記録（打刻の並び）', () => {
  const st = T('2026-11-18T09:00:00+09:00');
  const v1 = (stamps: { id: number; k: string; t: number }[]): string => JSON.stringify({ v: 1, dv: 1, cfg: {}, data: { stamps } });

  test('組にできる v1 はセッションに移り、次の保存で dv:2 になる（種類は既定の1つ目）', async ({ page }) => {
    const raw = v1([
      { id: 1, k: 'in', t: st },
      { id: 2, k: 'break', t: st + 3 * 3600_000 },
      { id: 3, k: 'resume', t: st + 4 * 3600_000 },
      { id: 4, k: 'out', t: st + 9 * 3600_000 },
    ]);
    await open(page, '2026-11-19T10:24:36+09:00', { punch: raw });
    await toWidget(page, 'punch');
    const punch = w(page, 'punch');
    await expect(page.locator('.toast').filter({ hasText: LOCKED_TOAST })).toHaveCount(0);
    await expect(punch).toContainText('前回 11/18(水) 09:00–18:00');
    await expect(punch).toContainText('今日 0:00　今月 8:00');
    await expect(chip(page, '本業')).toHaveAttribute('aria-pressed', 'true');
    // 読んだだけでは書かない（読んだ形が保存の基準）。変更すると移した形で書く.
    expect(await savedPunch(page)).toBe(raw);
    await chip(page, '副業').click();
    await expect.poll(async () => parse(await savedPunch(page)).dv).toBe(2);
    const s = parse(await savedPunch(page));
    expect(s.v).toBe(1);
    expect(s.data).not.toHaveProperty('stamps');
    expect(s.data.last).toBe(2);
    expect(s.data.sessions).toEqual([
      { id: 1, ty: 1, n: '本業', st, en: st + 9 * 3600_000, br: [{ st: st + 3 * 3600_000, en: st + 4 * 3600_000 }] },
    ]);
    // 再読み込みしても v2 として読める.
    await page.reload();
    await toWidget(page, 'punch');
    await expect(w(page, 'punch')).toContainText('今日 0:00　今月 0:00');
    await chip(page, '本業').click();
    await expect(w(page, 'punch')).toContainText('今日 0:00　今月 8:00');
  });

  test('組にできない v1（勤務中の出勤）は区画をロックし、操作しても保存 bytes を変えない', async ({ page }) => {
    const raw = v1([
      { id: 1, k: 'in', t: st },
      { id: 2, k: 'in', t: st + 3600_000 },
      { id: 3, k: 'out', t: st + 9 * 3600_000 },
    ]);
    await open(page, '2026-11-19T10:24:36+09:00', { punch: raw });
    await expect(page.locator('.toast').filter({ hasText: LOCKED_TOAST })).toBeVisible();
    await toWidget(page, 'punch');
    const punch = w(page, 'punch');
    // 記録は既定（空）のまま描く。操作はできても、その区画は書かない.
    await expect(punch).toContainText('未出勤');
    await chip(page, '副業').click();
    await punch.getByRole('button', { name: '出勤', exact: true }).click();
    await expect(punch).toContainText('勤務中');
    // ほかの区画（タイムログ）は書かれる＝保存は動いている.
    await expect.poll(() => page.evaluate(() => localStorage.getItem('lgd.v1:w:timelog') ?? '')).toContain('出勤（副業）');
    expect(await savedPunch(page)).toBe(raw);
    await page.reload();
    expect(await savedPunch(page)).toBe(raw);
    await expect(page.locator('.toast').filter({ hasText: LOCKED_TOAST })).toBeVisible();
  });
});

test.describe('(d) 集計は出勤の時刻で決める', () => {
  test('夜勤: 前日 22:00 に出勤 → 今日の合計に入らず、今月に入る（退勤しても同じ）', async ({ page }) => {
    await open(page, '2026-11-18T22:00:00+09:00');
    await toWidget(page, 'punch');
    const punch = w(page, 'punch');
    await punch.getByRole('button', { name: '出勤', exact: true }).click();
    await expect(punch).toContainText('勤務中');
    await expect(punch).toContainText('今日 0:00　今月 0:00');
    // 日をまたいで 06:00 へ.
    await page.clock.fastForward('08:00:00');
    await expect(punch).toContainText('8:00:00');
    await expect(punch).toContainText('出 11/18(水) 22:00');
    await expect(punch).toContainText('今日 0:00　今月 8:00');
    await punch.getByRole('button', { name: '退勤', exact: true }).click();
    await expect(punch).toContainText('退勤済み');
    await expect(punch).toContainText('前回 11/18(水) 22:00–翌06:00');
    await expect(punch).toContainText('今日 0:00　今月 8:00');
    const s = parse(await savedPunch(page));
    expect(s.data.sessions).toHaveLength(1);
    expect(s.data.sessions[0]).toMatchObject({ st: T('2026-11-18T22:00:00+09:00'), en: T('2026-11-19T06:00:00+09:00') });
  });

  test('月末の夜勤: 10/31 22:00 に出勤して 11/1 に退勤したセッションは 11 月に入らない', async ({ page }) => {
    const st = T('2026-10-31T22:00:00+09:00');
    const rec = { types: [{ id: 1, n: '本業' }, { id: 2, n: '副業' }], last: 1, sessions: [{ id: st, ty: 1, n: '本業', st, en: st + 8 * 3600_000, br: [] }] };
    await open(page, '2026-11-01T10:00:00+09:00', { punch: JSON.stringify({ v: 1, dv: 2, cfg: {}, data: rec }) });
    await toWidget(page, 'punch');
    const punch = w(page, 'punch');
    await expect(punch).toContainText('前回 10/31(土) 22:00–翌06:00');
    await expect(punch).toContainText('今日 0:00　今月 0:00');
  });
});
