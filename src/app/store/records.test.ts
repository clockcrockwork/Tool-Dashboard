import { describe, expect, it, vi } from 'vitest';
import { IDBKeyRange, indexedDB } from 'fake-indexeddb';
import { createRecords, idbBackend, memoryBackend, type RecordBackend, type RecordError } from './records';
import { Dashboard } from './store';
import { memoryStore } from './persist';

let dbSeq = 0;
const idb = () => idbBackend({ name: 'lgd-records-test-' + String(++dbSeq), indexedDB, IDBKeyRange });

describe('records: IndexedDB (Dexie, fake-indexeddb) の往復', () => {
  it('set → get, keys(prefix), delete', async () => {
    const be = idb();
    const rs = createRecords(be);
    const img = new Uint8Array([1, 2, 3]);
    await rs.set('share:1', { n: '写真', img });
    await rs.set('share:2', { n: 'メモ' });
    await rs.set('table#2:cells', [['a', 'b'], ['c', 'd']]);
    expect(await rs.get('share:1')).toEqual({ n: '写真', img: new Uint8Array([1, 2, 3]) });
    expect(await rs.get('table#2:cells')).toEqual([['a', 'b'], ['c', 'd']]);
    expect(await rs.get('nope')).toBeUndefined();
    expect(await rs.keys('share:')).toEqual(['share:1', 'share:2']);
    expect(await rs.keys()).toEqual(['share:1', 'share:2', 'table#2:cells']);
    await rs.delete('share:1');
    expect(await rs.get('share:1')).toBeUndefined();
    expect(await rs.keys('share:')).toEqual(['share:2']);
    await be.close();
  });

  it('survives reopening the database (a new page load)', async () => {
    const name = 'lgd-records-reopen';
    const a = idbBackend({ name, indexedDB, IDBKeyRange });
    await createRecords(a).set('chat:log', [{ r: 'u', t: 'こんにちは' }]);
    await a.close();
    const b = idbBackend({ name, indexedDB, IDBKeyRange });
    expect(await createRecords(b).get('chat:log')).toEqual([{ r: 'u', t: 'こんにちは' }]);
    await b.close();
  });

  it('saves the value as it was when set was called', async () => {
    const rs = createRecords(idb());
    const v = { rows: ['a'] };
    const p = rs.set('k', v);
    v.rows.push('b');
    await p;
    expect(await rs.get('k')).toEqual({ rows: ['a'] });
  });

  it('back-to-back writes to the same key end with the last one', async () => {
    const rs = createRecords(idb());
    const ps = [rs.set('k', 1), rs.set('k', 2), rs.delete('k'), rs.set('k', 3)];
    expect(await rs.get('k')).toBe(3);
    await Promise.all(ps);
    expect(await rs.get('k')).toBe(3);
  });
});

/** A backend whose writes finish after a delay chosen per call (the first write is slow). */
function slowBackend(delays: number[]): RecordBackend & { order: string[] } {
  const mem = memoryBackend();
  const order: string[] = [];
  let n = 0;
  return {
    order,
    get: k => mem.get(k),
    keys: p => mem.keys(p),
    delete: k => mem.delete(k),
    set: (k, v) => new Promise<void>(resolve => {
      const ms = delays[n++] ?? 0;
      setTimeout(() => { void mem.set(k, v).then(() => { order.push(String(v)); resolve(); }); }, ms);
    }),
  };
}

