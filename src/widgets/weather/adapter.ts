/**
 * 天気の取得の境界 (P4 で実際の取得先に差し替える). 今は見本: 段のデータが一定時間後に「届いた」ことにするだけで、中身は
 * `sample.ts` の見本を出す（接続の点で見本であることを示す。実際に取得できたとは扱わない）。
 * 取得は `signal` で止められる。止めたあとに届いた応答は、呼んだ側（`status.ts`）でも捨てる。
 */
export type WxTier = 'base' | 'hours' | 'week';

export type WeatherAdapter = Readonly<{
  /** Resolves when the tier's data has arrived; rejects when aborted or failed. */
  fetchTier: (tier: WxTier, signal: AbortSignal) => Promise<void>;
}>;

/** 見本の取得: `ms` 後に届く（約1.1秒の下書き → 表示）. */
export function sampleAdapter(ms = 1100): WeatherAdapter {
  return {
    fetchTier: (_tier, signal) => new Promise<void>((resolve, reject) => {
      if (signal.aborted) { reject(new DOMException('Aborted', 'AbortError')); return; }
      const t = setTimeout(resolve, ms);
      signal.addEventListener('abort', () => { clearTimeout(t); reject(new DOMException('Aborted', 'AbortError')); }, { once: true });
    }),
  };
}
