export const DOWS = ['日', '月', '火', '水', '木', '金', '土'] as const;
export const p2 = (n: number): string => String(n).padStart(2, '0');

/** Clock text: 「10:24」「36」「11.19 木」. */
export function clockParts(now: Date, h12: boolean, sec: boolean): { hm: string; ss: string; dateLine: string } {
  const hr = now.getHours();
  const hm = (h12 ? String(hr % 12 || 12) : p2(hr)) + ':' + p2(now.getMinutes());
  return {
    hm,
    ss: sec ? p2(now.getSeconds()) : '',
    dateLine: String(now.getMonth() + 1) + '.' + String(now.getDate()) + ' ' + (DOWS[now.getDay()] ?? ''),
  };
}

/** Seconds progress bar of the full-screen clock: 0 → 1 over a minute (prototype `secScale`). */
export function secScale(now: Date): string {
  return (now.getSeconds() / 59).toFixed(3);
}

/** grid-area of a full-screen view on screen `idx` (prototype `focusArea`). */
export function fullScreenArea(idx: number, cols: number, rows: number): string {
  return '1 / ' + String(Math.max(0, idx) * cols + 1) + ' / span ' + String(rows) + ' / span ' + String(cols);
}

/** Negative margin that lets the view reach the screen edges past the grid padding (prototype `focusMargin`). */
export function fullScreenMargin(padT: number, halfGap: number, padB: number): string {
  return '-' + String(padT) + 'px -' + String(halfGap) + 'px -' + String(padB) + 'px';
}
