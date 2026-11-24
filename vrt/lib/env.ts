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
 * Chromium を起動する。PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH があればそれを使う。
 * Playwright が期待する版の Chromium が無い環境（プリインストール版と版番号がずれている等）では、
 * PLAYWRIGHT_BROWSERS_PATH（既定 /opt/pw-browsers）にある chromium_headless_shell / chromium を探して使う。
 * `playwright install` はしない。
 */
export async function launchBrowser(): Promise<Browser> {
  const explicit = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
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

/**
 * 2回続けて同じ画像になるまで撮る（最大 maxTries 回）。CSS アニメーションは animations: 'disabled' で止める。
 */
export async function stableScreenshot(page: Page, maxTries = 6): Promise<{ png: Buffer; stable: boolean }> {
  let prev: Buffer | null = null;
  for (let i = 0; i < maxTries; i++) {
    const png = await page.screenshot({ animations: 'disabled', caret: 'hide', scale: 'css', fullPage: false });
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
    return await stableScreenshot(page);
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
