// ブラウザ・ページの準備（時刻固定・テーマ・seed 注入）、操作手順の実行、安定した撮影。
import { chromium, devices, type Browser, type BrowserContext, type Page, type Locator } from '@playwright/test';
import type { Scenario, Seed, Step, ThemeName, ViewportName } from './types.ts';

/** 固定する時刻（JST）。ギャラリー画像の 10:24:36 / 11.19 木 に合わせている */
export const FIXED_TIME = '2026-11-19T10:24:36+09:00';
export const TIMEZONE = 'Asia/Tokyo';
export const LOCALE = 'ja-JP';

export const VIEWPORTS: Record<ViewportName, { width: number; height: number; isMobile: boolean; hasTouch: boolean; userAgent?: string }> = {
  desktop: { width: 1440, height: 900, isMobile: false, hasTouch: false },
  // UA は Pixel 7（Android Chrome）。iOS 判定で分岐する箇所を避けるため Android 側にそろえる
  mobile: { width: 390, height: 844, isMobile: true, hasTouch: true, userAgent: devices['Pixel 7']?.userAgent },
};

/**
 * 基準画像を撮った Chromium の版。版が違うとフォントの代替（`⌘` など）や描画がわずかに変わり、
 * 文字の多い画面で合格ラインを割ることがある（2026-11-27 の help mobile、SSIM 0.93）。違う版で撮ったら警告する。
 */
export const BASELINE_BROWSER_VERSION = '157.0.8103.78';

/**
 * Chromium を起動する。VRT_CHROMIUM_EXECUTABLE_PATH があればそれを使う。
 * e2e 用の PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH は**使わない**（e2e のコマンドと同じシェルで回したときに、
 * 基準画像と違う版の Chromium で撮ってしまうのを防ぐ）。
 * Playwright が期待する版の Chromium が無い環境（プリインストール版と版番号がずれている等）では、
 * PLAYWRIGHT_BROWSERS_PATH（既定 /opt/pw-browsers）にある chromium_headless_shell / chromium を探して使う。
 * `playwright install` はしない。
 */
export async function launchBrowser(): Promise<Browser> {
  const b = await launchChromium();
  if (!warnedVersion) {
    warnedVersion = true;
    if (process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH && !process.env.VRT_CHROMIUM_EXECUTABLE_PATH) {
      console.warn('[vrt] PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH は e2e 用なので使いません（再現度テストの Chromium は VRT_CHROMIUM_EXECUTABLE_PATH で指定）');
    }
    if (b.version() !== BASELINE_BROWSER_VERSION) {
      console.warn(`[vrt] 警告: Chromium ${b.version()} で撮ります。基準画像は ${BASELINE_BROWSER_VERSION} で撮ったので、文字の描画の差で数値が下がることがあります`);
    }
  }
  return b;
}
let warnedVersion = false;

async function launchChromium(): Promise<Browser> {
  const explicit = process.env.VRT_CHROMIUM_EXECUTABLE_PATH;
  if (explicit) return chromium.launch({ executablePath: explicit });
  try {
    return await chromium.launch();
  } catch (e) {
    if (!/Executable doesn't exist/.test((e as Error).message)) throw e;
    const base = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers';
    for (const cand of await chromiumCandidates(base)) {
      try {
        const b = await chromium.launch({ executablePath: cand });
        if (!warnedFallback) {
          warnedFallback = true;
          console.warn(`[vrt] Playwright 既定の Chromium が無いため ${cand}（${b.version()}）を使います`);
        }
        return b;
      } catch {
        /* 次の候補 */
      }
    }
    throw e;
  }
}
let warnedFallback = false;

async function chromiumCandidates(base: string): Promise<string[]> {
  const { readdir, access } = await import('node:fs/promises');
  const out: string[] = [];
  const add = async (p: string): Promise<void> => {
    try {
      await access(p);
      out.push(p);
    } catch {
      /* 無い */
    }
  };
  await add(`${base}/chromium_headless_shell`);
  await add(`${base}/chromium`);
  const names = await readdir(base).catch(() => [] as string[]);
  for (const n of names.sort().reverse()) {
    if (n.startsWith('chromium_headless_shell-')) await add(`${base}/${n}/chrome-headless-shell-linux64/chrome-headless-shell`);
  }
  for (const n of names.sort().reverse()) {
    if (/^chromium-\d+$/.test(n)) await add(`${base}/${n}/chrome-linux64/chrome`);
  }
  return out;
}

/** localStorage に入れる [キー, 値] の組 */
export type StorageEntries = Array<[string, string]>;

export interface PageOptions {
  viewport: ViewportName;
  theme: ThemeName;
  storage: StorageEntries;
}

/** 決定的な Math.random（mulberry32）。両対象に同じものを入れる */
function deterministicInit(arg: { entries: StorageEntries }): void {
  let a = 0x2f6f9f;
  Math.random = () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  // seed は最初の読み込み時だけ入れる（ページ内の保存で上書きされた後の再読込で戻さない）
  try {
    if (!sessionStorage.getItem('__vrt_seeded')) {
      sessionStorage.setItem('__vrt_seeded', '1');
      for (const [k, v] of arg.entries) localStorage.setItem(k, v);
    }
  } catch {
    /* storage が使えない環境では何もしない */
  }
}

export async function newPage(browser: Browser, opt: PageOptions): Promise<{ context: BrowserContext; page: Page }> {
  const vp = VIEWPORTS[opt.viewport];
  const context = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    screen: { width: vp.width, height: vp.height },
    deviceScaleFactor: 1,
    isMobile: vp.isMobile,
    hasTouch: vp.hasTouch,
    ...(vp.userAgent ? { userAgent: vp.userAgent } : {}),
    colorScheme: opt.theme,
    reducedMotion: 'no-preference',
    locale: LOCALE,
    timezoneId: TIMEZONE,
    serviceWorkers: 'block',
  });
  await context.addInitScript(deterministicInit, { entries: opt.storage });
  const page = await context.newPage();
  // Date / Date.now() を固定。タイマー（setTimeout / setInterval / rAF）は実時間で動き続けるので、
  // 長押し判定やトーストの表示時間はそのまま働き、秒表示だけが進まない。
  await page.clock.setFixedTime(new Date(FIXED_TIME));
  return { context, page };
}

