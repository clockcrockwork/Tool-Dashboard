/** Opening a select menu from a sheet button; the overlays layer draws and places it. */
import { openSelectMenu } from '../../store/overlays';
import type { Dashboard } from '../../store/store';

export function openSel(d: Dashboard, key: string, label: string, e: Event): void {
  const btn = (e.target as Element | null)?.closest<HTMLElement>('button') ?? null;
  const root = btn?.closest<HTMLElement>('.dash') ?? document.querySelector<HTMLElement>('.dash');
  if (root) openSelectMenu(d, root, key, label, btn);
}
