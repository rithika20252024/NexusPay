import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

export function serveStatic(req: http.IncomingMessage, res: http.ServerResponse, distDir: string): boolean {
  if (req.method !== 'GET') return false;

  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  let filePath = path.join(distDir, url.pathname);

  // If path is a directory or root, serve index.html
  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, 'index.html');
  }

  // SPA fallback
  if (!fs.existsSync(filePath)) {
    filePath = path.join(distDir, 'index.html');
  }

  if (!fs.existsSync(filePath)) {
    return false;
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  res.writeHead(200, {
    'Content-Type': contentType,
    'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=31536000'
  });

  fs.createReadStream(filePath).pipe(res);
  return true;
}
