// 引数の解釈と撮影リストの組み立て。
import { parseArgs } from 'node:util';
import { scenarios } from '../scenarios.ts';
import type { Scenario, ThemeName, ViewportName } from './types.ts';

export interface Filters {
  scenarios: string[];
  viewports: ViewportName[];
  themes: ThemeName[];
}

export interface PlannedShot {
  id: string;
  scenario: Scenario;
  viewport: ViewportName;
  theme: ThemeName;
}

const split = (v: string | string[] | undefined): string[] =>
  (Array.isArray(v) ? v : v ? [v] : []).flatMap((x) => x.split(',')).map((x) => x.trim()).filter(Boolean);

export function parseCli(extra: Record<string, { type: 'string' | 'boolean' }> = {}): {
  filters: Filters;
  values: Record<string, string | boolean | string[] | undefined>;
  positionals: string[];
} {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      scenario: { type: 'string', short: 's', multiple: true },
      viewport: { type: 'string', short: 'v', multiple: true },
      theme: { type: 'string', short: 't', multiple: true },
      help: { type: 'boolean', short: 'h' },
      ...extra,
    },
  });
  const vps = split(values.viewport as string[] | undefined);
  const ths = split(values.theme as string[] | undefined);
  for (const v of vps) if (v !== 'desktop' && v !== 'mobile') throw new Error(`--viewport は desktop / mobile: ${v}`);
  for (const t of ths) if (t !== 'light' && t !== 'dark') throw new Error(`--theme は light / dark: ${t}`);
  const names = split(values.scenario as string[] | undefined);
  // 位置引数もシナリオ名として受ける（npm run vrt -- menu settings）。URL らしいものは除く
  for (const p of positionals) if (!/^https?:\/\//.test(p)) names.push(...split(p));
  const known = new Set(scenarios.map((s) => s.name));
  for (const n of names) if (!known.has(n)) throw new Error(`知らないシナリオ: ${n}（${[...known].join(', ')}）`);
  return {
    filters: { scenarios: names, viewports: vps as ViewportName[], themes: ths as ThemeName[] },
    values: values as Record<string, string | boolean | string[] | undefined>,
    positionals,
  };
}

export function planShots(f: Filters): PlannedShot[] {
  const out: PlannedShot[] = [];
  for (const sc of scenarios) {
    if (f.scenarios.length && !f.scenarios.includes(sc.name)) continue;
    for (const vp of sc.viewports ?? (['desktop', 'mobile'] as const)) {
      if (f.viewports.length && !f.viewports.includes(vp)) continue;
      for (const th of sc.themes ?? (['light', 'dark'] as const)) {
        if (f.themes.length && !f.themes.includes(th)) continue;
        out.push({ id: `${sc.name}__${vp}__${th}`, scenario: sc, viewport: vp, theme: th });
      }
    }
  }
  return out;
}

export const COMMON_HELP = `
  -s, --scenario <名前>   シナリオで絞り込む（カンマ区切り・複数指定可。位置引数でも可）
  -v, --viewport <名前>   desktop / mobile で絞り込む
  -t, --theme <名前>      light / dark で絞り込む
  -h, --help              この説明
シナリオ: ${scenarios.map((s) => s.name).join(', ')}`;
