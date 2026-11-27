/**
 * 現在地の取得の境界（ブラウザの Geolocation）. テストとストーリーで差し替える（`setSunGeoSource`）。
 * 位置は端末の外に送らない。取得した値は呼んだ側（`status.ts`）が小数2桁に丸めて runtime にだけ置く（保存しない）。
 */
export type GeoPoint = Readonly<{ lat: number; lng: number }>;
export type GeoSource = Readonly<{
  /** The position, or null when refused, unavailable or timed out. Asking the browser may show its prompt. */
  get: () => Promise<GeoPoint | null>;
}>;

export const BROWSER_GEO: GeoSource = {
  get: () => new Promise<GeoPoint | null>((resolve) => {
    try {
      if (typeof navigator === 'undefined' || !navigator.geolocation) { resolve(null); return; }
      navigator.geolocation.getCurrentPosition(
        (p) => { resolve({ lat: p.coords.latitude, lng: p.coords.longitude }); },
        () => { resolve(null); },
        { maximumAge: 3_600_000, timeout: 15_000 },
      );
    } catch {
      resolve(null);
    }
  }),
};

let source: GeoSource = BROWSER_GEO;

export function geoSource(): GeoSource {
  return source;
}
/** Tests and stories: replace the browser side. */
export function setSunGeoSource(s: GeoSource): void {
  source = s;
}
export function resetSunGeoSource(): void {
  source = BROWSER_GEO;
}
