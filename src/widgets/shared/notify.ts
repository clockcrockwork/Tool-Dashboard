/**
 * 通知（`perm: ['notify']`、アラーム・ポモドーロ）. 開いている間だけ知らせる（実装ガイド 7.2「閉じている間の知らせ」）:
 * Web Push は使わず、ページが開いていてタブが裏にあるときだけ、ブラウザの通知を出す（prototype `ntf`）。
 * 許可の状態はブラウザ（Notification.permission）から読み、保存しない（仕様書 4章「許可のお願い」）。
 * 許可のお願いの見た目は共通の枠（`WidgetFrame` の `cover`）が出す。ここは状態と問い合わせだけ。
 */

/** `ok` 許可済み, `no` 断られた（この環境では出せない）, `''` まだ聞いていない. */
export type NotifyPerm = 'ok' | 'no' | '';

/** Answered 「いいえ」 in this session where the browser keeps no state (no Notification API, prompt dismissed). */
let sessionNo = false;

function api(): typeof Notification | null {
  try {
    return typeof window !== 'undefined' && 'Notification' in window ? window.Notification : null;
  } catch {
    return null;
  }
}

export function notifyPerm(): NotifyPerm {
  const N = api();
  const p = N ? N.permission : 'default';
  if (p === 'granted') return 'ok';
  if (p === 'denied' || sessionNo) return 'no';
  return '';
}

/** Asks the browser (prototype `pmNtf`). Anything but 「許可」 counts as no. */
export async function requestNotify(): Promise<'ok' | 'no'> {
  const N = api();
  let r: NotificationPermission = 'denied';
  try {
    if (N?.requestPermission) r = await N.requestPermission();
  } catch {
    r = 'denied';
  }
  const v = r === 'granted' ? 'ok' : 'no';
  sessionNo = v === 'no';
  return v;
}

/** A system notification, only when allowed and the tab is not being looked at (the toast covers the visible case). */
export function notifyIfHidden(title: string, body: string): void {
  try {
    const N = api();
    if (N && N.permission === 'granted' && document.hidden) new N(title, { body });
  } catch {
    /* not available here */
  }
}

/** Tests only. */
export function resetNotifyForTest(): void {
  sessionNo = false;
}
