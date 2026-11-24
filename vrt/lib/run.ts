// 複数の撮影を並列で回す共通処理。
import type { Browser } from '@playwright/test';
import { capture } from './env.ts';
import type { Target } from './targets.ts';
import type { PlannedShot } from './cli.ts';

export interface ShotOutcome {
  shot: PlannedShot;
  png?: Buffer;
  stable?: boolean;
  error?: string;
  ms: number;
}

export async function shootAll(
  browser: Browser,
  target: Target,
  shots: PlannedShot[],
  opts: { jobs?: number; retries?: number; onDone?: (o: ShotOutcome) => void | Promise<void> } = {},
): Promise<ShotOutcome[]> {
  const jobs = Math.max(1, opts.jobs ?? 3);
  const retries = opts.retries ?? 1;
  const out: ShotOutcome[] = new Array(shots.length);
  let next = 0;
  const worker = async (): Promise<void> => {
    while (next < shots.length) {
      const i = next++;
      const shot = shots[i]!;
      const t0 = Date.now();
      let res: ShotOutcome = { shot, ms: 0 };
      for (let attempt = 0; attempt <= retries; attempt++) {
        try {
          const { png, stable } = await capture({
            browser,
            url: target.url,
            scenario: shot.scenario,
            viewport: shot.viewport,
            theme: shot.theme,
            storage: target.storage(shot.scenario.seed),
            appReady: target.ready,
          });
          res = { shot, png, stable, ms: Date.now() - t0 };
          break;
        } catch (e) {
          res = { shot, error: (e as Error).message, ms: Date.now() - t0 };
        }
      }
      out[i] = res;
      await opts.onDone?.(res);
    }
  };
  await Promise.all(Array.from({ length: Math.min(jobs, shots.length) }, worker));
  return out;
}
