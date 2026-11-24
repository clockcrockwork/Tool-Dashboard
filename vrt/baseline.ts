// プロトタイプ（正本）を描画して基準画像を vrt/baselines/ に保存する。
//   npm run vrt:baseline [-- -s menu,settings -v desktop -t dark] [--no-gallery] [--gallery-only]
// ランタイム（support.js）の場所は環境変数 PROTOTYPE_RUNTIME（未指定なら lib/targets.ts の DEFAULT_RUNTIME）。
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { COMMON_HELP, parseCli, planShots } from './lib/cli.ts';
import { launchBrowser } from './lib/env.ts';
import { runGalleryReference } from './lib/gallery.ts';
import { shootAll } from './lib/run.ts';
import { prototypeTarget, VRT_DIR } from './lib/targets.ts';

const HELP = `使い方: npm run vrt:baseline -- [オプション] [シナリオ名...]
プロトタイプを撮影して vrt/baselines/<scenario>__<desktop|mobile>__<light|dark>.png を作り直す。
  --no-gallery            gallery 画像との参考比較を省く
  --gallery-only          gallery 参考比較だけ行う（基準画像は作らない）
  -j, --jobs <数>         並列数（既定 3）
${COMMON_HELP}`;

async function main(): Promise<number> {
  const { filters, values } = parseCli({ 'no-gallery': { type: 'boolean' }, 'gallery-only': { type: 'boolean' }, jobs: { type: 'string' } });
  if (values.help) {
    console.log(HELP);
    return 0;
  }
  const jobs = Number(values.jobs ?? 3) || 3;
  const target = await prototypeTarget();
  const browser = await launchBrowser();
  let failed = 0;
  try {
    if (!values['gallery-only']) {
      const shots = planShots(filters);
      const dir = join(VRT_DIR, 'baselines');
      await mkdir(dir, { recursive: true });
      console.log(`プロトタイプ ${target.url} を ${shots.length} 枚撮影します`);
      await shootAll(browser, target, shots, {
        jobs,
        onDone: async (o) => {
          if (o.png) {
            await writeFile(join(dir, `${o.shot.id}.png`), o.png);
            console.log(`  ok   ${o.shot.id}  ${(o.ms / 1000).toFixed(1)}s${o.stable ? '' : '  (安定せず: 最後の1枚を保存)'}`);
          } else {
            failed++;
            console.log(`  FAIL ${o.shot.id}  ${o.error}`);
          }
        },
      });
    }
    const filtered = filters.scenarios.length || filters.viewports.length || filters.themes.length;
    if (!values['no-gallery'] && (!filtered || values['gallery-only'])) {
      console.log('\ngallery 画像（古い版）との参考比較');
      const ref = await runGalleryReference(browser, target, { jobs });
      for (const r of ref.items) {
        console.log(
          r.error
            ? `  FAIL ${r.gallery}  ${r.error}`
            : `  ${r.gallery.padEnd(12)} SSIM ${r.ssim!.toFixed(4)}  差分 ${(r.diffRatio! * 100).toFixed(2)}%  (${r.state})`,
        );
      }
    }
  } finally {
    await browser.close();
    await target.close();
  }
  if (failed) console.log(`\n${failed} 枚の撮影に失敗しました`);
  return failed ? 1 : 0;
}

main().then(
  (code) => process.exit(code),
  (e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(2);
  },
);
