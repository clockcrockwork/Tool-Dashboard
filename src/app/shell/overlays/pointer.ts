/**
 * Root-level pointer and key listeners for the tooltip and the widget menu.
 * Ported from componentDidMount `this._tl` and `mnL()` (design/claude-design/Main.dc.html).
 * Times: tooltip 0.55 s hover / 0.48 s press, gone 1.5 s after release, 0.25 s grace when moving onto it;
 * menu 0.7 s press, cancelled by moving more than 12 px (仕様書 4章・6章).
 */
import type { Ref } from 'vue';
import type { Dashboard } from '../../store/store';
import { closeMenu, menuTarget, openWidgetMenu, tipFor, type Tip } from '../../store/overlays';

type Listener = [string, (e: Event) => void, boolean];

export type PointerState = {
  /** a long press showed the tooltip; the following tap must not run */
  lp: boolean;
  tt: ReturnType<typeof setTimeout> | undefined;
  tipFor: Element | null;
};

export function attachPointer(root: HTMLElement, d: Dashboard, tip: Ref<Tip | null>): { state: PointerState; hideTip: () => void; detach: () => void } {
  const st: PointerState = { lp: false, tt: undefined, tipFor: null };
  const lab = (t: EventTarget | null): HTMLElement | null => (t instanceof Element ? t.closest<HTMLElement>('button[aria-label],a[aria-label],label[aria-label]') : null);
  const show = (el: HTMLElement): void => {
    if (!el.isConnected) return;
    const text = el.getAttribute('data-tip') || el.getAttribute('aria-label') || '';
    tip.value = tipFor(text, el.getAttribute('data-key') ?? '', el.getBoundingClientRect(), window.innerWidth);
  };
  const hide = (): void => { clearTimeout(st.tt); if (tip.value) tip.value = null; };
  const pe = (e: Event): PointerEvent => e as PointerEvent;

  // ----- tooltip (this._tl)
  const tipL: Listener[] = [
    ['pointerover', (e) => {
      if (pe(e).pointerType !== 'mouse') return;
      const el = lab(e.target);
      if (!el || el === st.tipFor) return;
      clearTimeout(st.tt);
      st.tipFor = el;
      st.tt = setTimeout(() => { show(el); }, 550);
    }, false],
    ['pointerout', (e) => {
      const p = pe(e);
      if (p.pointerType !== 'mouse') return;
      const rt = p.relatedTarget instanceof Element ? p.relatedTarget : null;
      const onTip = rt?.closest('.tip');
      const el = lab(e.target);
      if (el && rt && el.contains(rt)) return;
      if (onTip) return;
      if (e.target instanceof Element && e.target.closest('.tip') && st.tipFor && rt && st.tipFor.contains(rt)) return;
      st.tipFor = null;
      clearTimeout(st.tt);
      st.tt = setTimeout(hide, 250);
    }, false],
    ['pointerdown', (e) => {
      hide();
      st.lp = false;
      if (pe(e).pointerType === 'mouse') return;
      const el = lab(e.target);
      if (!el) return;
      st.tt = setTimeout(() => { st.lp = true; show(el); }, 480);
    }, false],
    ['pointerup', () => {
      clearTimeout(st.tt);
      if (st.lp) setTimeout(() => { st.lp = false; tip.value = null; }, 1500);
    }, false],
    ['pointercancel', () => { clearTimeout(st.tt); if (!st.lp) return; st.lp = false; hide(); }, false],
    ['click', (e) => { if (st.lp) { e.stopPropagation(); e.preventDefault(); } }, true],
    ['contextmenu', (e) => { if (st.lp) e.preventDefault(); }, false],
  ];

  // ----- widget menu (mnL)
  let mlp: ReturnType<typeof setTimeout> | undefined;
  let mlpOn = false;
  let mlpXY: [number, number] | null = null;
  const end = (): void => { clearTimeout(mlp); };
  const at = (w: HTMLElement, x: number, y: number, ret: HTMLElement | null = null): void => {
    clearTimeout(st.tt);
    tip.value = null;
    openWidgetMenu(d, root, w.getAttribute('data-wid') ?? '', { x, y }, ret);
  };
  const menuL: Listener[] = [
    ['contextmenu', (e) => {
      end();
      if (e.target instanceof Element && e.target.classList.contains('mnuw')) { e.preventDefault(); closeMenu(d, false); return; }
      if (mlpOn) { e.preventDefault(); return; }
      if (st.lp) return;
      const w = menuTarget(d, e.target);
      if (!w) return;
      let tx = '';
      try { tx = String(window.getSelection() ?? ''); } catch { /* ignore */ }
      if (tx) return;
      e.preventDefault();
      const m = e as MouseEvent;
      at(w, m.clientX, m.clientY);
    }, false],
    ['pointerdown', (e) => {
      end();
      mlpOn = false;
      const p = pe(e);
      if (p.pointerType === 'mouse') return;
      const w = menuTarget(d, e.target);
      if (!w) return;
      const x = p.clientX, y = p.clientY;
      mlpXY = [x, y];
      mlp = setTimeout(() => { mlpOn = true; at(w, x, y); }, 700);
    }, false],
    ['pointermove', (e) => {
      const p = pe(e);
      if (mlpXY && Math.abs(p.clientX - mlpXY[0]) + Math.abs(p.clientY - mlpXY[1]) > 12) end();
    }, false],
    ['pointerup', end, false],
    ['pointercancel', end, false],
    ['click', (e) => { if (mlpOn) { mlpOn = false; e.stopPropagation(); e.preventDefault(); } }, true],
    ['keydown', (e) => {
      const k = e as KeyboardEvent;
      if (!(k.key === 'ContextMenu' || (k.shiftKey && k.key === 'F10'))) return;
      const w = menuTarget(d, e.target);
      if (!w) return;
      e.preventDefault();
      const b = w.getBoundingClientRect();
      at(w, Math.max(b.left + 8, b.right - 244), b.top + 12, e.target instanceof HTMLElement ? e.target : null);
    }, false],
  ];

  const all = [...tipL, ...menuL];
  all.forEach(([t, fn, c]) => { root.addEventListener(t, fn, c); });
  const tipKey = (e: KeyboardEvent): void => {
    if (e.key === 'Escape' && tip.value) { e.preventDefault(); e.stopPropagation(); clearTimeout(st.tt); st.tipFor = null; tip.value = null; }
  };
  window.addEventListener('keydown', tipKey, true);
  return {
    state: st,
    hideTip: hide,
    detach: () => {
      all.forEach(([t, fn, c]) => { root.removeEventListener(t, fn, c); });
      window.removeEventListener('keydown', tipKey, true);
      clearTimeout(st.tt);
      end();
    },
  };
}
