/**
 * 許可のお願い（共通の仕組み。仕様書 4章「許可のお願い」、実装ガイド 4章「通信と許可の出し方」、p2a-followup.md 3章）.
 *
 * 対象は登録の `perm`（`geo` 現在地・`notify` 通知・`mic` マイク・`clipboard` クリップボード）。どの種類でも次はここが受け持つ。
 *  - 許可の状態: ブラウザから読む（Permissions API と、通知は `Notification.permission`）。変化を見て読み直す。保存しない。
 *    この端末・ブラウザで使えないものは「断られた」と同じ。問い合わせて答えずに閉じた（`prompt` のまま）ときは、この
 *    Dashboard の間だけ「断られた」とする。
 *  - お願いの表示: 共通の枠（`WidgetFrame`）が `permCover()` を中身の置き換え（`cover`）に出す。ウィジェットは明示の操作
 *    （スタート・録音を始める・位置を使う・Run）から `askPerm()` を呼ぶだけで、カードを自分で作らない。
 *  - ブラウザへの問い合わせ: カードの「許可」（「マイクを使う」「位置を使う」…）と、断られたあとの「もう一度」を押したときだけ。
 *    表示・mount・配置で問い合わせない。
 *  - 断られたとき: 直し方（「アドレスバー左のボタンで許可できます」）と代わりの手段（「都市を選ぶ」「手入力にする」「このまま始める」）。
 *    実行は止めない: 許可が無くても続けられる操作（通知）は「このまま始める」で続ける。許可が要る操作（マイク・現在地・
 *    クリップボード）は、その操作だけをしない（ほかの実行・記録には触れない）。
 *
 * 文言はその許可の既定（`PERMS[p].copy`。プロトタイプ `pq` の文）に、種類が渡す文（`AskCopy`。見出しと理由はふつう種類ごと）を
 * 重ねる。種類の文は `src/widgets/<kind>/<kind>.ts` に置く（`POMO_ASK`・`ALARM_ASK`・`MIC_ASK`）。
 * 通知に特有のこと（通知の設定の確認・「通知しない」・送る・伏せる）は `notify.ts` に残す。
 */
import { reactive } from 'vue';
import type { Dashboard } from '../store/store';
import { defOf } from '../registry/instances';
import type { Permission } from '../registry/registry';
import type { WidgetCover } from '../shell/cover';
import { IC } from '../parts/icons';

/** `ok` 許可済み, `no` 断られた・この環境では使えない, `''` まだ聞いていない（読めていない）. */
export type PermState = 'ok' | 'no' | '';
/** What the browser says: `prompt` not answered yet, `none` not available here. */
export type BrowserPerm = 'granted' | 'denied' | 'prompt' | 'none';

/** Texts of a request card (before the browser is asked) and of the refused card. */
export type PermCopy = Readonly<{
  /** 「マイクを使いますか？」 */
  title: string;
  /** Why it is needed and what happens to the data (「…外に送りません。」). */
  text: string;
  /** The button that asks the browser (「マイクを使う」). */
  ok: string;
  /** The other choice (「やめる」「都市を選ぶ」「通知しない」). */
  alt: string;
  /** Refused: title, how to fix it (and the alternative now), and the two buttons. */
  noTitle: string;
  noText: string;
  /** 「もう一度」 (asks again) for a permission the operation needs; 「このまま始める」 for one it can go without. */
  noOk: string;
  noAlt: string;
}>;
/** What a kind passes: its own sentences over the permission's defaults. */
export type AskCopy = Readonly<Partial<PermCopy>>;

export type PermRule = Readonly<{
  icon: string;
  /** The operation cannot run without it (マイク・現在地・クリップボード). False: it goes on without (通知). */
  need: boolean;
  /** Permissions API name. */
  query: string;
  copy: PermCopy;
}>;

