/**
 * Test fixtures for the runtime and the shared notification (Vitest only; not imported by the app).
 * The browser parts (Notification / Permissions API, `document.hidden`) are replaced by fakes.
 */
import { effectScope } from 'vue';
import { Dashboard } from '../store/store';
import { memoryStore, type SectionStore } from '../store/persist';
import { WIDGETS, WIDGET_DATA, WIDGET_RUNNERS } from '../../widgets';
import { setNotifyApi, type NotifyApi } from './notify';
import { runtimeOf, type PageVisibility } from './runtime';

export type FakeNotify = NotifyApi & {
  perm: NotificationPermission | null;
  /** What 「許可」 in the browser prompt answers. */
  answer: NotificationPermission;
  tabHidden: boolean;
  shown: { title: string; body: string; tag: string }[];
  requests: number;
  /** Simulates a change in the browser settings (Permissions API `change`). */
  change: (p: NotificationPermission) => void;
};

export function fakeNotify(perm: NotificationPermission | null = 'default'): FakeNotify {
  const listeners = new Set<() => void>();
  const f: FakeNotify = {
    perm, answer: 'granted', tabHidden: false, shown: [], requests: 0,
    permission: () => f.perm,
    request: () => { f.requests++; f.perm = f.answer; return Promise.resolve(f.answer); },
    show: (title, body, tag) => { f.shown.push({ title, body, tag }); },
    hidden: () => f.tabHidden,
    onChange: (fn) => { listeners.add(fn); return () => { listeners.delete(fn); }; },
    change: (p) => { f.perm = p; listeners.forEach(fn => { fn(); }); },
  };
  setNotifyApi(f);
  return f;
}

export type FakePage = PageVisibility & { setHidden: (h: boolean) => void };

export function fakePage(): FakePage {
  let hidden = false;
  const listeners = new Set<() => void>();
  return {
    hidden: () => hidden,
    onChange: (fn) => { listeners.add(fn); return () => { listeners.delete(fn); }; },
    setHidden: (h) => { hidden = h; listeners.forEach(fn => { fn(); }); },
  };
}

export type RunDash = { d: Dashboard; store: SectionStore; page: FakePage; stop: () => void };

/**
 * A Dashboard as the app starts it (persistence watchers + the runtime with the app's runners), without any view.
 * Uses the global (fake) timers and `Date.now`.
 */
export function runDash(store: SectionStore = memoryStore()): RunDash {
  const d = new Dashboard({ store, dataDefs: WIDGET_DATA, implemented: Object.keys(WIDGETS) });
  d.ui.tour = -1;
  const page = fakePage();
  const scope = effectScope(true);
  const stopSave = scope.run(() => d.start());
  const stopRun = runtimeOf(d).start(WIDGET_RUNNERS, { page });
  return { d, store, page, stop: () => { stopRun(); stopSave?.(); scope.stop(); } };
}

/** Texts of the toasts now on screen. */
export const toastTexts = (d: Dashboard): string[] => d.ui.toasts.map(t => t.text);
