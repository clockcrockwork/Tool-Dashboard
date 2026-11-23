// 参考比較: design/claude-design/gallery/*.webp（少し古い版のスクリーンショット）と、
// プロトタイプ現行版の対応する状態とを比べる。合否判定には使わない（古い版との差を記録するだけ）。
import { access, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Browser } from '@playwright/test';
import { scenarios } from '../scenarios.ts';
import { compareImages } from './metrics.ts';
import { shootAll } from './run.ts';
import { ROOT, VRT_DIR, type Target } from './targets.ts';
import type { ThemeName, ViewportName } from './types.ts';
import type { PlannedShot } from './cli.ts';

export const GALLERY_DIR = join(ROOT, 'design/claude-design/gallery');
export const GALLERY_PNG_DIR = join(VRT_DIR, '.cache/gallery');
export const GALLERY_DIFF_DIR = join(VRT_DIR, 'diff/gallery');
export const GALLERY_JSON = join(VRT_DIR, 'baselines/gallery-reference.json');

/** gallery のファイル名（d_/m_ + main/menu/sheet + _l/_d）→ プロトタイプのシナリオ */
const STATE_OF: Record<string, { scenario: string; note: string }> = {
  main: { scenario: 'home', note: 'ホーム（案内済み）' },
  menu: { scenario: 'menu', note: 'TODO のその他メニュー' },
  sheet: { scenario: 'settings', note: '全体の設定シート' },
};

export interface GalleryItem {
  gallery: string;
  viewport: ViewportName;
  theme: ThemeName;
  scenario: string;
  state: string;
  ssim?: number;
  diffRatio?: number;
  diffPixels?: number;
  galleryPng?: string;
  baselinePng?: string;
  diffPng?: string;
  error?: string;
}

export interface GalleryReport {
  generatedAt: string;
  note: string;
  items: GalleryItem[];
}

export function galleryPlan(): GalleryItem[] {
  const out: GalleryItem[] = [];
  for (const vp of ['d', 'm'] as const) {
    for (const st of ['main', 'menu', 'sheet'] as const) {
      for (const th of ['l', 'd'] as const) {
        const map = STATE_OF[st]!;
        let state = map.note;
        if (st === 'menu' && vp === 'm') {
          state =
            'TODO の長押しメニューで代用（gallery は下から出る「場所」の選択メニュー。現行版でこの選択メニューを持つ「日の出・日の入り」は初期ボードに無い）';
        }
        out.push({
          gallery: `${vp}_${st}_${th}`,
          viewport: vp === 'd' ? 'desktop' : 'mobile',
          theme: th === 'l' ? 'light' : 'dark',
          scenario: map.scenario,
          state,
        });
      }
    }
  }
  return out;
}

/** webp → png（Chromium で読み込んで canvas から書き出す） */
async function webpToPng(browser: Browser, webp: Buffer): Promise<Buffer> {
  const page = await browser.newPage();
  try {
    const dataUrl = await page.evaluate(async (b64: string) => {
      const img = new Image();
      img.src = `data:image/webp;base64,${b64}`;
      await img.decode();
      const c = document.createElement('canvas');
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      c.getContext('2d')!.drawImage(img, 0, 0);
      return c.toDataURL('image/png');
    }, webp.toString('base64'));
    return Buffer.from(dataUrl.split(',')[1]!, 'base64');
  } finally {
    await page.close();
  }
}

const exists = (p: string): Promise<boolean> =>
  access(p).then(
    () => true,
    () => false,
  );

export async function runGalleryReference(browser: Browser, target: Target, opts: { jobs?: number } = {}): Promise<GalleryReport> {
  await mkdir(GALLERY_PNG_DIR, { recursive: true });
  await mkdir(GALLERY_DIFF_DIR, { recursive: true });
  const files = new Set(await readdir(GALLERY_DIR).catch(() => [] as string[]));
  const items = galleryPlan();
  const baseDir = join(VRT_DIR, 'baselines');

  // 対応する基準画像が無ければ撮る
  const need: PlannedShot[] = [];
  for (const it of items) {
    const id = `${it.scenario}__${it.viewport}__${it.theme}`;
    if (!(await exists(join(baseDir, `${id}.png`))) && !need.some((n) => n.id === id)) {
      need.push({ id, scenario: scenarios.find((s) => s.name === it.scenario)!, viewport: it.viewport, theme: it.theme });
    }
  }
  if (need.length) {
    await mkdir(baseDir, { recursive: true });
    const res = await shootAll(browser, target, need, { jobs: opts.jobs ?? 3 });
    for (const r of res) if (r.png) await writeFile(join(baseDir, `${r.shot.id}.png`), r.png);
  }

  for (const it of items) {
    try {
      const src = `${it.gallery}.webp`;
      if (!files.has(src)) throw new Error(`${src} がありません`);
      const png = await webpToPng(browser, await readFile(join(GALLERY_DIR, src)));
      await writeFile(join(GALLERY_PNG_DIR, `${it.gallery}.png`), png);
      const basePath = join(baseDir, `${it.scenario}__${it.viewport}__${it.theme}.png`);
      const r = compareImages(png, await readFile(basePath));
      await writeFile(join(GALLERY_DIFF_DIR, `${it.gallery}.png`), r.diffPng);
      it.ssim = r.ssim;
      it.diffRatio = r.diffRatio;
      it.diffPixels = r.diffPixels;
      it.galleryPng = `.cache/gallery/${it.gallery}.png`;
      it.baselinePng = `baselines/${it.scenario}__${it.viewport}__${it.theme}.png`;
      it.diffPng = `diff/gallery/${it.gallery}.png`;
      if (r.sizeMismatch) it.error = `大きさが違います（${r.width}×${r.height} に合わせて比較）`;
    } catch (e) {
      it.error = (e as Error).message;
    }
  }
  const report: GalleryReport = {
    generatedAt: new Date().toISOString(),
    note: 'gallery（少し古い版）とプロトタイプ現行版の参考比較。合否判定には使わない。メモ欄の「メモ…」や上部の受け渡しの帯など、版の違いによる差を含む。',
    items,
  };
  await writeFile(GALLERY_JSON, JSON.stringify(report, null, 2) + '\n');
  return report;
}

export async function loadGalleryReport(): Promise<GalleryReport | null> {
  try {
    return JSON.parse(await readFile(GALLERY_JSON, 'utf8')) as GalleryReport;
  } catch {
    return null;
  }
}
