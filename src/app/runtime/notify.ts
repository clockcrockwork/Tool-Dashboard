/**
 * 共通の通知（p2a-followup.md 2・3章、仕様書 4章「許可のお願い」、実装ガイド 4章「通信と許可の出し方」・7.2）.
 *
 * 対象は登録の `perm` に `'notify'` を持つ種類。種類は送る内容（文・重さ・重複を見分ける key）を渡すだけにし、次はここが受け持つ。
 *  - 通知の設定: その種類の `tg` の項目 `notify`（ポモドーロ「完了を通知」など）。項目が無い種類（アラーム）は常にオン。
 *    オフなら何も出さない（プロトタイプと同じ）。通知できるかどうかは実行の可否にしない（実行は呼ぶ側が続ける）。
 *  - 許可の状態: 共通の `permOf(d, 'notify')`（`Notification.permission` と Permissions API。保存しない）。通知の仕組みが
 *    無い環境は「断られた」と同じ（トーストだけで知らせる）。
 *  - 人前では隠す: 隠している配置の知らせは、どの種類でも同じ伏せた文にする（ウィジェット名・時刻・内容を出さない）。
 *  - 出し分け: 画面の中は必ずトースト。タブが裏にあって許可済みなら、ブラウザの通知も出す（開いている間だけ。Web Push は使わない）。
 *  - 重複の防止: 同じ key は1度だけ。伏せた知らせは、出ているあいだ重ねない（ブラウザの通知は同じ tag で置き換える）。
 *
 * 許可の状態・お願いのカード・ブラウザへの問い合わせ・断られたときの表示は、どの許可でも共通の `permission.ts` が受け持つ。
 * ここに残すのは通知に特有のこと: お願いを出すかどうか（通知の設定がオン・この配置で「通知しない」を選んでいない）と
 * 「通知しない」（通知の設定をオフにする）、送る・伏せる。お願いは必ず明示の操作（スタート・スイッチ）から `askNotify()` で始め、
 * 「通知を許可」を押したときだけブラウザに問い合わせる。断られた・閉じたときも、続きの操作は止めない。
 */
import type { Dashboard } from '../store/store';
import type { ToastKind } from '../store/types';
import { defOf } from '../registry/instances';
import type { WidgetDef } from '../registry/registry';
import {
  askPerm, browserPermOf, permAskOf, permOf, requestPerm, resetPermBrowser, setPermAsk, type AskCopy, type PermState,
} from './permission';

/** `ok` 許可済み, `no` 断られた・この環境では出せない, `''` まだ聞いていない. */
export type NotifyPerm = PermState;

/** 伏せた知らせの文（p2a-followup.md 2章。どの種類でも同じ）. */
export const VEILED_TOAST = '通知があります。人前では隠すがオンなので、内容はウィジェットで確認してください';
export const VEILED_TITLE = '通知があります';
export const VEILED_BODY = '人前では隠すがオンなので、内容はダッシュボードで確認してください';
/** The browser notification tag of the hidden-content notice (a newer one replaces the older). */
export const VEILED_TAG = 'lgd-veiled';
/** 設定パネルの一文（実装ガイド 7.2「閉じている間の知らせ」）. */
export const OPEN_ONLY_NOTE = 'ダッシュボードを開いている間だけ知らせます';

/** What a kind sends. */
export type NotifyMsg = Readonly<{
  /** Same key → sent once (e.g. `alarm:<配置ID>:<i>:<鳴る時刻>`, `pomo:<配置ID>:<実行ID>`). */
  key: string;
  /** Toast text (「アラーム 07:00」「ポモドーロ完了」). */
  text: string;
  /** Browser notification title (default: `text`) and body. */
  title?: string;
  body?: string;
  /** Weight (toast kind). */
  kind?: ToastKind;
}>;
/** `off` 通知の設定がオフ・通知を使わない種類, `dup` 同じ key を送り済み, `shown` 種類の文で出した, `veiled` 伏せた文で出した. */
export type NotifySent = 'off' | 'dup' | 'shown' | 'veiled';

/** The browser side of sending, replaceable in tests (`setNotifyApi`). The permission is read by `permission.ts`. */
export type NotifyApi = Readonly<{
  show: (title: string, body: string, tag: string) => void;
  /** The page is not being looked at (`document.hidden`). */
  hidden: () => boolean;
}>;

export const BROWSER_NOTIFY: NotifyApi = {
  show: (title, body, tag) => {
    try {
      const N = typeof window !== 'undefined' && 'Notification' in window ? window.Notification : null;
      if (N) new N(title, { body, tag });
    } catch {
      /* not available here (e.g. needs a service worker) */
    }
  },
  hidden: () => typeof document !== 'undefined' && document.hidden,
};

let api: NotifyApi = BROWSER_NOTIFY;

