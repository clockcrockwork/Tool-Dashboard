import { describe, expect, it } from 'vitest';
import { Dashboard } from './store';
import { memoryStore } from './persist';
import { isShown } from './visibility';

function make(): Dashboard {
  const d = new Dashboard({ store: memoryStore(), dataDefs: {}, now: () => 1_000_000, setTimeout: () => 0 });
  d.ui.tour = -1;
  d.g.groups = [{ id: 'g0', n: 'ボード 1' }, { id: 'g1', n: 'ボード 2' }];
  d.g.off = { ...d.g.off, weather: false, clock: false, rain: false };
  d.g.place = { ...d.g.place, clock: 'g0', weather: 'g0', rain: 'g1' };
  return d;
}

describe('isShown (表示中の画面・前面表示・一時利用)', () => {
  it('a placement on the current screen is shown; one on another screen is not', () => {
    const d = make();
    expect(d.layout.value.pos.weather?.page).toBe(0);
    expect(d.layout.value.pos.rain?.page).toBeGreaterThan(0);
    expect(isShown(d, 'weather')).toBe(true);
    expect(isShown(d, 'rain')).toBe(false);
    d.go(d.layout.value.pos.rain?.page ?? 1);
    expect(isShown(d, 'weather')).toBe(false);
    expect(isShown(d, 'rain')).toBe(true);
  });

  it('unplaced (未配置) and unknown placements are not shown', () => {
    const d = make();
    d.g.off = { ...d.g.off, weather: true };
    expect(isShown(d, 'weather')).toBe(false);
    expect(isShown(d, 'links#9')).toBe(false);
  });

  it('前面表示 shows a placed widget whatever the screen; 一時利用 shows an unplaced one', () => {
    const d = make();
    d.ui.big = 'rain';
    expect(isShown(d, 'rain')).toBe(true);
    d.ui.big = null;
    d.g.off = { ...d.g.off, weather: true };
    d.openWidget('weather');
    expect([d.ui.big, d.ui.temp]).toEqual(['weather', 'weather']);
    expect(isShown(d, 'weather')).toBe(true);
    d.back();
    expect(isShown(d, 'weather')).toBe(false);
  });

  it('a full-screen placement is shown only on its own screen', () => {
    const d = make();
    d.g.pgW = { clock: true };
    const p = d.layout.value.pos.clock?.page ?? -1;
    expect(d.layout.value.full[p]).toBe('clock');
    expect(isShown(d, 'clock')).toBe(p === d.page);
    d.go(p);
    expect(isShown(d, 'clock')).toBe(true);
    expect(isShown(d, 'weather')).toBe(false);
  });
});
