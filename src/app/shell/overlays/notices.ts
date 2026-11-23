/**
 * 1×1 で入りきらない知らせ (仕様書 3章「ウィジェット内の知らせ」最後の行).
 * A small widget whose permission card (`.pmw .perm`) or empty/error message (`.sto .stm`) does not fit
 * keeps it faded and announces it as a toast headed by the widget name: once while the state lasts,
 * again when the widget is tapped. Ported from `ntOf` / `ntScan` / `ntToast` (Main.dc.html).
 */
import type { Dashboard } from '../../store/store';
import type { ToastKind } from '../../store/types';

export type WidgetNotice = { key: string; text: string; btn: HTMLElement | null; kind: ToastKind };

export function noticeOf(w: HTMLElement, edit: boolean): WidgetNotice | null {
  if (edit) return null;
  const pm = w.querySelector(':scope>.pmw .perm');
  const sm = w.classList.contains('s-err') || w.classList.contains('s-empty') ? w.querySelector('.sto .stm') : null;
  if (!pm && !sm) return null;
  const r = w.getBoundingClientRect();
  // width 0: not rendered (off / hidden); the prototype let those through.
  if (!r.width || r.width > 240 || r.height > 200 || r.right < 0 || r.left > window.innerWidth || r.bottom < 0 || r.top > window.innerHeight) return null;
  const h = w.querySelector(':scope>h2');
  const t = (pm ? pm.querySelector('b') : sm?.querySelector('p'))?.textContent ?? '';
  const btn = (pm ? pm.querySelector<HTMLElement>('.chip.pri') : sm?.querySelector<HTMLElement>('.chip')) ?? null;
  const bad = pm ? pm.classList.contains('warnx') : w.classList.contains('s-err');
  return { key: (w.dataset.w ?? '') + '|' + t, text: (h ? (h.textContent ?? '') + '：' : '') + t, btn, kind: bad ? 'warn' : 'info' };
}

export function noticeToast(d: Dashboard, n: WidgetNotice): void {
  const b = n.btn;
  d.toast(n.text, n.kind, b ? { label: b.textContent?.trim() ?? '', fn: () => { b.click(); } } : null);
}

/** Starts the 1.2 s scan and the tap-to-repeat listener. Returns the cleanup. */
export function watchNotices(root: HTMLElement, d: Dashboard): () => void {
  let seen = new Set<string>();
  const scan = (): void => {
    if (document.hidden) return;
    const now = new Set<string>();
    root.querySelectorAll<HTMLElement>('.w').forEach((w) => {
      const n = noticeOf(w, d.ui.edit);
      if (!n) return;
      now.add(n.key);
      if (!seen.has(n.key)) noticeToast(d, n);
    });
    seen = now;
  };
  const iv = setInterval(scan, 1200);
  const click = (e: MouseEvent): void => {
    const t = e.target;
    if (!(t instanceof Element)) return;
    const w = t.closest<HTMLElement>('.w');
    if (!w || !root.contains(w) || t.closest('button,a,input,textarea,select,[role=button]')) return;
    const n = noticeOf(w, d.ui.edit);
    if (n) noticeToast(d, n);
  };
  document.addEventListener('click', click);
  return () => { clearInterval(iv); document.removeEventListener('click', click); };
}
