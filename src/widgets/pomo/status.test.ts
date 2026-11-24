/**
 * 保存しないもの（実装ガイド 6章「再生中かどうか」）: ポモドーロとストップウォッチの計測は Dashboard ごとの一時状態に置き、
 * 区画（`cfg`・`data`）に入らない。同じ種類の2つの配置や、別の Dashboard とは混ざらない.
 */
import { describe, expect, it } from 'vitest';
import { effectScope, nextTick } from 'vue';
import { Dashboard } from '../../app/store/store';
import { memoryStore } from '../../app/store/persist';
import { WIDGET_DATA } from '../index';
import { POMO_IDLE, startPomo } from './pomo';
import { pomoRunOf, setPomoRun } from './status';
import { SW_IDLE, toggleSw } from '../stopwatch/stopwatch';
import { setSw, swOf } from '../stopwatch/status';

const NOW = new Date(2026, 10, 19, 10, 24, 36).getTime();

describe('ポモドーロ・ストップウォッチの計測は保存しない', () => {
  it('starting them writes nothing to the store', async () => {
    const store = memoryStore();
    const d = new Dashboard({ store, dataDefs: WIDGET_DATA, now: () => NOW, setTimeout: () => 0 });
    const scope = effectScope();
    const stop = scope.run(() => d.start());
    await nextTick();
    const before = Object.fromEntries(store.keys().map(k => [k, store.get(k)]));
    setPomoRun(d, 'pomo', startPomo(POMO_IDLE, 1500, NOW));
    setSw(d, 'stopwatch', toggleSw(SW_IDLE, NOW));
    await nextTick();
    expect(Object.fromEntries(store.keys().map(k => [k, store.get(k)]))).toEqual(before);
    expect(JSON.stringify([d.cfg, d.data])).not.toContain('endAt');
    stop?.();
    scope.stop();
  });
  it('kept per Dashboard and per placement', () => {
    const a = new Dashboard({ store: memoryStore(), dataDefs: WIDGET_DATA, now: () => NOW, setTimeout: () => 0 });
    const b = new Dashboard({ store: memoryStore(), dataDefs: WIDGET_DATA, now: () => NOW, setTimeout: () => 0 });
    setPomoRun(a, 'pomo', startPomo(POMO_IDLE, 1500, NOW));
    setSw(a, 'stopwatch', toggleSw(SW_IDLE, NOW));
    expect(pomoRunOf(a, 'pomo').on).toBe(true);
    expect(pomoRunOf(b, 'pomo')).toBe(POMO_IDLE);
    expect(swOf(a, 'stopwatch#2')).toBe(SW_IDLE);
    expect(swOf(b, 'stopwatch')).toBe(SW_IDLE);
  });
});
