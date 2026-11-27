// 本実装を描画して基準画像（プロトタイプ）と比べ、再現度を判定する。
//   npm run vrt [-- -s menu -v desktop -t dark] [--url http://127.0.0.1:5173/]
// URL を渡さなければ `npm run dev -- --host 127.0.0.1 --port 4174 --strictPort` を起動して使う。
// 合格ライン未達・撮影失敗・基準なしが1つでもあれば終了コード 1。
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { COMMON_HELP, parseCli, planShots } from './lib/cli.ts';
import { launchBrowser } from './lib/env.ts';
import { loadGalleryReport } from './lib/gallery.ts';
import { compareImages, PASS, PIXELMATCH, SSIM_OPTIONS } from './lib/metrics.ts';
import { environmentInfo, printTable, totals, writeReport, type ResultRow } from './lib/report.ts';
import { shootAll } from './lib/run.ts';
import { appTarget, VRT_DIR, type Target } from './lib/targets.ts';

const HELP = `使い方: npm run vrt -- [オプション] [シナリオ名...] [URL]
本実装を撮影して vrt/actual/ に保存し、vrt/baselines/ と比べて vrt/diff/ と vrt/report/ を作る。
  -u, --url <URL>         撮影する本実装の URL（省略時は dev サーバーを 4174 番で起動）
  -j, --jobs <数>         並列数（既定 3）
${COMMON_HELP}`;

async function main(): Promise<number> {
  const { filters, values, positionals } = parseCli({ url: { type: 'string' }, jobs: { type: 'string' } });
  if (values.help) {
    console.log(HELP);
    return 0;
  }
  const url = (values.url as string | undefined) ?? positionals.find((p) => /^https?:\/\//.test(p));
  const jobs = Number(values.jobs ?? 3) || 3;
  const shots = planShots(filters);
  const dirs = { baselines: join(VRT_DIR, 'baselines'), actual: join(VRT_DIR, 'actual'), diff: join(VRT_DIR, 'diff') };
  await mkdir(dirs.actual, { recursive: true });
  await mkdir(dirs.diff, { recursive: true });

  const rows = new Map<string, ResultRow>();
  const baselines = new Map<string, Buffer>();
  for (const s of shots) {
    // 前回の結果が残って紛らわしくならないよう、対象分だけ消す
    await rm(join(dirs.actual, `${s.id}.png`), { force: true });
    await rm(join(dirs.diff, `${s.id}.png`), { force: true });
    const row: ResultRow = { id: s.id, scenario: s.scenario.name, title: s.scenario.title, viewport: s.viewport, theme: s.theme, status: 'error', images: {} };
    const mask = typeof s.scenario.mask === 'function' ? s.scenario.mask(s.viewport) : (s.scenario.mask ?? []);
    if (mask.length) row.masked = mask;
    try {
      baselines.set(s.id, await readFile(join(dirs.baselines, `${s.id}.png`)));
      row.images.baseline = `baselines/${s.id}.png`;
    } catch {
      row.status = 'no-baseline';
      row.error = `基準画像 vrt/baselines/${s.id}.png がありません（npm run vrt:baseline）`;
    }
    rows.set(s.id, row);
  }

  let target: Target | null = null;
  let startError = '';
  try {
    target = await appTarget(url);
  } catch (e) {
    startError = (e as Error).message;
    console.error(startError);
  }

  const browser = target ? await launchBrowser() : null;
  const browserVersion = browser?.version() ?? null;
  try {
    if (target && browser) {
      console.log(`本実装 ${target.url} を ${shots.length} 枚撮影します`);
      await shootAll(browser, target, shots, {
        jobs,
        onDone: async (o) => {
          const row = rows.get(o.shot.id)!;
          if (!o.png) {
            row.status = 'error';
            row.error = `撮影失敗: ${o.error}`;
            return;
          }
          await writeFile(join(dirs.actual, `${o.shot.id}.png`), o.png);
          row.images.actual = `actual/${o.shot.id}.png`;
          row.unstable = !o.stable;
          const base = baselines.get(o.shot.id);
          if (!base) return; // no-baseline のまま
          const r = compareImages(base, o.png);
          await writeFile(join(dirs.diff, `${o.shot.id}.png`), r.diffPng);
          row.images.diff = `diff/${o.shot.id}.png`;
          Object.assign(row, { ssim: r.ssim, diffRatio: r.diffRatio, diffPixels: r.diffPixels, sizeMismatch: r.sizeMismatch });
          row.status = r.pass ? 'pass' : 'fail';
          if (r.sizeMismatch) row.error = `画像の大きさが違います（基準と実装）`;
        },
      });
    } else {
      for (const row of rows.values()) {
        if (row.status !== 'no-baseline') {
          row.status = 'error';
          row.error = `撮影失敗: ${startError.split('\n')[0]}`;
        }
      }
    }
  } finally {
    await browser?.close();
    await target?.close();
  }

  const results = shots.map((s) => rows.get(s.id)!);
  const summary = {
    generatedAt: new Date().toISOString(),
    appUrl: target?.url ?? null,
    thresholds: PASS,
    pixelmatch: PIXELMATCH,
    ssimOptions: SSIM_OPTIONS,
    environment: { ...environmentInfo(), browser: browserVersion },
    totals: totals(results),
    results,
    gallery: await loadGalleryReport(),
  };
  const html = await writeReport(summary);
  console.log('');
  printTable(results);
  const t = summary.totals;
  console.log(`\n合格 ${t.pass} / ${t.all}（不合格 ${t.fail}・撮影失敗 ${t.error}・基準なし ${t['no-baseline']}）`);
  console.log(`レポート: ${html}`);
  return t.pass === t.all ? 0 : 1;
}

main().then(
  (code) => process.exit(code),
  (e) => {
    console.error(e instanceof Error ? e.stack ?? e.message : e);
    process.exit(2);
  },
);
