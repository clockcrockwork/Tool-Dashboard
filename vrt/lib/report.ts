// レポート（vrt/report/index.html と summary.json）と標準出力の表。
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { PASS, PIXELMATCH, SSIM_OPTIONS } from './metrics.ts';
import { BASELINE_BROWSER_VERSION, FIXED_TIME, LOCALE, TIMEZONE } from './env.ts';
import { VRT_DIR } from './targets.ts';
import type { GalleryReport } from './gallery.ts';

export type Status = 'pass' | 'fail' | 'error' | 'no-baseline';

export interface ResultRow {
  id: string;
  scenario: string;
  title: string;
  viewport: string;
  theme: string;
  status: Status;
  ssim?: number;
  diffRatio?: number;
  diffPixels?: number;
  sizeMismatch?: boolean;
  unstable?: boolean;
  error?: string;
  /** 覆い隠した範囲のセレクタ（両対象で同じ色に塗った。Scenario.mask） */
  masked?: string[];
  /** vrt/ からの相対パス */
  images: { baseline?: string; actual?: string; diff?: string };
}

export interface Summary {
  generatedAt: string;
  appUrl: string | null;
  thresholds: typeof PASS;
  pixelmatch: typeof PIXELMATCH;
  ssimOptions: typeof SSIM_OPTIONS;
  environment: { time: string; timezone: string; locale: string; browser?: string | null; baselineBrowser?: string };
  totals: Record<Status, number> & { all: number };
  results: ResultRow[];
  gallery: GalleryReport | null;
}

const STATUS_JA: Record<Status, string> = { pass: '合格', fail: '不合格', error: '撮影失敗', 'no-baseline': '基準なし' };
const pct = (v?: number): string => (v === undefined ? '-' : `${(v * 100).toFixed(2)}%`);
const num = (v?: number): string => (v === undefined ? '-' : v.toFixed(4));

export function totals(rows: ResultRow[]): Summary['totals'] {
  const t = { pass: 0, fail: 0, error: 0, 'no-baseline': 0, all: rows.length };
  for (const r of rows) t[r.status]++;
  return t;
}

export function printTable(rows: ResultRow[]): void {
  const head = ['シナリオ', 'ビューポート', 'テーマ', 'SSIM', '差分率', '判定'];
  const body = rows.map((r) => [r.scenario, r.viewport, r.theme, num(r.ssim), pct(r.diffRatio), STATUS_JA[r.status]]);
  const width = (s: string): number => [...s].reduce((n, ch) => n + (ch.charCodeAt(0) > 0xff ? 2 : 1), 0);
  const cols = head.map((h, i) => Math.max(width(h), ...body.map((b) => width(b[i]!))));
  const line = (cells: string[]): string => cells.map((c, i) => c + ' '.repeat(cols[i]! - width(c))).join('  ');
  console.log(line(head));
  console.log(cols.map((c) => '-'.repeat(c)).join('  '));
  for (const [i, b] of body.entries()) {
    console.log(line(b));
    const r = rows[i]!;
    if (r.error) console.log(`    └ ${r.error.split('\n')[0]}`);
  }
}

const esc = (s: string): string => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const img = (p: string | undefined, alt: string): string =>
  p ? `<a href="../${esc(p)}" target="_blank"><img loading="lazy" src="../${esc(p)}" alt="${esc(alt)}"></a>` : `<div class="noimg">${esc(alt)}なし</div>`;

