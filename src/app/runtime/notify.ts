/**
 * 共通の通知（p2a-followup.md 2・3章、仕様書 4章「許可のお願い」、実装ガイド 4章「通信と許可の出し方」・7.2）.
 *
 * 対象は登録の `perm` に `'notify'` を持つ種類。種類は送る内容（文・重さ・重複を見分ける key）を渡すだけにし、次はここが受け持つ。
 *  - 通知の設定: その種類の `tg` の項目 `notify`（ポモドーロ「完了を通知」など）。項目が無い種類（アラーム）は常にオン。
 *    オフなら何も出さない（プロトタイプと同じ）。通知できるかどうかは実行の可否にしない（実行は呼ぶ側が続ける）。
 *  - 許可の状態: ブラウザの `Notification.permission` を読み、Permissions API（`notifications`）の変化で読み直す。保存しない。
 *    通知の仕組みが無い環境は「断られた」と同じ（トーストだけで知らせる）。
 *  - 人前では隠す: 隠している配置の知らせは、どの種類でも同じ伏せた文にする（ウィジェット名・時刻・内容を出さない）。
 *  - 出し分け: 画面の中は必ずトースト。タブが裏にあって許可済みなら、ブラウザの通知も出す（開いている間だけ。Web Push は使わない）。
 *  - 重複の防止: 同じ key は1度だけ。伏せた知らせは、出ているあいだ重ねない（ブラウザの通知は同じ tag で置き換える）。
 *
 * 許可のお願いは共通の枠（`WidgetFrame`）が `notifyCover()` を `cover` に出す。お願いは必ず明示の操作（スタート・スイッチ）から
 * `askNotify()` で始め、「通知を許可」を押したときだけブラウザに問い合わせる。断られた・閉じたときも、続きの操作は止めない。
 */
import { reactive } from 'vue';
import type { Dashboard } from '../store/store';
import type { ToastKind } from '../store/types';
import { defOf } from '../registry/instances';
import type { WidgetDef } from '../registry/registry';
import type { WidgetCover } from '../shell/cover';
import { IC } from '../parts/icons';

/** `ok` 許可済み, `no` 断られた・この環境では出せない, `''` まだ聞いていない. */
export type NotifyPerm = 'ok' | 'no' | '';

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

/** The texts of a permission request (title and one sentence: what it is for). */
export type AskText = Readonly<{ title: string; text: string; /** Label of 「このまま始める」 when refused. */ go?: string }>;

/** The browser side, replaceable in tests (`setNotifyApi`). */
export type NotifyApi = Readonly<{
  /** `Notification.permission`, or null when notifications are not available here. */
  permission: () => NotificationPermission | null;
  request: () => Promise<NotificationPermission>;
  show: (title: string, body: string, tag: string) => void;
  /** The page is not being looked at (`document.hidden`). */
  hidden: () => boolean;
  /** Permissions API: calls `fn` when the permission changes. Returns the cleanup. */
  onChange: (fn: () => void) => () => void;
}>;

function notificationCtor(): typeof Notification | null {
  try {
    return typeof window !== 'undefined' && 'Notification' in window ? window.Notification : null;
  } catch {
    return null;
  }
}

export const BROWSER_NOTIFY: NotifyApi = {
  permission: () => notificationCtor()?.permission ?? null,
  request: async () => {
    const N = notificationCtor();
    if (!N?.requestPermission) return 'denied';
    try {
      return await N.requestPermission();
    } catch {
      return 'denied';
    }
  },
  show: (title, body, tag) => {
    try {
      const N = notificationCtor();
      if (N) new N(title, { body, tag });
    } catch {
      /* not available here (e.g. needs a service worker) */
    }
  },
  hidden: () => typeof document !== 'undefined' && document.hidden,
  onChange: (fn) => {
    let st: PermissionStatus | null = null;
    let dead = false;
    try {
      void navigator.permissions.query({ name: 'notifications' }).then((s) => {
        if (dead) return;
        st = s;
        s.addEventListener('change', fn);
      }, () => {});
    } catch {
      /* no Permissions API: the state is read again after each request */
    }
    return () => { dead = true; st?.removeEventListener('change', fn); };
  },
};

let api: NotifyApi = BROWSER_NOTIFY;

type Ask = { st: 'ask' | 'no'; title: string; text: string; go: string; then: (() => void) | null };
type State = {
  perm: NotifyPerm;
  /** Answered no in this session where the browser keeps 'default' (prompt dismissed). */
  sessionNo: boolean;
  asks: Record<string, Ask>;
  /** 「通知しない」 on a kind without a 通知の設定: not asked again for this placement in this session. */
  declined: Record<string, boolean>;
};
type Notifier = { s: State; sent: Map<string, number>; veilToast: number | null; off: () => void };

const notifiers = new WeakMap<Dashboard, Notifier>();

function readPerm(sessionNo: boolean): NotifyPerm {
  const p = api.permission();
  if (p === 'granted') return 'ok';
  if (p === null || p === 'denied' || sessionNo) return 'no';
  return '';
}

