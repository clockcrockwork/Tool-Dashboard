/**
 * 非同期の記録の保存先 (実装ガイド 7.5「保存先」, review #7) — the minimal boundary for large records.
 *
 * 設定と小さな記録は区画ごとに localStorage へ同期で保存する（`persist.ts`）。画像・会話・表・スクリプトのように大きくなる記録は
 * localStorage に入れず、ここ（IndexedDB）に分ける。今の7個は使わない。P2 で受け渡し・AIチャット・表・スクリプトが使う（録音と画像変換の画像は
 * 実装ガイド 6章で「保存しない」ので、ここに置くかどうかは P2 のその分類で決める）。
 *
 * - 境界は `RecordStore`（`get` / `set` / `delete` / `keys(prefix)`、どれも Promise）。キーは配置 ID で始める（`share:…`、`table#2:…`）。
 *   値は structured clone できるもの（Blob・ArrayBuffer・素のオブジェクト）。Vue の reactive は `toRaw` してから渡す。
 *   `set` は呼んだ時点の値を写して保存する（あとで元の値を書き換えても、保存される値は変わらない）。
 * - 保存の順番: 同じキーへの書き込み（`set`・`delete`）は呼んだ順に1つずつ行い、最後に呼んだものが残る（後勝ち）。遅れて終わった古い
 *   書き込みが新しい値を上書きすることはない。`get` と `keys` はそれまでに呼んだ書き込みが終わってから読む。
 * - 失敗: どの操作も失敗すると Promise を reject し、`onError` にも知らせる（容量不足・IndexedDB が使えない環境など）。知らせ方
 *   （トーストの文言など）は使う側が決める。失敗した書き込みのあとの書き込みは止めずに続ける。
 * - 実装は2つ: `idbBackend()`（IndexedDB、Dexie。Dexie は最初の操作のときに読み込む）と `memoryBackend()`（テスト用）。
 *   `createRecords(backend)` が順番と失敗の扱いを足す。
 * - 書き出し（実装ガイド 5章）への含め方、`navigator.storage.persist()`、タブ間の同期は P2 の各分類・P3 で決める。ここには入れない。
 *   鍵・認証情報はここにも保存しない。保存しないもの（録音・画像変換の画像・現在地・スクリプトの結果・会話保存オフの会話・生成途中の応答）
 *   はここにも書かない（`src/widgets/README.md`）。
 */
import type { DexieOptions } from 'dexie';

export type RecordOp = 'get' | 'set' | 'delete' | 'keys';
export type RecordError = Readonly<{ op: RecordOp; key: string; error: unknown }>;

/** A raw async key-value store (IndexedDB, memory). `createRecords` adds ordering and error reporting on top. */
export interface RecordBackend {
  get(key: string): Promise<unknown>;
  set(key: string, value: unknown): Promise<void>;
  delete(key: string): Promise<void>;
  /** Keys that start with `prefix` ('' = all), in key order. */
  keys(prefix: string): Promise<string[]>;
}

/** The store widgets use for large records. */
export interface RecordStore {
  get<T = unknown>(key: string): Promise<T | undefined>;
  set(key: string, value: unknown): Promise<void>;
  delete(key: string): Promise<void>;
  keys(prefix?: string): Promise<string[]>;
  /** Resolves when every write called so far has finished (succeeded or failed). */
  settled(): Promise<void>;
  /** Called once for each failed operation, in addition to the rejected Promise. */
  onError: ((e: RecordError) => void) | null;
}

export type RecordsOptions = Readonly<{ onError?: (e: RecordError) => void }>;

