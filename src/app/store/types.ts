import type { FieldValue, Size } from '../registry/registry';
import type { Board, Pin } from '../layout/layout';

/** 全体設定 (gs). 仕様書 4章・実装ガイド 6章. */
export type GlobalSettings = {
  /** null = 自動 */
  theme: 'light' | 'dark' | null;
  /** accent index 0..4 (ブルー, ティール, バイオレット, ローズ, スレート) */
  acc: number;
  /** ガラスの透明感 0..100 */
  glass: number;
  /** 角の丸み 8..36 */
  rad: number;
  /** ウィジェットの大きさ 0 小 / 1 中 / 2 大 */
  dens: number;
  wheel: boolean;
  autoq: boolean;
  keys1: boolean;
  /** home board id ('' = first board) */
  home: string;
  /** 中身を隠す */
  veil: boolean;
};

/** Persisted layout + global state (区画「全体」). */
export type GlobalSection = {
  gs: GlobalSettings;
  groups: Board[];
  place: Record<string, string>;
  order: string[];
  sizes: Record<string, Size>;
  off: Record<string, boolean>;
  pins: Record<string, Pin>;
  lockSz: Record<string, boolean>;
  pgW: Record<string, boolean>;
  catHist: string[];
  seenW: string[];
  lastExp: number;
  since: number;
  nagAt: number;
  tourDone: boolean;
  /** 折りたたみの節の開閉 (this device only) */
  dsO: Record<string, boolean>;
};

export type WidgetCfg = Record<string, FieldValue>;

export type ToastKind = 'info' | 'ok' | 'warn';
export type ToastAct = { label: string; fn: () => void };
export type Toast = { id: number; text: string; kind: ToastKind; act: ToastAct | null; spin?: boolean; out?: boolean };

export type Panel = 'none' | 'global' | 'index' | 'add' | 'widget' | 'help' | 'devices';

export type DialogSpec = {
  title: string;
  msg: string;
  /** two buttons = irreversible confirmation (focus on キャンセル) */
  two: boolean;
  okLabel: string;
  bad?: boolean;
  onOk?: () => void;
};

export type MenuSpec = {
  kind: 'widget' | 'select';
  /** widget id for widget menu; key for select menu */
  id: string;
  x: number;
  y: number;
  /** origin for animation */
  origin: string;
  dock: '' | 'sheet';
};

/** Ephemeral UI state (not persisted). */
export type UiState = {
  t: number;
  page: number;
  edit: boolean;
  panel: Panel;
  sel: string | null;
  addFrom: 'none' | 'index' | 'edit' | 'empty';
  devFrom: 'global' | 'share' | 'none';
  /** add target board id */
  tgt: string | null;
  ret: Panel | null;
  temp: string | null;
  big: string | null;
  dlg: DialogSpec | null;
  toasts: Toast[];
  tour: number;
  peek: Record<string, boolean>;
  flash: string | null;
  catQ: string;
  mn: MenuSpec | null;
  mnQ: string;
  online: boolean;
  /** 新しい版の帯 */
  upd: boolean;
  updLater: boolean;
};

export type PersistedSnapshot = {
  global: GlobalSection;
  cfg: Record<string, WidgetCfg>;
  data: Record<string, unknown>;
};
