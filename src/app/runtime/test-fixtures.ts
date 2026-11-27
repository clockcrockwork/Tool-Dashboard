/**
 * Test fixtures for the runtime and the shared notification (Vitest only; not imported by the app).
 * The browser parts (Notification / Permissions API, `document.hidden`) are replaced by fakes.
 */
import { effectScope } from 'vue';
import { Dashboard } from '../store/store';
import { memoryStore, type SectionStore } from '../store/persist';
import { WIDGETS, WIDGET_DATA, WIDGET_RUNNERS } from '../../widgets';
import { setNotifyApi } from './notify';
import { setPermBrowser, type BrowserPerm, type PermBrowser } from './permission';
import type { Permission } from '../registry/registry';
import { runtimeOf, type PageVisibility } from './runtime';

export type FakePerms = PermBrowser & {
  /** What the browser says now, per permission. */
  st: Record<Permission, BrowserPerm>;
  /** What the browser prompt answers. */
  answer: Record<Permission, BrowserPerm>;
  requests: Record<Permission, number>;
  /** Simulates a change in the browser settings (Permissions API `change`). */
  change: (p: Permission, s: BrowserPerm) => void;
};

/** Replaces the browser side of every permission (Permissions API, prompts). Unlisted ones are `prompt`. */
export function fakePerms(init: Partial<Record<Permission, BrowserPerm>> = {}): FakePerms {
  const listeners = new Map<Permission, Set<(s: BrowserPerm) => void>>();
  const all = (v: BrowserPerm): Record<Permission, BrowserPerm> => ({ geo: v, notify: v, mic: v, clipboard: v });
  const f: FakePerms = {
    st: { ...all('prompt'), ...init }, answer: all('granted'), requests: { geo: 0, notify: 0, mic: 0, clipboard: 0 },
    read: p => f.st[p],
    watch: (p, fn) => {
      const set = listeners.get(p) ?? new Set();
      listeners.set(p, set);
      set.add(fn);
      return () => { set.delete(fn); };
    },
    request: (p) => { f.requests[p]++; f.st[p] = f.answer[p]; return Promise.resolve(f.answer[p]); },
    change: (p, s) => { f.st[p] = s; listeners.get(p)?.forEach((fn) => { fn(s); }); },
  };
  setPermBrowser(f);
  return f;
}

export type FakeNotify = {
  /** `Notification.permission` (null: notifications are not available here). */
  perm: NotificationPermission | null;
  /** What 「許可」 in the browser prompt answers. */
  answer: NotificationPermission;
  tabHidden: boolean;
  shown: { title: string; body: string; tag: string }[];
  readonly requests: number;
  /** Simulates a change in the browser settings (Permissions API `change`). */
  change: (p: NotificationPermission) => void;
  /** The fake of every permission (the notification one follows `perm` / `answer`). */
  perms: FakePerms;
};

const toBrowser = (p: NotificationPermission | null): BrowserPerm => (p === null ? 'none' : p === 'default' ? 'prompt' : p);
const toNotification = (p: BrowserPerm): NotificationPermission | null => (p === 'none' ? null : p === 'prompt' ? 'default' : p);

/** Replaces the browser side of notifications (sending, `document.hidden`) and of the permissions. */
export function fakeNotify(perm: NotificationPermission | null = 'default'): FakeNotify {
  const perms = fakePerms({ notify: toBrowser(perm) });
  const f: FakeNotify = {
    get perm() { return toNotification(perms.st.notify); },
    set perm(v) { perms.st.notify = toBrowser(v); },
    get answer() { return toNotification(perms.answer.notify) ?? 'denied'; },
    set answer(v) { perms.answer.notify = toBrowser(v); },
    get requests() { return perms.requests.notify; },
    tabHidden: false, shown: [], perms,
    change: (p) => { perms.change('notify', toBrowser(p)); },
  };
  setNotifyApi({
    show: (title, body, tag) => { f.shown.push({ title, body, tag }); },
    hidden: () => f.tabHidden,
  });
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
