// 描画対象（プロトタイプ / 本実装）ごとの違いをここに集める: URL、seed の保存キー、描画完了の目印。
import { spawn, type ChildProcess } from 'node:child_process';
import { copyFile, mkdir, access, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serveDir } from './server.ts';
import { seedEntries, type StorageEntries } from './env.ts';
import type { Seed } from './types.ts';

export const VRT_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const ROOT = resolve(VRT_DIR, '..');
export const PROTO_SRC = join(ROOT, 'design/claude-design/Main.dc.html');
export const PROTO_ICON = join(ROOT, 'design/claude-design/app-icon.svg');
export const DEFAULT_RUNTIME =
  '/tmp/claude-0/-home-user-Tool-Dashboard/9e4c8986-0e29-5d82-a7a8-e15f05fe9176/scratchpad/proto/support.js';

export interface Target {
  name: 'prototype' | 'app';
  url: string;
  /** 描画が終わった目印。下部バーはどの状態にもあるので共通の目印にする */
  ready: string;
  storage(seed: Seed | null | undefined): StorageEntries;
  close(): Promise<void>;
}

/** プロトタイプの保存キー（JSON 1本） */
export const PROTO_KEY = 'lgdash.v1';
/** 本実装の全体設定の保存キー */
export const APP_KEY = 'lgd.v1:global';

/** seed → プロトタイプの localStorage */
export function protoStorage(seed: Seed | null | undefined): StorageEntries {
  return seedEntries(PROTO_KEY, seed);
}

/**
 * seed → 本実装の localStorage。キー名の違いが出たらここで変換する。
 * 全体の区画には版 `v: 1` を付ける（無くても 1 と読まれるが、本番が書く形にそろえる）。
 * order / off / place / groups / tourDone / pgW はプロトタイプと同じ名前・同じ意味（配置 ID = 種類 ID）なのでそのまま渡す。
 * groups の `n`（ボード名）は本実装では読まない（番号から付け直す）が、害はないので残す。
 */
export function appStorage(seed: Seed | null | undefined): StorageEntries {
  return seedEntries(APP_KEY, seed ? { v: 1, ...seed } : seed);
}

/** 本実装の index.html と同じ viewport メタ */
export const VIEWPORT_META = '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">';

export function injectViewportMeta(html: string): string {
  if (/<meta[^>]+name=["']viewport["']/i.test(html)) return html;
  return html.replace(/<meta charset="utf-8">/i, (m) => `${m}\n${VIEWPORT_META}`);
}

export async function prototypeTarget(): Promise<Target> {
  const runtime = process.env.PROTOTYPE_RUNTIME || DEFAULT_RUNTIME;
  try {
    await access(runtime);
  } catch {
    throw new Error(
      `プロトタイプのランタイム（support.js）が見つかりません: ${runtime}\n` +
        '環境変数 PROTOTYPE_RUNTIME に support.js のパスを指定してください（docs/lgd/vrt.md 参照）。',
    );
  }
  const dir = join(VRT_DIR, '.cache/proto');
  await mkdir(dir, { recursive: true });
  // プロトタイプには viewport メタが無い（Claude Design のプレビュー枠で表示する前提）。
  // isMobile のエミュレーションで 980px 幅のレイアウトにならないよう、配信用コピーにだけ本実装と同じ viewport メタを足す。
  const html = await readFile(PROTO_SRC, 'utf8');
  await writeFile(join(dir, 'Main.dc.html'), injectViewportMeta(html));
  await copyFile(runtime, join(dir, 'support.js'));
  await copyFile(PROTO_ICON, join(dir, 'app-icon.svg')).catch(() => {});
  const srv = await serveDir(dir);
  return {
    name: 'prototype',
    url: `${srv.url}/Main.dc.html`,
    ready: '.nav .nbar',
    storage: protoStorage,
    close: () => srv.close(),
  };
}

async function waitHttp(url: string, timeoutMs: number, child?: ChildProcess): Promise<void> {
  const until = Date.now() + timeoutMs;
  let exited = false;
  child?.once('exit', () => (exited = true));
  while (Date.now() < until) {
    if (exited) throw new Error('dev サーバーが終了しました');
    try {
      const r = await fetch(url);
      if (r.status < 500) return;
    } catch {
      /* まだ起動していない */
    }
    await new Promise((ok) => setTimeout(ok, 400));
  }
  throw new Error(`${url} が ${Math.round(timeoutMs / 1000)} 秒以内に応答しませんでした`);
}

/**
 * 本実装。url を渡せばそれを使い、なければ `npm run dev -- --host 127.0.0.1 --port 4174 --strictPort` を起動する。
 */
export async function appTarget(url?: string): Promise<Target> {
  const base = {
    name: 'app' as const,
    ready: '.nav .nbar',
    storage: appStorage,
  };
  if (url) return { ...base, url, close: async () => {} };
  const port = 4174;
  const devUrl = `http://127.0.0.1:${port}/`;
  // 既に何かが 4174 番で応答しているなら、それが本実装とは限らないので撮らない（--url で明示してもらう）
  const busy = await fetch(devUrl).then(
    () => true,
    () => false,
  );
  if (busy) throw new Error(`ポート ${port} は既に使われています。起動済みの本実装を使うなら --url ${devUrl} を付けてください`);
  const child = spawn('npm', ['run', 'dev', '--', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], {
    cwd: ROOT,
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: process.platform !== 'win32',
    env: { ...process.env, BROWSER: 'none' },
  });
  let log = '';
  child.stdout?.on('data', (d) => (log += String(d)));
  child.stderr?.on('data', (d) => (log += String(d)));
  const kill = async (): Promise<void> => {
    if (child.exitCode !== null) return;
    try {
      if (child.pid && process.platform !== 'win32') process.kill(-child.pid, 'SIGTERM');
      else child.kill('SIGTERM');
    } catch {
      /* 既に終了 */
    }
  };
  try {
    await waitHttp(devUrl, 60000, child);
  } catch (e) {
    await kill();
    throw new Error(`本実装の dev サーバーを起動できません: ${(e as Error).message}\n${log.split('\n').slice(-15).join('\n')}`);
  }
  return { ...base, url: devUrl, close: kill };
}
