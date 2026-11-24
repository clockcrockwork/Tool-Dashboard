import { describe, expect, it } from 'vitest';
import { LOG_MAX, LOG_TEXT_MAX, initialLogs, timelogData, type LogItem } from './data';
import { addLog, dayNowPos, logMarks, logRows, undoAddLog } from './timelog';

const NOW = new Date(2026, 10, 19, 10, 24, 36).getTime();
const many = (n: number): LogItem[] => Array.from({ length: n }, (_v, i) => ({ id: i + 1, t: NOW - (n - i) * 60000, x: 'r' + String(i + 1) }));

describe('timelog', () => {
  it('initial rows match the prototype (3h, 95m, 25m ago; not before midnight)', () => {
    expect(logRows(initialLogs(NOW).logs, false)).toEqual([
      { id: 3, t: '09:59', x: '休憩' }, { id: 2, t: '08:49', x: 'レビュー対応' }, { id: 1, t: '07:24', x: '作業開始' },
    ]);
    const early = initialLogs(new Date(2026, 10, 19, 1, 0).getTime()).logs;
    expect(early[0]?.t).toBe(new Date(2026, 10, 19).getTime());
  });
  it('adds at the end, trims, ignores empty, keeps the newest 40', () => {
    expect(addLog([], '  会議 ', NOW, 7)).toEqual([{ id: 7, t: NOW, x: '会議' }]);
    expect(addLog([], '   ', NOW, 7)).toBeNull();
    expect(addLog([], 'x'.repeat(500), NOW, 7)?.[0]?.x).toHaveLength(LOG_TEXT_MAX);
    const next = addLog(many(LOG_MAX), '新', NOW, 99);
    expect(next).toHaveLength(LOG_MAX);
    expect(next?.[0]?.id).toBe(2);
    expect(next?.at(-1)?.x).toBe('新');
  });
  it('undo takes back only that row, keeps later rows, and restores a row the limit pushed out', () => {
    const before = many(LOG_MAX);
    const added = addLog(before, '出勤', NOW, 99) ?? [];
    const dropped = before.filter(x => !added.some(y => y.id === x.id));
    expect(dropped.map(x => x.id)).toEqual([1]);
    const later = [...added.slice(1), { id: 100, t: NOW + 1000, x: '会議' }];
    const back = undoAddLog(later, 99, dropped);
    expect(back.some(x => x.id === 99)).toBe(false);
    expect(back.some(x => x.id === 100)).toBe(true);
    expect(back).toHaveLength(LOG_MAX);
    expect(undoAddLog(added, 99, dropped)).toEqual(before);
  });
  it('seconds when 「秒まで記録」 is on; marks only for today', () => {
    expect(logRows([{ id: 1, t: NOW, x: 'a' }], true)[0]?.t).toBe('10:24:36');
    expect(logMarks([{ id: 1, t: NOW - 86_400_000, x: 'a' }, { id: 2, t: new Date(2026, 10, 19, 12).getTime(), x: 'b' }], NOW)).toEqual(['calc(50.00% - 1px)']);
    expect(dayNowPos(NOW)).toBe('calc(43.38% - 1px)');
  });
  it('record: unknown fields dropped, broken / duplicate rows dropped, the newest 40 kept', () => {
    expect(timelogData.sanitize({ logs: [{ id: 1, t: NOW, x: 'a', editing: true }, { id: 1, t: NOW, x: 'dup' }, { id: 2, t: 'x', x: 'b' }, { id: 3, t: NOW, x: '  ' }], draft: 'x' }, NOW))
      .toEqual({ logs: [{ id: 1, t: NOW, x: 'a' }] });
    expect(timelogData.sanitize({ logs: many(60) }, NOW)?.logs.map(x => x.id)[0]).toBe(21);
    expect(timelogData.sanitize({ logs: 'x' }, NOW)).toBeNull();
    expect(timelogData.sanitize([], NOW)).toBeNull();
  });
});