describe('records: 保存の順番（後勝ち）', () => {
  it('an older slow write does not overwrite a newer value', async () => {
    vi.useFakeTimers();
    try {
      const be = slowBackend([50, 0]);
      const rs = createRecords(be);
      const a = rs.set('k', 'old');
      const b = rs.set('k', 'new');
      await vi.runAllTimersAsync();
      await Promise.all([a, b]);
      expect(be.order).toEqual(['old', 'new']);
      expect(await rs.get('k')).toBe('new');
    } finally {
      vi.useRealTimers();
    }
  });

  it('without the ordering the same backend would keep the old value (the case this guards)', async () => {
    vi.useFakeTimers();
    try {
      const be = slowBackend([50, 0]);
      const a = be.set('k', 'old');
      const b = be.set('k', 'new');
      await vi.runAllTimersAsync();
      await Promise.all([a, b]);
      expect(await be.get('k')).toBe('old');
    } finally {
      vi.useRealTimers();
    }
  });

  it('writes to different keys do not wait for each other; get reads after pending writes of its key', async () => {
    vi.useFakeTimers();
    try {
      const be = slowBackend([50, 0]);
      const rs = createRecords(be);
      const a = rs.set('a', 'A');
      const b = rs.set('b', 'B');
      const ga = rs.get('a');
      await vi.advanceTimersByTimeAsync(1);
      expect(be.order).toEqual(['B']);
      await vi.runAllTimersAsync();
      await Promise.all([a, b]);
      expect(await ga).toBe('A');
      expect(be.order).toEqual(['B', 'A']);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('records: 失敗の伝わり方', () => {
  const quota = Object.assign(new Error('QuotaExceededError'), { name: 'QuotaExceededError' });
  const failingSet = (fails: number): RecordBackend => {
    const mem = memoryBackend();
    let n = 0;
    return { ...mem, set: (k, v) => (n++ < fails ? Promise.reject(quota) : mem.set(k, v)) };
  };

  it('a failed write rejects its Promise and calls onError once; later writes still run', async () => {
    const errors: RecordError[] = [];
    const rs = createRecords(failingSet(1), { onError: e => { errors.push(e); } });
    await expect(rs.set('k', 1)).rejects.toBe(quota);
    expect(errors).toEqual([{ op: 'set', key: 'k', error: quota }]);
    await expect(rs.set('k', 2)).resolves.toBeUndefined();
    expect(await rs.get('k')).toBe(2);
    expect(errors).toHaveLength(1);
  });

  it('a failed older write does not block or undo the newer one', async () => {
    const onError = vi.fn();
    const rs = createRecords(failingSet(1), { onError });
    const a = rs.set('k', 'old');
    const b = rs.set('k', 'new');
    await expect(a).rejects.toBe(quota);
    await expect(b).resolves.toBeUndefined();
    expect(await rs.get('k')).toBe('new');
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it('values that cannot be stored (not structured-cloneable) are reported, not saved', async () => {
    const onError = vi.fn();
    const rs = createRecords(memoryBackend(), { onError });
    await expect(rs.set('k', { f: () => 1 })).rejects.toBeInstanceOf(Error);
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ op: 'set', key: 'k' }));
    expect(await rs.keys()).toEqual([]);
  });

  it('IndexedDB that cannot open: every operation fails and is reported; the next one tries again', async () => {
    const onError = vi.fn();
    const broken = { open: () => { throw new Error('IndexedDB is not available'); } };
    const rs = createRecords(idbBackend({ name: 'x', indexedDB: broken, IDBKeyRange }), { onError });
    await expect(rs.set('k', 1)).rejects.toBeDefined();
    await expect(rs.get('k')).rejects.toBeDefined();
    await expect(rs.keys('')).rejects.toBeDefined();
    expect(onError.mock.calls.map(c => (c[0] as RecordError).op)).toEqual(['set', 'get', 'keys']);
  });

  it('onError can be set later and a throwing listener does not hide the failure', async () => {
    const rs = createRecords(failingSet(2));
    rs.onError = () => { throw new Error('listener'); };
    await expect(rs.set('k', 1)).rejects.toBe(quota);
    const seen: string[] = [];
    rs.onError = e => { seen.push(e.op + ':' + e.key); };
    await expect(rs.set('j', 1)).rejects.toBe(quota);
    expect(seen).toEqual(['set:j']);
  });
});

describe('records: Dashboard が保存先を持つ', () => {
  it('keeps the store it is given (none by default); widget records stay in their sections', async () => {
    const rs = createRecords(memoryBackend());
    const d = new Dashboard({ store: memoryStore(), dataDefs: {}, records: rs, setTimeout: () => 0 });
    expect(d.records).toBe(rs);
    await d.records?.set('table:cells', [['a']]);
    expect(await rs.get('table:cells')).toEqual([['a']]);
    expect(new Dashboard({ store: memoryStore(), dataDefs: {}, setTimeout: () => 0 }).records).toBeNull();
  });
});