/** 許可ごとの既定（プロトタイプ `pq` と仕様書 4章）. */
export const PERMS: Readonly<Record<Permission, PermRule>> = {
  geo: {
    icon: IC.loc, need: true, query: 'geolocation',
    copy: { title: '現在地を使いますか？', text: '位置は端末の外に送りません', ok: '位置を使う', alt: 'やめる', noTitle: '現在地を使えません', noText: 'アドレスバー左のボタンで許可できます', noOk: 'もう一度', noAlt: '閉じる' },
  },
  notify: {
    icon: IC.bell, need: false, query: 'notifications',
    copy: { title: '通知しますか？', text: '', ok: '通知を許可', alt: '通知しない', noTitle: '通知を出せません', noText: 'ブラウザの設定で許可できます。いまは画面の中だけで知らせます', noOk: 'このまま始める', noAlt: '閉じる' },
  },
  mic: {
    icon: IC.mic, need: true, query: 'microphone',
    copy: { title: 'マイクを使いますか？', text: '', ok: 'マイクを使う', alt: 'やめる', noTitle: 'マイクを使えません', noText: 'アドレスバー左のボタンで許可できます', noOk: 'もう一度', noAlt: '閉じる' },
  },
  clipboard: {
    icon: IC.clipboard, need: true, query: 'clipboard-read',
    copy: { title: 'クリップボードを読みますか？', text: '端末の外には送りません。', ok: 'クリップボードを使う', alt: 'やめる', noTitle: 'クリップボードを読めません', noText: 'アドレスバー左のボタンで許可できます', noOk: 'もう一度', noAlt: '閉じる' },
  },
};

/**
 * スクリプト（P2d）のクリップボードの文（プロトタイプ `pq.script`）. 「手入力にする」は `alt`・`noAlt` に入力元の切り替えを渡す。
 * 断られたときの文はプロトタイプに無いので、直し方と代わりの手段を足した（P2d で `script.ts` に移す）。
 */
export const SCRIPT_CLIP_ASK: AskCopy = {
  title: 'クリップボードを読みますか？', text: '実行するときに、コピーしている文字をスクリプトの入力にします。端末の外には送りません。',
  ok: 'クリップボードを使う', alt: '手入力にする', noText: 'アドレスバー左のボタンで許可できます。いまは手入力で実行できます', noAlt: '手入力にする',
};

/** What happens around one request (all optional). */
export type AskOpts = Readonly<{
  copy?: AskCopy;
  /**
   * The operation, run once the permission is there: at once when it is allowed already, or after 「許可」 succeeds. For a
   * permission the operation can go without (通知), also when it cannot be asked (refused before, hidden in public) and from
   * 「このまま始める」.
   */
  then?: () => void;
  /**
   * The operation asks the browser itself (opening the microphone starts recording; reading the clipboard is the input):
   * called instead of the permission's own request and `then`, from 「許可」「もう一度」 or at once when allowed already.
   * Resolves whether it got the permission (false: refused or failed, shown as refused).
   */
  request?: () => Promise<boolean>;
  /** 「やめる」 or the alternative on the request card (「都市を選ぶ」「手入力にする」「通知しない」). The card closes first. */
  alt?: () => void;
  /** The alternative on the refused card (「都市を選ぶ」「手入力にする」). Default: only close. */
  noAlt?: () => void;
}>;

/** The browser side, replaceable in tests (`setPermBrowser`). */
export type PermBrowser = Readonly<{
  /** The state when it can be read at once (`Notification.permission`, or `none` when the API is missing); else undefined. */
  read: (p: Permission) => BrowserPerm | undefined;
  /** Permissions API: calls `fn` with the state now and on each change. Returns the cleanup. */
  watch: (p: Permission, fn: (s: BrowserPerm) => void) => () => void;
  /** Asks the browser (only from an explicit press). */
  request: (p: Permission) => Promise<BrowserPerm>;
}>;

function notificationCtor(): typeof Notification | null {
  try {
    return typeof window !== 'undefined' && 'Notification' in window ? window.Notification : null;
  } catch {
    return null;
  }
}

const fromApi = (s: PermissionState | NotificationPermission): BrowserPerm =>
  s === 'granted' ? 'granted' : s === 'denied' ? 'denied' : 'prompt';

function available(p: Permission): boolean {
  try {
    if (p === 'notify') return !!notificationCtor();
    if (typeof navigator === 'undefined') return false;
    if (p === 'geo') return !!navigator.geolocation;
    if (p === 'mic') return !!navigator.mediaDevices?.getUserMedia;
    return !!navigator.clipboard?.readText;
  } catch {
    return false;
  }
}

async function browserRequest(p: Permission): Promise<BrowserPerm> {
  if (!available(p)) return 'none';
  try {
    if (p === 'notify') {
      const N = notificationCtor();
      return N?.requestPermission ? fromApi(await N.requestPermission()) : 'none';
    }
    if (p === 'geo') {
      return await new Promise<BrowserPerm>((resolve) => {
        navigator.geolocation.getCurrentPosition(() => { resolve('granted'); }, () => { resolve('denied'); }, { maximumAge: 3_600_000, timeout: 15_000 });
      });
    }
    if (p === 'mic') {
      const st = await navigator.mediaDevices.getUserMedia({ audio: true });
      st.getTracks().forEach((t) => { t.stop(); });
      return 'granted';
    }
    await navigator.clipboard.readText();
    return 'granted';
  } catch {
    return 'denied';
  }
}