function pick(page: Page, sel: string, nth?: number): Locator {
  const l = page.locator(sel);
  return nth === undefined ? l.first() : l.nth(nth);
}

async function touchLongPress(page: Page, target: Locator, ms: number): Promise<void> {
  await target.scrollIntoViewIfNeeded();
  const box = await target.boundingBox();
  if (!box) throw new Error('長押し対象の位置がとれません');
  const x = Math.round(box.x + box.width / 2);
  const y = Math.round(box.y + Math.min(box.height / 2, 80));
  const cdp = await page.context().newCDPSession(page);
  try {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
    await page.waitForTimeout(ms);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  } finally {
    await cdp.detach().catch(() => {});
  }
}

/** 折れ線の頂点（中心からの px のずれ）を、8px ごとの整数の点に細かく分ける */
export function densePath(path: [number, number][], every = 8): [number, number][] {
  const out: [number, number][] = [];
  path.forEach(([x1, y1], i) => {
    const prev = path[i - 1];
    if (!prev) {
      out.push([x1, y1]);
      return;
    }
    const [x0, y0] = prev;
    const dx = x1 - x0;
    const dy = y1 - y0;
    if (dx !== 0 && dy !== 0 && Math.abs(dx) !== Math.abs(dy)) throw new Error(`draw の線分は水平・垂直・45° にしてください: (${x0},${y0})→(${x1},${y1})`);
    const n = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / every));
    for (let k = 1; k <= n; k++) {
      // 45° の線分は dx = ±dy なので、k を n で割った位置も整数にそろえれば線の上に乗る
      const t = Math.min(Math.abs(dx || dy), Math.round((Math.abs(dx || dy) * k) / n));
      out.push([x0 + Math.sign(dx) * t, y0 + Math.sign(dy) * t]);
    }
  });
  return out;
}

/** 要素の中心を原点に1筆描く。desktop はマウス、mobile（タッチ）は CDP の touchStart → touchMove → touchEnd */
async function drawStroke(page: Page, target: Locator, path: [number, number][], touch: boolean): Promise<void> {
  const box = await target.boundingBox();
  if (!box) throw new Error('描く対象の位置がとれません');
  const cx = Math.round(box.x + box.width / 2);
  const cy = Math.round(box.y + box.height / 2);
  const [first, ...rest] = densePath(path).map(([x, y]) => ({ x: cx + x, y: cy + y }));
  if (!first) return;
  if (!touch) {
    await page.mouse.move(first.x, first.y);
    await page.mouse.down();
    for (const p of rest) await page.mouse.move(p.x, p.y);
    await page.mouse.up();
    return;
  }
  const cdp = await page.context().newCDPSession(page);
  try {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [first] });
    for (const p of rest) {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [p] });
      await page.waitForTimeout(16);
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  } finally {
    await cdp.detach().catch(() => {});
  }
}

const STEP_TIMEOUT = 8000;