export function renderHtml(s: Summary): string {
  const t = s.totals;
  const rows = s.results
    .map(
      (r) => `<tr class="${r.status}"><td><a href="#${esc(r.id)}">${esc(r.scenario)}</a></td><td>${esc(r.viewport)}</td><td>${esc(r.theme)}</td>
<td class="n ${r.ssim !== undefined && r.ssim < s.thresholds.ssim ? 'ng' : ''}">${num(r.ssim)}</td>
<td class="n ${r.diffRatio !== undefined && r.diffRatio > s.thresholds.diffRatio ? 'ng' : ''}">${pct(r.diffRatio)}</td>
<td><span class="st ${r.status}">${STATUS_JA[r.status]}</span></td></tr>`,
    )
    .join('\n');
  const cards = s.results
    .map(
      (r) => `<section class="card ${r.status}" id="${esc(r.id)}">
<h3><span class="st ${r.status}">${STATUS_JA[r.status]}</span> ${esc(r.scenario)} · ${esc(r.viewport)} · ${esc(r.theme)} <small>${esc(r.title)}</small></h3>
<p class="m">SSIM <b>${num(r.ssim)}</b>（基準 ≥ ${s.thresholds.ssim}） · 差分率 <b>${pct(r.diffRatio)}</b>（基準 ≤ ${pct(s.thresholds.diffRatio)}）${
        r.diffPixels !== undefined ? ` · ${r.diffPixels.toLocaleString('ja-JP')} 画素` : ''
      }${r.sizeMismatch ? ' · <b class="ng">大きさが違う</b>' : ''}${r.unstable ? ' · 画面が安定しなかった' : ''}${
        r.masked?.length ? ` · 覆い隠し（両対象）: <code>${esc(r.masked.join(', '))}</code>` : ''
      }</p>
${r.error ? `<pre class="err">${esc(r.error)}</pre>` : ''}
<div class="tri ${r.viewport}"><figure>${img(r.images.baseline, '基準')}<figcaption>基準（プロトタイプ）</figcaption></figure><figure>${img(
        r.images.actual,
        '実装',
      )}<figcaption>実装</figcaption></figure><figure>${img(r.images.diff, '差分')}<figcaption>差分</figcaption></figure></div>
</section>`,
    )
    .join('\n');
  const g = s.gallery;
  const gRows = g
    ? g.items
        .map(
          (i) => `<tr><td>${esc(i.gallery)}</td><td>${esc(i.viewport)}</td><td>${esc(i.theme)}</td><td>${esc(i.state)}</td><td class="n">${num(
            i.ssim,
          )}</td><td class="n">${pct(i.diffRatio)}</td><td>${i.error ? esc(i.error) : ''}</td></tr>`,
        )
        .join('\n')
    : '';
  const gCards = g
    ? g.items
        .map(
          (i) => `<section class="card" id="g-${esc(i.gallery)}"><h3>${esc(i.gallery)} <small>${esc(i.state)}</small></h3>
<p class="m">SSIM <b>${num(i.ssim)}</b> · 差分率 <b>${pct(i.diffRatio)}</b></p>
<div class="tri ${esc(i.viewport)}"><figure>${img(i.galleryPng, 'gallery')}<figcaption>gallery（古い版）</figcaption></figure><figure>${img(
            i.baselinePng,
            '基準',
          )}<figcaption>プロトタイプ現行版</figcaption></figure><figure>${img(i.diffPng, '差分')}<figcaption>差分</figcaption></figure></div></section>`,
        )
        .join('\n')
    : '';
  return `<!doctype html>
<html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>再現度レポート</title>
<style>
:root{--bg:#f5f6f8;--fg:#1b1f24;--mut:#5b6470;--card:#fff;--line:#d9dde3;--ok:#1f7a45;--ng:#b3261e;--warn:#9a6700}
@media (prefers-color-scheme:dark){:root{--bg:#0f1216;--fg:#e8ebef;--mut:#9aa4b0;--card:#181c22;--line:#2a3038;--ok:#4cc38a;--ng:#ff6b61;--warn:#e3b341}}
body{margin:0;background:var(--bg);color:var(--fg);font:14px/1.6 system-ui,"Noto Sans JP",sans-serif}
main{max-width:1500px;margin:0 auto;padding:16px}
h1{font-size:20px;margin:8px 0}h2{font-size:17px;margin:28px 0 8px}h3{font-size:15px;margin:0 0 4px}small{color:var(--mut);font-weight:400;margin-left:6px}
.sum{display:flex;gap:12px;flex-wrap:wrap}.sum div{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:8px 14px}.sum b{font-size:20px;display:block}
p.note{color:var(--mut);margin:4px 0}
table{border-collapse:collapse;width:100%;background:var(--card);border:1px solid var(--line);border-radius:10px;overflow:hidden}
th,td{padding:5px 10px;border-bottom:1px solid var(--line);text-align:left}td.n{text-align:right;font-variant-numeric:tabular-nums}td.ng,.ng{color:var(--ng)}
.st{display:inline-block;border-radius:99px;padding:0 8px;font-size:12px;font-weight:600;border:1px solid currentColor}
.st.pass{color:var(--ok)}.st.fail{color:var(--ng)}.st.error,.st.no-baseline{color:var(--warn)}
.card{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:12px;margin:12px 0}
.m{margin:0 0 8px;color:var(--mut)}.m b{color:var(--fg)}
.tri{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.tri.mobile{max-width:900px}
figure{margin:0}figure img{width:100%;height:auto;display:block;border:1px solid var(--line);border-radius:6px}figcaption{color:var(--mut);font-size:12px;text-align:center}
.noimg{aspect-ratio:16/10;display:grid;place-items:center;border:1px dashed var(--line);border-radius:6px;color:var(--mut)}
.tri.mobile .noimg{aspect-ratio:390/844}
pre.err{white-space:pre-wrap;color:var(--ng);background:transparent;margin:0 0 8px;font-size:12px}
.wrap{overflow-x:auto}
@media (max-width:700px){.tri{grid-template-columns:1fr}}
</style></head><body><main>
<h1>再現度レポート（プロトタイプ ↔ 本実装）</h1>
<p class="note">${esc(s.generatedAt)} · 実装 ${esc(s.appUrl ?? '（起動できず）')} · 時刻 ${esc(s.environment.time)}（${esc(s.environment.timezone)}, ${esc(s.environment.locale)}） · Chromium ${esc(s.environment.browser ?? '-')}（基準 ${esc(s.environment.baselineBrowser ?? '-')}）</p>
<p class="note">合格ライン: 1画面ごとに SSIM ≥ ${s.thresholds.ssim} かつ 差分画素率 ≤ ${pct(s.thresholds.diffRatio)}（pixelmatch threshold ${s.pixelmatch.threshold}、アンチエイリアス無視）</p>
<div class="sum"><div>合格<b>${t.pass} / ${t.all}</b></div><div>不合格<b>${t.fail}</b></div><div>撮影失敗<b>${t.error}</b></div><div>基準なし<b>${t['no-baseline']}</b></div></div>
<h2>結果</h2>
<div class="wrap"><table><thead><tr><th>シナリオ</th><th>ビューポート</th><th>テーマ</th><th>SSIM</th><th>差分率</th><th>判定</th></tr></thead><tbody>
${rows}
</tbody></table></div>
${cards}
<h2>参考: gallery（古い版）とプロトタイプ現行版</h2>
<p class="note">合否判定には使わない。gallery は少し古い版のため「メモ…」の行や上部の受け渡しの帯など版の違いを含む。${g ? `記録 ${esc(g.generatedAt)}` : 'まだ記録がありません（npm run vrt:baseline で作成）'}</p>
${
  g
    ? `<div class="wrap"><table><thead><tr><th>gallery</th><th>ビューポート</th><th>テーマ</th><th>対応させた状態</th><th>SSIM</th><th>差分率</th><th>備考</th></tr></thead><tbody>${gRows}</tbody></table></div>${gCards}`
    : ''
}
</main></body></html>
`;
}

export async function writeReport(s: Summary): Promise<string> {
  const dir = join(VRT_DIR, 'report');
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, 'summary.json'), JSON.stringify(s, null, 2) + '\n');
  const html = join(dir, 'index.html');
  await writeFile(html, renderHtml(s));
  return html;
}

export function environmentInfo(): Summary['environment'] {
  return { time: FIXED_TIME, timezone: TIMEZONE, locale: LOCALE, baselineBrowser: BASELINE_BROWSER_VERSION };
}