function notifier(d: Dashboard): Notifier {
  let n = notifiers.get(d);
  if (!n) {
    const s = reactive<State>({ perm: readPerm(false), sessionNo: false, asks: {}, declined: {} });
    const off = api.onChange(() => { s.perm = readPerm(s.sessionNo); });
    n = { s, sent: new Map(), veilToast: null, off };
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
  return notifier(d).s.perm;
}

/** Asks the browser (only from 「通知を許可」). Anything but 「許可」 counts as no for this session. */
export async function requestNotify(d: Dashboard): Promise<'ok' | 'no'> {
  const n = notifier(d);
  const r = await api.request();
  const v = r === 'granted' ? 'ok' : 'no';
  n.s.sessionNo = v === 'no';
  n.s.perm = v;
  return v;
}

/**
 * Starts a permission request for an explicit operation of a placement (スタート、スイッチをオン). Asks only when the kind
 * notifies, its 通知の設定 is on, the permission has not been answered and the placement is not hidden in public; then
 * the frame shows the card and `then` runs after the answer (「通知を許可」「通知しない」「このまま始める」). Otherwise `then`
 * runs at once. Returns whether the card is shown.
 */
export function askNotify(d: Dashboard, id: string, text: AskText, then?: () => void): boolean {
  const n = notifier(d);
  const can = notifyOn(d, id) && n.s.perm === '' && !n.s.declined[id] && !d.veiled(id);
  if (!can) { then?.(); return false; }
  n.s.asks[id] = { st: 'ask', title: text.title, text: text.text, go: text.go ?? 'このまま始める', then: then ?? null };
  return true;
}

/** Shows (or clears) a request card as is: stories and tests only. */
export function setNotifyAsk(d: Dashboard, id: string, st: 'ask' | 'no' | null, text: AskText = { title: '通知しますか？', text: '' }, then?: () => void): void {
  const n = notifier(d);
  if (st === null) { delete n.s.asks[id]; return; }
  n.s.asks[id] = { st, title: text.title, text: text.text, go: text.go ?? 'このまま始める', then: then ?? null };
}

export function notifyAskOf(d: Dashboard, id: string): 'ask' | 'no' | null {
  return notifier(d).s.asks[id]?.st ?? null;
}

function closeAsk(d: Dashboard, id: string): Ask | undefined {
  const n = notifier(d);
  const a = n.s.asks[id];
  delete n.s.asks[id];
  return a;
}

async function allow(d: Dashboard, id: string): Promise<void> {
  const r = await requestNotify(d);
  const n = notifier(d);
  const a = n.s.asks[id];
  if (!a) return;
  if (r === 'ok') { closeAsk(d, id); a.then?.(); return; }
  n.s.asks[id] = { ...a, st: 'no' };
}

function decline(d: Dashboard, id: string): void {
  const k = notifySettingKey(defOf(id));
  if (k) d.setCfg(id, k, false);
  else notifier(d).s.declined[id] = true;
  closeAsk(d, id)?.then?.();
}

/**
 * The card the frame puts in place of the content while a request is open (prototype `pq.pomo`): 「通知を許可」/「通知しない」,
 * or after a refusal 「通知を出せません」 with 「このまま始める」/「閉じる」 (「閉じる」 only, when nothing waits for the answer).
 */
export function notifyCover(d: Dashboard, id: string): WidgetCover | null {
  const a = notifier(d).s.asks[id];
  if (!a) return null;
  const close = (): void => { closeAsk(d, id); };
  if (a.st === 'no') {
    const then = a.then;
    return {
      icon: IC.bell, warn: true, title: '通知を出せません', text: 'ブラウザの設定で許可できます。いまは画面の中だけで知らせます',
      ...(then ? { ok: { label: a.go, fn: () => { close(); then(); } }, alt: { label: '閉じる', fn: close } } : { ok: { label: '閉じる', fn: close } }),
    };
  }
  return {
    icon: IC.bell, title: a.title, text: a.text,
    ok: { label: '通知を許可', fn: () => { void allow(d, id); } },
    alt: { label: '通知しない', fn: () => { decline(d, id); } },
  };
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
  const system = n.s.perm === 'ok' && api.permission() === 'granted' && api.hidden();
  if (d.veiled(id)) {
    if (!veilToastShown(d, n)) n.veilToast = d.toast(VEILED_TOAST, 'info');
    if (system) api.show(VEILED_TITLE, VEILED_BODY, VEILED_TAG);
    return 'veiled';
  }
  d.toast(msg.text, msg.kind ?? 'info');
  if (system) api.show(msg.title ?? msg.text, msg.body ?? '', 'lgd-' + msg.key);
  return 'shown';
}

/** Tests: replace the browser side (call before the Dashboard's first notify call). */
export function setNotifyApi(a: NotifyApi): void {
  api = a;
}
export function resetNotifyApi(): void {
  api = BROWSER_NOTIFY;
}