/** Adds the ordering and failure rules above to a backend. */
export function createRecords(backend: RecordBackend, opts: RecordsOptions = {}): RecordStore {
  /** Per key: the last queued write; it never rejects (failures are reported on the caller's Promise). */
  const tails = new Map<string, Promise<void>>();
  const fail = (op: RecordOp, key: string, error: unknown): never => {
    try { rs.onError?.({ op, key, error }); } catch { /* a broken listener must not hide the failure */ }
    throw error;
  };
  const after = (key: string): Promise<void> => tails.get(key) ?? Promise.resolve();
  const write = (op: 'set' | 'delete', key: string, run: () => Promise<void>): Promise<void> => {
    const p = after(key).then(run).catch((e: unknown) => fail(op, key, e));
    const tail = p.then(() => undefined, () => undefined);
    tails.set(key, tail);
    void tail.then(() => { if (tails.get(key) === tail) tails.delete(key); });
    return p;
  };
  const rs: RecordStore = {
    onError: opts.onError ?? null,
    get: <T>(key: string) => after(key).then(() => backend.get(key)).then(v => v as T | undefined, (e: unknown) => fail('get', key, e)),
    set: (key, value) => {
      let copy: unknown;
      try { copy = structuredClone(value); } catch (e) { return Promise.reject(e as Error).catch((x: unknown) => fail('set', key, x)); }
      return write('set', key, () => backend.set(key, copy));
    },
    delete: key => write('delete', key, () => backend.delete(key)),
    keys: (prefix = '') => rs.settled().then(() => backend.keys(prefix)).catch((e: unknown) => fail('keys', prefix, e)),
    settled: () => Promise.all([...tails.values()]).then(() => undefined),
  };
  return rs;
}

/** In-memory backend (tests, environments without IndexedDB). Values are copied in and out like IndexedDB does. */
export function memoryBackend(init: Readonly<Record<string, unknown>> = {}): RecordBackend & { readonly map: Map<string, unknown> } {
  const map = new Map<string, unknown>(Object.entries(init));
  return {
    map,
    get: key => Promise.resolve(map.has(key) ? structuredClone(map.get(key)) : undefined),
    set: (key, value) => { map.set(key, structuredClone(value)); return Promise.resolve(); },
    delete: key => { map.delete(key); return Promise.resolve(); },
    keys: prefix => Promise.resolve([...map.keys()].filter(k => k.startsWith(prefix)).sort()),
  };
}

export type IdbOptions = Readonly<{
  /** Database name (default `lgd-records`). */
  name?: string;
  /** IndexedDB implementation (tests pass `fake-indexeddb`); default: the browser's. */
  indexedDB?: DexieOptions['indexedDB'];
  IDBKeyRange?: DexieOptions['IDBKeyRange'];
}>;

type Row = { k: string; v: unknown };
type RowTable = {
  get: (k: string) => PromiseLike<Row | undefined>;
  put: (row: Row) => PromiseLike<unknown>;
  delete: (k: string) => PromiseLike<unknown>;
  where: (index: string) => { startsWith: (p: string) => { primaryKeys: () => PromiseLike<string[]> } };
  toCollection: () => { primaryKeys: () => PromiseLike<string[]> };
};

/**
 * IndexedDB backend (Dexie). One object store `rec` of `{k, v}` rows keyed by `k`. Dexie is loaded on the first
 * operation, so pages that never use large records do not load it; if loading or opening fails, the operation fails
 * (reported through `createRecords`) and the next operation tries again.
 */
export function idbBackend(opts: IdbOptions = {}): RecordBackend & { close: () => Promise<void> } {
  let opening: Promise<{ table: RowTable; close: () => void }> | null = null;
  const open = (): Promise<{ table: RowTable; close: () => void }> => {
    opening ??= import('dexie').then(m => {
      const Dexie = m.default;
      const db = new Dexie(opts.name ?? 'lgd-records', {
        ...(opts.indexedDB ? { indexedDB: opts.indexedDB } : {}),
        ...(opts.IDBKeyRange ? { IDBKeyRange: opts.IDBKeyRange } : {}),
      });
      db.version(1).stores({ rec: 'k' });
      return db.open().then(() => ({ table: db.table<Row, string>('rec') as unknown as RowTable, close: () => { db.close(); } }));
    }).catch((e: unknown) => { opening = null; throw e; });
    return opening;
  };
  return {
    get: async key => (await (await open()).table.get(key))?.v,
    set: async (key, value) => { await (await open()).table.put({ k: key, v: value }); },
    delete: async key => { await (await open()).table.delete(key); },
    keys: async prefix => {
      const t = (await open()).table;
      return [...await (prefix ? t.where('k').startsWith(prefix) : t.toCollection()).primaryKeys()];
    },
    close: async () => { if (opening) (await opening).close(); opening = null; },
  };
}