type Notifier = {
  /** 「通知しない」 on a kind without a 通知の設定: not asked again for this placement in this session. */
  declined: Set<string>;
  sent: Map<string, number>;
  veilToast: number | null;
};

const notifiers = new WeakMap<Dashboard, Notifier>();

function notifier(d: Dashboard): Notifier {
  let n = notifiers.get(d);
  if (!n) {
    n = { declined: new Set(), sent: new Map(), veilToast: null };
    notifiers.set(d, n);
  }
  return n;
}

const usesNotify = (def: WidgetDef | undefined): boolean => !!def?.perm.includes('notify');

/** The kind's 通知の設定 key (`tg` field `notify`), or null when it has none (always on). */
export function notifySettingKey(def: WidgetDef | undefined): string | null {
  return def?.f.some(f => f.k === 'notify' && f.t === 'tg') ? 'notify' : null;
}

/** 通知の設定 of a placement: its `notify` setting, or on for a kind without one. False for kinds without `perm: notify`. */
export function notifyOn(d: Dashboard, id: string): boolean {
  const def = defOf(id);
  if (!usesNotify(def)) return false;
  const k = notifySettingKey(def);
  return k === null || !!d.cfgOf(id, k);
}

export function notifyPermOf(d: Dashboard): NotifyPerm {
  return permOf(d, 'notify');
}

/** Asks the browser (only from 「通知を許可」). Anything but 「許可」 counts as no for this session. */
export function requestNotify(d: Dashboard): Promise<'ok' | 'no'> {
  return requestPerm(d, 'notify');
}

function decline(d: Dashboard, id: string): void {
  const k = notifySettingKey(defOf(id));
  if (k) d.setCfg(id, k, false);
  else notifier(d).declined.add(id);
}

/**
 * Starts a notification request for an explicit operation of a placement (スタート、スイッチをオン), through the shared
 * request (`askPerm`). Asks only when the kind notifies, its 通知の設定 is on, this placement has not declined, the
 * permission has not been answered and the placement is not hidden in public; the frame shows the card and `then` runs
 * after the answer (「通知を許可」「通知しない」「このまま始める」). Otherwise `then` runs at once. Returns whether the card is shown.
 */
export function askNotify(d: Dashboard, id: string, copy: AskCopy, then?: () => void): boolean {
  if (!notifyOn(d, id) || notifier(d).declined.has(id)) { then?.(); return false; }
  return askPerm(d, id, 'notify', {
    copy,
    ...(then ? { then } : {}),
    alt: () => { decline(d, id); then?.(); },
  });
}

/** Shows (or clears) a notification request card as is: stories and tests only. */
export function setNotifyAsk(d: Dashboard, id: string, st: 'ask' | 'no' | null, copy: AskCopy = {}, then?: () => void): void {
  setPermAsk(d, id, 'notify', st, { copy, ...(then ? { then } : {}), alt: () => { decline(d, id); then?.(); } });
}

export function notifyAskOf(d: Dashboard, id: string): 'ask' | 'no' | null {
  const a = permAskOf(d, id);
  return a?.perm === 'notify' ? a.st : null;
}

function veilToastShown(d: Dashboard, n: Notifier): boolean {
  return n.veilToast !== null && d.ui.toasts.some(t => t.id === n.veilToast && !t.out);
}

/** Keys remembered for the duplicate check (oldest dropped first). */
const SENT_MAX = 200;

/**
 * Sends one notice of a placement (see the header). Nothing is sent when the 通知の設定 is off or the key was sent already.
 * While the placement is hidden in public the generic hidden-content texts are used instead of `msg`.
 */
export function notify(d: Dashboard, id: string, msg: NotifyMsg): NotifySent {
  if (!notifyOn(d, id)) return 'off';
  const n = notifier(d);
  if (n.sent.has(msg.key)) return 'dup';
  n.sent.set(msg.key, d.now());
  if (n.sent.size > SENT_MAX) n.sent.delete(n.sent.keys().next().value ?? '');
  const system = permOf(d, 'notify') === 'ok' && browserPermOf('notify') === 'granted' && api.hidden();
  if (d.veiled(id)) {
    if (!veilToastShown(d, n)) n.veilToast = d.toast(VEILED_TOAST, 'info');
    if (system) api.show(VEILED_TITLE, VEILED_BODY, VEILED_TAG);
    return 'veiled';
  }
  d.toast(msg.text, msg.kind ?? 'info');
  if (system) api.show(msg.title ?? msg.text, msg.body ?? '', 'lgd-' + msg.key);
  return 'shown';
}

/** Tests: replace the browser side of sending (call before the Dashboard's first notify call). */
export function setNotifyApi(a: NotifyApi): void {
  api = a;
}
/** Tests: back to the browser (sending and the permission side). */
export function resetNotifyApi(): void {
  api = BROWSER_NOTIFY;
  resetPermBrowser();
}
