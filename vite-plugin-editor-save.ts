import type { Plugin } from 'vite';
import fs from 'node:fs';
import path from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';

function resolveAndValidate(publicDir: string, filePath: string): string | null {
  if (!filePath || path.isAbsolute(filePath) || filePath.includes('\0')) return null;
  const resolved = path.resolve(publicDir, filePath);
  if (!resolved.startsWith(path.resolve(publicDir) + path.sep)) return null;
  if (!resolved.endsWith('.json')) return null;
  return resolved;
}

function resolveAndValidatePath(publicDir: string, filePath: string): string | null {
  if (!filePath || path.isAbsolute(filePath) || filePath.includes('\0')) return null;
  const resolved = path.resolve(publicDir, filePath);
  if (!resolved.startsWith(path.resolve(publicDir) + path.sep)) return null;
  return resolved;
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk: Buffer) => { body += chunk.toString(); });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

function json(res: ServerResponse, status: number, data: object): void {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

export function editorSavePlugin(): Plugin {
  let publicDir: string;

  return {
    name: 'editor-save',
    apply: 'serve',

    configResolved(config) {
      publicDir = path.resolve(config.root, config.publicDir || 'public');
    },

    configureServer(server) {
      server.middlewares.use(async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
        if (!req.url?.startsWith('/__editor-api/')) return next();

        const url = new URL(req.url, 'http://localhost');
        const route = url.pathname.replace('/__editor-api/', '');

        // POST /save — write a JSON file to public/
        if (route === 'save' && req.method === 'POST') {
          try {
            const raw = await readBody(req);
            const { filePath, content } = JSON.parse(raw);

            if (typeof filePath !== 'string' || typeof content !== 'string') {
              return json(res, 400, { ok: false, error: 'filePath and content are required strings' });
            }

            const resolved = resolveAndValidate(publicDir, filePath);
            if (!resolved) {
              return json(res, 400, { ok: false, error: 'Invalid file path' });
            }

            fs.mkdirSync(path.dirname(resolved), { recursive: true });
            fs.writeFileSync(resolved, content, 'utf-8');
            return json(res, 200, { ok: true, path: filePath });
          } catch (err) {
            return json(res, 500, { ok: false, error: String(err) });
          }
        }

        // GET /list?dir=levels — list .json files in a public/ subdirectory
        if (route === 'list' && req.method === 'GET') {
          const dir = url.searchParams.get('dir') || '';
          const resolved = resolveAndValidate(publicDir, dir + '/_.json');
          if (!resolved) {
            return json(res, 400, { ok: false, error: 'Invalid directory' });
          }
          const dirPath = path.dirname(resolved);
          try {
            const entries = fs.existsSync(dirPath)
              ? fs.readdirSync(dirPath).filter(f => f.endsWith('.json'))
              : [];
            return json(res, 200, { ok: true, files: entries });
          } catch (err) {
            return json(res, 500, { ok: false, error: String(err) });
          }
        }

        // POST /rename — rename a file within public/
        if (route === 'rename' && req.method === 'POST') {
          try {
            const raw = await readBody(req);
            const { oldPath, newPath } = JSON.parse(raw);

            if (typeof oldPath !== 'string' || typeof newPath !== 'string') {
              return json(res, 400, { ok: false, error: 'oldPath and newPath are required strings' });
            }

            const resolvedOld = resolveAndValidatePath(publicDir, oldPath);
            const resolvedNew = resolveAndValidatePath(publicDir, newPath);
            if (!resolvedOld || !resolvedNew) {
              return json(res, 400, { ok: false, error: 'Invalid file path' });
            }

            if (!fs.existsSync(resolvedOld)) {
              return json(res, 404, { ok: false, error: 'Source file not found' });
            }
            if (fs.existsSync(resolvedNew)) {
              return json(res, 409, { ok: false, error: 'Target file already exists' });
            }

            fs.mkdirSync(path.dirname(resolvedNew), { recursive: true });
            fs.renameSync(resolvedOld, resolvedNew);
            return json(res, 200, { ok: true, oldPath, newPath });
          } catch (err) {
            return json(res, 500, { ok: false, error: String(err) });
          }
        }

        return json(res, 404, { ok: false, error: 'Unknown endpoint' });
      });
    },
  };
}
