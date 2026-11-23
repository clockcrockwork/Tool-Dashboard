import { inject, provide, type InjectionKey } from 'vue';
import type { Dashboard } from './store/store';

const KEY: InjectionKey<Dashboard> = Symbol('dashboard');

export function provideDash(d: Dashboard): void {
  provide(KEY, d);
}

export function useDash(): Dashboard {
  const d = inject(KEY);
  if (!d) throw new Error('useDash() must be used inside <DashboardRoot> (or a story decorator that provides a Dashboard).');
  return d;
}
