// 画像の比較: SSIM（ssim.js）と差分画素率（pixelmatch）。
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';
import { ssim } from 'ssim.js';

/** 合格ライン（ユーザー合意済み）: 1画面ごとに SSIM ≥ 0.95 かつ 差分画素率 ≤ 5% */
export const PASS = { ssim: 0.95, diffRatio: 0.05 } as const;
/** pixelmatch の設定: しきい値 0.1、アンチエイリアスの画素は差分に数えない */
export const PIXELMATCH = { threshold: 0.1, includeAA: false } as const;
/** ssim.js の設定（既定値を明示）: 11px 窓、weber 実装、短辺 256px 相当への縮小（Wang らの原典と同じ方式） */
export const SSIM_OPTIONS = { ssim: 'weber', downsample: 'original', windowSize: 11 } as const;

export interface CompareResult {
  width: number;
  height: number;
  /** 2枚の大きさが違った（大きい方に合わせ、はみ出しは差分扱い） */
  sizeMismatch: boolean;
  ssim: number;
  diffPixels: number;
  diffRatio: number;
  pass: boolean;
  diffPng: Buffer;
}

export function readPng(buf: Buffer): PNG {
  return PNG.sync.read(buf);
}

/** 大きさをそろえる（足りない部分は透明=差分になる） */
function padTo(img: PNG, w: number, h: number): PNG {
  if (img.width === w && img.height === h) return img;
  const out = new PNG({ width: w, height: h });
  out.data.fill(0);
  PNG.bitblt(img, out, 0, 0, Math.min(img.width, w), Math.min(img.height, h), 0, 0);
  return out;
}

export function compareImages(expectedBuf: Buffer, actualBuf: Buffer): CompareResult {
  const a0 = readPng(expectedBuf);
  const b0 = readPng(actualBuf);
  const width = Math.max(a0.width, b0.width);
  const height = Math.max(a0.height, b0.height);
  const sizeMismatch = a0.width !== b0.width || a0.height !== b0.height;
  const a = padTo(a0, width, height);
  const b = padTo(b0, width, height);
  const diff = new PNG({ width, height });
  const diffPixels = pixelmatch(a.data, b.data, diff.data, width, height, { ...PIXELMATCH });
  const diffRatio = diffPixels / (width * height);
  const { mssim } = ssim(
    { data: new Uint8ClampedArray(a.data), width, height },
    { data: new Uint8ClampedArray(b.data), width, height },
    { ...SSIM_OPTIONS },
  );
  const pass = !sizeMismatch && mssim >= PASS.ssim && diffRatio <= PASS.diffRatio;
  return { width, height, sizeMismatch, ssim: mssim, diffPixels, diffRatio, pass, diffPng: PNG.sync.write(diff) };
}
