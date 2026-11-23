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
