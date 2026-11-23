// 静的ファイル配信（依存なし）。プロトタイプ（Main.dc.html + support.js）を配るためだけに使う。
import { createServer, type Server } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve, sep } from 'node:path';

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.woff2': 'font/woff2',
};

export interface StaticServer {
  url: string;
  close(): Promise<void>;
}

export async function serveDir(dir: string, port = 0): Promise<StaticServer> {
  const root = resolve(dir);
  const server: Server = createServer(async (req, res) => {
    try {
      const path = decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname);
      let file = normalize(join(root, path));
      if (file !== root && !file.startsWith(root + sep)) {
        res.writeHead(403).end();
        return;
      }
      const st = await stat(file).catch(() => null);
      if (st?.isDirectory()) file = join(file, 'index.html');
      const body = await readFile(file);
      res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream', 'cache-control': 'no-store' });
      res.end(body);
    } catch {
      res.writeHead(404).end('not found');
    }
  });
  await new Promise<void>((ok) => server.listen(port, '127.0.0.1', ok));
  const addr = server.address();
  const p = typeof addr === 'object' && addr ? addr.port : port;
  return {
    url: `http://127.0.0.1:${p}`,
    close: () => new Promise<void>((ok) => server.close(() => ok())),
  };
}
