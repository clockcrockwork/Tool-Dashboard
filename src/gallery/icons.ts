/**
 * 部品シートに出てくるアイコンのうち、まだ `src/app/parts/icons.ts`（IC）に無いもの。
 * パスは design/claude-design/Parts.dc.html から写した。部品の担当が IC に足したら、ここから消して IC を使う。
 */
import { IC } from '../app/parts/icons';

export const GIC = {
  gear: 'M9.84 4.92L10.17 2.58A9.6 9.6 0 0 1 13.83 2.58L14.16 4.92A7.4 7.4 0 0 1 15.47 5.47L17.37 4.04A9.6 9.6 0 0 1 19.96 6.63L18.53 8.53A7.4 7.4 0 0 1 19.08 9.84L21.42 10.17A9.6 9.6 0 0 1 21.42 13.83L19.08 14.16A7.4 7.4 0 0 1 18.53 15.47L19.96 17.37A9.6 9.6 0 0 1 17.37 19.96L15.47 18.53A7.4 7.4 0 0 1 14.16 19.08L13.83 21.42A9.6 9.6 0 0 1 10.17 21.42L9.84 19.08A7.4 7.4 0 0 1 8.53 18.53L6.63 19.96A9.6 9.6 0 0 1 4.04 17.37L5.47 15.47A7.4 7.4 0 0 1 4.92 14.16L2.58 13.83A9.6 9.6 0 0 1 2.58 10.17L4.92 9.84A7.4 7.4 0 0 1 5.47 8.53L4.04 6.63A9.6 9.6 0 0 1 6.63 4.04L8.53 5.47A7.4 7.4 0 0 1 9.84 4.92ZM15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z',
  search: 'M10.5 4.5a6 6 0 1 0 0 12 6 6 0 0 0 0-12zM15 15l5 5',
  copy: 'M9 9h10v10H9zM5 15V5h10',
  download: 'M12 4v11M7.5 10.5L12 15l4.5-4.5M5 19h14',
  upload: 'M12 15V4M8 8l4-4 4 4M5 13v6h14v-6',
  trash: 'M5 7h14M9.5 7V4.5h5V7M7 7l1 13h8l1-13',
  info: 'M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17zM12 11v5M12 7.8v.2',
  clock: 'M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17zM12 7.5V12l3 2',
  calendar: 'M4.5 6h15v14h-15zM4.5 10h15M8.5 3.5v4M15.5 3.5v4',
  image: 'M4 5h16v14H4zM4 15l4.5-4.5 4 4 2.5-2.5 5 5M15.5 9.5h.1',
  mic: 'M12 4a3 3 0 0 0-3 3v5a3 3 0 0 0 6 0V7a3 3 0 0 0-3-3zM6 11.5a6 6 0 0 0 12 0M12 17.5V20',
  location: 'M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0C18.5 15.4 12 21 12 21zM12 7.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z',
  bell: 'M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15zM10 20.5h4',
  external: 'M14 4h6v6M20 4l-9 9M18 14v6H4V6h6',
  more: 'M6 12h.1M12 12h.1M18 12h.1',
  chevDown: 'M6 9.5l6 6 6-6',
  /** 全画面の時計の右上（IC.pause とは線の位置が違う） */
  pause: 'M9 6v12M15 6v12',
} as const;

/** 2章「アイコン」の見本（部品シートと同じ順）。 */
export const ICON_SAMPLES: readonly (readonly [name: string, d: string])[] = [
  ['grid', IC.grid],
  ['gear', GIC.gear],
  ['pen', IC.pen],
  ['plus', IC.plus],
  ['back', IC.back],
  ['search', GIC.search],
  ['copy', GIC.copy],
  ['download', GIC.download],
  ['upload', GIC.upload],
  ['trash', GIC.trash],
  ['info', GIC.info],
  ['toastWarn', IC.toastWarn],
  ['clock', GIC.clock],
  ['calendar', GIC.calendar],
  ['image', GIC.image],
  ['mic', GIC.mic],
  ['location', GIC.location],
  ['bell', GIC.bell],
  ['pin', IC.pin],
  ['lock', IC.lock],
  ['eyeOff', IC.eyeOff],
  ['reload', IC.reload],
  ['external', GIC.external],
  ['more', GIC.more],
];