export const BROWSER_PERMS: PermBrowser = {
  read: (p) => {
    if (!available(p)) return 'none';
    return p === 'notify' ? fromApi(notificationCtor()?.permission ?? 'default') : undefined;
  },
  watch: (p, fn) => {
    let st: PermissionStatus | null = null;
    let dead = false;
    const on = (): void => {
      if (!st) return;
      // 通知は `Notification.permission` を正とする（Permissions API の名前と値が環境で揺れるため）.
      fn(p === 'notify' ? BROWSER_PERMS.read(p) ?? fromApi(st.state) : fromApi(st.state));
    };
    try {
      void navigator.permissions.query({ name: PERMS[p].query as PermissionName }).then((s) => {
        if (dead) return;
        st = s;
        on();
        s.addEventListener('change', on);
      }, () => {});
    } catch {
      /* no Permissions API (or this name is unknown here): the state is learnt from the request */
    }
    return () => { dead = true; st?.removeEventListener('change', on); };
  },
  request: browserRequest,
};

let browser: PermBrowser = BROWSER_PERMS;

type Ask = { perm: Permission; st: 'ask' | 'no'; copy: PermCopy; opts: AskOpts; busy: boolean };
type State = {
  st: Record<Permission, PermState>;
  /** Answered no in this Dashboard where the browser keeps `prompt` (the prompt was dismissed), or the operation failed. */
  sessionNo: Record<Permission, boolean>;
  /** The open card of each placement. */
  asks: Record<string, Ask>;
};
type Perms = { s: State; off: () => void };

const ALL: readonly Permission[] = ['geo', 'notify', 'mic', 'clipboard'];
const perms = new WeakMap<Dashboard, Perms>();

function toState(b: BrowserPerm | undefined, sessionNo: boolean): PermState {
  if (b === 'granted') return 'ok';
  if (b === 'denied' || b === 'none' || sessionNo) return 'no';
  return '';
}

function permsOf(d: Dashboard): Perms {
  let x = perms.get(d);
  if (!x) {
    const none = { geo: false, notify: false, mic: false, clipboard: false };
    const s = reactive<State>({
      st: { geo: '', notify: '', mic: '', clipboard: '' },
      sessionNo: { ...none },
      asks: {},
    });
    for (const p of ALL) s.st[p] = toState(browser.read(p), false);
    const offs = ALL.map(p => browser.watch(p, (b) => { s.st[p] = toState(b, s.sessionNo[p]); }));
    x = { s, off: () => { offs.forEach((f) => { f(); }); } };
    perms.set(d, x);
  }
  return x;
}

/** What the browser says now when it can be read at once (`Notification.permission`), else undefined. */
export function browserPermOf(p: Permission): BrowserPerm | undefined {
  return browser.read(p);
}

/** 許可の状態（ブラウザから読む。保存しない）. */
export function permOf(d: Dashboard, p: Permission): PermState {
  return permsOf(d).s.st[p];
}

function settle(d: Dashboard, p: Permission, ok: boolean): PermState {
  const s = permsOf(d).s;
  s.sessionNo[p] = !ok;
  s.st[p] = ok ? 'ok' : 'no';
  return s.st[p];
}

/** Asks the browser (from 「許可」「もう一度」 only). Anything but granted counts as no for this Dashboard. */
export async function requestPerm(d: Dashboard, p: Permission): Promise<'ok' | 'no'> {
  const r = await browser.request(p);
  return settle(d, p, r === 'granted') === 'ok' ? 'ok' : 'no';
}

async function runRequest(d: Dashboard, p: Permission, fn: () => Promise<boolean>): Promise<boolean> {
  let ok = false;
  try { ok = await fn(); } catch { ok = false; }
  settle(d, p, ok);
  return ok;
}

function open(d: Dashboard, id: string, perm: Permission, st: 'ask' | 'no', opts: AskOpts): void {
  permsOf(d).s.asks[id] = { perm, st, copy: { ...PERMS[perm].copy, ...opts.copy }, opts, busy: false };
}

/** Closes the card of a placement (for example when the place is chosen another way). */
export function closePermAsk(d: Dashboard, id: string): void {
  const s = permsOf(d).s;
  if (s.asks[id]) delete s.asks[id];
}

/** The permission is there: run the operation (or its own request, shown as refused when that fails). */
function proceed(d: Dashboard, id: string, perm: Permission, opts: AskOpts): void {
  const req = opts.request;
  if (!req) { opts.then?.(); return; }
  void runRequest(d, perm, req).then((ok) => { if (!ok) open(d, id, perm, 'no', opts); });
}