export async function runSteps(page: Page, steps: Step[], viewport: ViewportName): Promise<void> {
  const touch = VIEWPORTS[viewport].hasTouch;
  for (const [i, st] of steps.entries()) {
    try {
      switch (st.do) {
        case 'click': {
          const l = pick(page, st.sel, st.nth);
          await l.waitFor({ state: 'visible', timeout: STEP_TIMEOUT });
          if (touch) await l.tap({ timeout: STEP_TIMEOUT });
          else await l.click({ timeout: STEP_TIMEOUT });
          break;
        }
        case 'rightClick': {
          const l = pick(page, st.sel, st.nth);
          await l.click({ button: 'right', timeout: STEP_TIMEOUT });
          break;
        }
        case 'menu': {
          const l = pick(page, st.sel, st.nth);
          await l.waitFor({ state: 'visible', timeout: STEP_TIMEOUT });
          if (touch) await touchLongPress(page, l, st.ms ?? 900);
          else await l.click({ button: 'right', timeout: STEP_TIMEOUT });
          break;
        }
        case 'longPress': {
          const l = pick(page, st.sel, st.nth);
          await l.waitFor({ state: 'visible', timeout: STEP_TIMEOUT });
          await touchLongPress(page, l, st.ms ?? 900);
          break;
        }
        case 'press':
          await page.keyboard.press(st.key);
          break;
        case 'waitFor':
          await pick(page, st.sel, st.nth).waitFor({ state: st.state ?? 'visible', timeout: st.timeout ?? STEP_TIMEOUT });
          break;
        case 'wait':
          await page.waitForTimeout(st.ms);
          break;
        case 'scrollIntoView':
          await pick(page, st.sel, st.nth).scrollIntoViewIfNeeded({ timeout: STEP_TIMEOUT });
          break;
        case 'mouseAway':
          await mouseAway(page, viewport);
          break;
        case 'draw': {
          const l = pick(page, st.sel, st.nth);
          await l.waitFor({ state: 'visible', timeout: STEP_TIMEOUT });
          await drawStroke(page, l, st.path, (st.input ?? (touch ? 'touch' : 'mouse')) === 'touch');
          break;
        }
      }
      // 状態遷移（シートの開閉など）を落ち着かせる
      if (st.do !== 'wait' && st.do !== 'waitFor') await page.waitForTimeout(350);
    } catch (e) {
      const what = 'sel' in st ? `${st.do} ${st.sel}` : st.do;
      throw new Error(`手順 ${i + 1}（${what}）で失敗: ${(e as Error).message.split('\n')[0]}`);
    }
  }
}

async function mouseAway(page: Page, viewport: ViewportName): Promise<void> {
  if (VIEWPORTS[viewport].hasTouch) return;
  // 左下隅（ウィジェットも下部バーもない位置）へ
  await page.mouse.move(0, VIEWPORTS[viewport].height - 1);
}

export async function waitFonts(page: Page): Promise<void> {
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
}

/** 覆い隠す範囲（Scenario.mask）を塗る色。両対象で同じ色にする */
export const MASK_COLOR = '#FF00FF';

/**
 * 2回続けて同じ画像になるまで撮る（最大 maxTries 回）。CSS アニメーションは animations: 'disabled' で止める。
 * mask のセレクタに当たる要素は MASK_COLOR で塗りつぶす（Playwright の screenshot の mask）。
 */
export async function stableScreenshot(page: Page, mask: string[] = [], maxTries = 6): Promise<{ png: Buffer; stable: boolean }> {
  let prev: Buffer | null = null;
  const masks = mask.map((sel) => page.locator(sel));
  for (let i = 0; i < maxTries; i++) {
    const png = await page.screenshot({ animations: 'disabled', caret: 'hide', scale: 'css', fullPage: false, mask: masks, maskColor: MASK_COLOR });
    if (prev && prev.equals(png)) return { png, stable: true };
    prev = png;
    await page.waitForTimeout(300);
  }
  return { png: prev as Buffer, stable: false };
}

export interface CaptureInput {
  browser: Browser;
  url: string;
  scenario: Scenario;
  viewport: ViewportName;
  theme: ThemeName;
  storage: StorageEntries;
  /** ページが描画を終えた目印（対象ごとに違う場合がある） */
  appReady: string;
}

export async function capture(input: CaptureInput): Promise<{ png: Buffer; stable: boolean }> {
  const { context, page } = await newPage(input.browser, { viewport: input.viewport, theme: input.theme, storage: input.storage });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  try {
    await page.goto(input.url, { waitUntil: 'load', timeout: 30000 });
    await page.locator(input.appReady).first().waitFor({ state: 'visible', timeout: 20000 });
    await waitFonts(page);
    await page.waitForTimeout(600);
    const steps = typeof input.scenario.steps === 'function' ? input.scenario.steps(input.viewport) : (input.scenario.steps ?? []);
    await runSteps(page, steps, input.viewport);
    const ready = typeof input.scenario.ready === 'function' ? input.scenario.ready(input.viewport) : input.scenario.ready;
    if (ready) await page.locator(ready).first().waitFor({ state: 'visible', timeout: STEP_TIMEOUT });
    await mouseAway(page, input.viewport);
    await waitFonts(page);
    await page.waitForTimeout(400);
    const mask = typeof input.scenario.mask === 'function' ? input.scenario.mask(input.viewport) : (input.scenario.mask ?? []);
    return await stableScreenshot(page, mask);
  } catch (e) {
    const extra = errors.length ? `（ページのエラー: ${errors.slice(0, 2).join(' / ')}）` : '';
    throw new Error(`${(e as Error).message}${extra}`);
  } finally {
    await context.close();
  }
}

export function seedEntries(key: string, seed: Seed | null | undefined): StorageEntries {
  return seed ? [[key, JSON.stringify(seed)]] : [];
}
