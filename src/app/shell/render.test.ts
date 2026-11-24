/**
 * review #7: 重いウィジェットは表示されるまで描画しない. A `lazy` kind is rendered only while its screen is the current one
 * or next to it, in front, or used without placing; other kinds are always rendered (the first 7 keep their behaviour).
 */
import { describe, expect, it } from 'vitest';
import { Dashboard } from '../store/store';
import { memoryStore } from '../store/persist';
import { fullScreenViews, gridPlacements } from './render';

function board4() {
  const d = new Dashboard({ store: memoryStore(), dataDefs: {}, setTimeout: () => 0 });
  const g1 = d.addBoard(), g2 = d.addBoard(), g3 = d.addBoard();
  // links on the 4th board (screen 4), search on the 2nd; the rest stay on board 1.
  d.g.place = { ...d.g.place, links: g3, search: g1 };
  void g2;
  return d;
}
const linksLazy = (k: string): boolean => k === 'links';

describe('gridPlacements (lazy)', () => {
  it('a lazy placement far from the current screen is not rendered; moving near renders it', () => {
    const d = board4();
    expect(d.layout.value.pos.links?.page).toBe(3);
    expect(gridPlacements(d, linksLazy)).not.toContain('links');
    // Non-lazy placements on other screens are rendered as before.
    expect(gridPlacements(d, linksLazy)).toContain('search');
    d.go(2);
    expect(gridPlacements(d, linksLazy)).toContain('links');
    d.go(3);
    expect(gridPlacements(d, linksLazy)).toContain('links');
    d.go(0);
    expect(gridPlacements(d, linksLazy)).not.toContain('links');
  });
  it('renders a lazy placement opened in front, and one used without placing', () => {
    const d = board4();
    d.ui.big = 'links';
    expect(gridPlacements(d, linksLazy)).toContain('links');
    d.ui.big = null;
    d.g.off = { ...d.g.off, links: true };
    expect(gridPlacements(d, linksLazy)).not.toContain('links');
    Object.assign(d.ui, { big: 'links', temp: 'links' });
    expect(gridPlacements(d, linksLazy)).toContain('links');
  });
  it('with the real registry every placed kind is rendered (no kind is lazy yet)', () => {
    const d = board4();
    const placed = d.ids.value.filter(id => !d.g.off[id]);
    expect(gridPlacements(d)).toEqual(placed);
  });
});

describe('fullScreenViews (lazy)', () => {
  it('a lazy full-screen view is rendered only near the current screen; others always', () => {
    const d = board4();
    d.g.pgW = { clock: true };
    const fs = d.layout.value.fullScreens.find(s => s.id === 'clock');
    expect(fs?.page).toBe(1);
    expect(fullScreenViews(d).map(s => s.id)).toEqual(['clock']);
    const clockLazy = (k: string): boolean => k === 'clock';
    d.go(4);
    expect(fullScreenViews(d, clockLazy)).toEqual([]);
    d.go(2);
    expect(fullScreenViews(d, clockLazy).map(s => s.id)).toEqual(['clock']);
  });
});
