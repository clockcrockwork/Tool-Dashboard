import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { effectScope, nextTick, ref } from 'vue';
import { Dashboard } from '../../app/store/store';
import { memoryStore } from '../../app/store/persist';
import { sampleAdapter } from '../rss/source';
import { sampleDay } from './adapter';
import { TODAY_NONE, todayKey, todayView } from './today';
import { todaySource } from './status';

describe('今日は何の日（プロトタイプ `tdDay`・`tdMonth`・`tdName`）', () => {
  it('11月17日は見本の「将棋の日」', () => {
    expect(todayKey(new Date(2026, 10, 17, 9).getTime())).toBe('11-17');
    expect(todayView('11-17', sampleDay('11-17'))).toEqual({ day: '17', month: '11月', name: '将棋の日' });
  });
  it('見本の無い日（再現度テストの 11月19日）は「記念日データ未設定」', () => {
    expect(todayView('11-19', sampleDay('11-19'))).toEqual({ day: '19', month: '11月', name: TODAY_NONE });
    expect(todayView('1-1', '')).toMatchObject({ day: '1', month: '1月', name: TODAY_NONE });
  });
  it('日付は端末の日付（0時をまたいだら次の日）', () => {
    expect(todayKey(new Date(2026, 11, 31, 23, 59).getTime())).toBe('12-31');
    expect(todayKey(new Date(2027, 0, 1, 0, 0).getTime())).toBe('1-1');
  });
});

describe('日付が変わったら表示中だけ取り直す。届くまでは前の日の日付と内容を組で出す', () => {
  beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date(2026, 10, 17, 23, 59)); });
  afterEach(() => { vi.useRealTimers(); });
  it('11-17 → 11-18', async () => {
    const d = new Dashboard({ store: memoryStore(), dataDefs: {}, now: () => Date.now(), setTimeout: () => 0 });
    d.ui.tour = -1;
    d.g.off = { ...d.g.off, today: false };
    const key = ref('11-17');
    const scope = effectScope();
    const p = scope.run(() => todaySource.use(d, 'today', () => key.value, { adapter: sampleAdapter(sampleDay, 500) }));
    if (!p) throw new Error('no place');
    expect(todayView(p.key, p.val).name).toBe('将棋の日');
    key.value = '11-18';
    await nextTick();
    expect(todayView(p.key, p.val)).toMatchObject({ day: '17', name: '将棋の日' });
    await vi.advanceTimersByTimeAsync(500);
    expect(todayView(p.key, p.val)).toEqual({ day: '18', month: '11月', name: TODAY_NONE });
    scope.stop();
  });
});