/**
 * Starts a permission request for an explicit operation of a placement (スタート、録音を始める、位置を使う、Run). Only for a
 * permission listed in the kind's registry `perm` (else nothing happens and false is returned; `registry.test.ts` keeps
 * `states: 'perm'` in line with it).
 *  - allowed already: the operation runs at once (no card);
 *  - not asked yet: the card asks first (in place of the content); the browser is asked only from its 「許可」;
 *  - refused before: the refused card (how to fix it, 「もう一度」, the alternative) for a permission the operation needs; for
 *    one it can go without (通知) the operation runs at once;
 *  - hidden in public: no card (it could not be seen); an operation that can go without the permission runs.
 * Returns whether a card is shown.
 */
export function askPerm(d: Dashboard, id: string, perm: Permission, opts: AskOpts = {}): boolean {
  if (!defOf(id)?.perm.includes(perm)) return false;
  const rule = PERMS[perm];
  const st = permOf(d, perm);
  if (st === 'ok') { proceed(d, id, perm, opts); return false; }
  if (d.veiled(id) || (st === 'no' && !rule.need)) {
    if (!rule.need) opts.then?.();
    return false;
  }
  open(d, id, perm, st === 'no' ? 'no' : 'ask', opts);
  return true;
}

async function allow(d: Dashboard, id: string): Promise<void> {
  const s = permsOf(d).s;
  const a = s.asks[id];
  if (!a || a.busy) return;
  a.busy = true;
  const req = a.opts.request;
  const ok = req ? await runRequest(d, a.perm, req) : (await requestPerm(d, a.perm)) === 'ok';
  // Closed or replaced while the browser was asking: the answer is kept (state), the old card does nothing more.
  if (s.asks[id] !== a) return;
  if (ok) {
    delete s.asks[id];
    if (!req) a.opts.then?.();
    return;
  }
  s.asks[id] = { ...a, st: 'no', busy: false };
}

/** The open request of a placement (`ask` before the browser, `no` refused), or null. */
export function permAskOf(d: Dashboard, id: string): Readonly<{ perm: Permission; st: 'ask' | 'no' }> | null {
  const a = permsOf(d).s.asks[id];
  return a ? { perm: a.perm, st: a.st } : null;
}

/**
 * The card the frame puts in place of the content while a request is open (prototype `pq.*`, `.pmw .perm`): the request
 * (「許可」/the other choice), or after a refusal how to fix it with 「もう一度」/the alternative — for a permission the operation
 * can go without, 「このまま始める」/「閉じる」 (「閉じる」 only, when nothing waits for the answer).
 */
export function permCover(d: Dashboard, id: string): WidgetCover | null {
  const s = permsOf(d).s;
  const a = s.asks[id];
  if (!a) return null;
  const { icon, need } = PERMS[a.perm];
  const c = a.copy;
  const close = (): void => { closePermAsk(d, id); };
  const ask = (): void => { void allow(d, id); };
  if (a.st === 'no') {
    const base = { icon, warn: true, title: c.noTitle, text: c.noText };
    if (need) return { ...base, ok: { label: c.noOk, fn: ask }, alt: { label: c.noAlt, fn: () => { close(); a.opts.noAlt?.(); } } };
    const then = a.opts.then;
    return then
      ? { ...base, ok: { label: c.noOk, fn: () => { close(); then(); } }, alt: { label: c.noAlt, fn: close } }
      : { ...base, ok: { label: c.noAlt, fn: close } };
  }
  return { icon, title: c.title, text: c.text, ok: { label: c.ok, fn: ask }, alt: { label: c.alt, fn: () => { close(); a.opts.alt?.(); } } };
}

/** Shows (or clears) a card as is: stories and tests only. `no` also marks the permission refused. */
export function setPermAsk(d: Dashboard, id: string, perm: Permission, st: 'ask' | 'no' | null, opts: AskOpts = {}): void {
  if (st === null) { closePermAsk(d, id); return; }
  const s = permsOf(d).s;
  if (st === 'no') settle(d, perm, false);
  else if (s.st[perm] === 'no') { s.sessionNo[perm] = false; s.st[perm] = ''; }
  open(d, id, perm, st, opts);
}

/** Tests: replace the browser side (call before the Dashboard's first use). */
export function setPermBrowser(b: PermBrowser): void {
  browser = b;
}
export function resetPermBrowser(): void {
  browser = BROWSER_PERMS;
}
