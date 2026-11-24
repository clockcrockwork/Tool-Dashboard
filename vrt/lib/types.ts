// シナリオ定義の型。scenarios.ts と各ランナーで共有する。

export type ViewportName = 'desktop' | 'mobile';
export type ThemeName = 'light' | 'dark';
/** 描画対象。prototype = Claude Design のプロトタイプ（正本）、app = Vue の本実装 */
export type TargetName = 'prototype' | 'app';

/**
 * 操作手順の1ステップ。セレクタはプロトタイプと本実装で共通のもの（クラス名・aria-label）を使う。
 * `sel` は Playwright のセレクタ文字列（CSS / :has-text() / text= など）。複数一致したら先頭を使う（`nth` で変更可）。
 */
export type Step =
  /** クリック（mobile ではタップ） */
  | { do: 'click'; sel: string; nth?: number; note?: string }
  /** desktop は右クリック、mobile は長押し（`ms`、既定 700ms + 余裕） */
  | { do: 'menu'; sel: string; nth?: number; ms?: number; note?: string }
  /** 右クリック（ビューポートに関係なく） */
  | { do: 'rightClick'; sel: string; nth?: number; note?: string }
  /** タッチで長押し（CDP の touchStart → 待つ → touchEnd） */
  | { do: 'longPress'; sel: string; nth?: number; ms?: number; note?: string }
  /** キー入力 */
  | { do: 'press'; key: string; note?: string }
  /** 要素が表示されるまで待つ */
  | { do: 'waitFor'; sel: string; nth?: number; state?: 'visible' | 'hidden' | 'attached' | 'detached'; timeout?: number; note?: string }
  /** 固定時間待つ（アニメーション・遅延表示の待ち合わせ） */
  | { do: 'wait'; ms: number; note?: string }
  /** 要素をスクロールして見える位置へ */
  | { do: 'scrollIntoView'; sel: string; nth?: number; note?: string }
  /** マウスを画面外（左上）へ逃がす。hover 状態の差を消すため */
  | { do: 'mouseAway'; note?: string };

/** 保存データ（seed）。対象ごとの localStorage への変換は targets.ts の seedFor で行う */
export type Seed = Record<string, unknown>;

export interface Scenario {
  /** ファイル名にも使う（英小文字とハイフン） */
  name: string;
  /** 何の状態か（レポート用、日本語） */
  title: string;
  /** 対象ビューポート（既定は両方） */
  viewports?: ViewportName[];
  /** 対象テーマ（既定は両方） */
  themes?: ThemeName[];
  /** 事前の保存データ。null/undefined なら何も入れない（初回起動） */
  seed?: Seed | null;
  /** 操作手順。関数ならビューポートごとに手順を変えられる */
  steps?: Step[] | ((vp: ViewportName) => Step[]);
  /** 撮影直前に待つ要素（安定待ちの目印） */
  ready?: string | ((vp: ViewportName) => string);
  /** 除外したビューポートの理由（レポートとドキュメント用） */
  skipNote?: string;
}

export interface Shot {
  scenario: string;
  viewport: ViewportName;
  theme: ThemeName;
}

export const shotId = (s: Shot): string => `${s.scenario}__${s.viewport}__${s.theme}`;
