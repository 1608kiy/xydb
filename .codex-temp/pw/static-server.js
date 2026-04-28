const http = require('http');
const fs = require('fs');
const path = require('path');

const root = process.argv[2] ? path.resolve(process.argv[2]) : process.cwd();
const port = Number(process.argv[3] || 4173);

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2'
};

function send(res, status, body, type) {
  res.writeHead(status, {
    'Content-Type': type || 'text/plain; charset=utf-8',
    'Cache-Control': 'no-store'
  });
  res.end(body);
}

http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  let pathname = decodeURIComponent(url.pathname);
  if (pathname === '/') pathname = '/数据周报页面.html';
  const target = path.normalize(path.join(root, pathname));
  if (!target.startsWith(root)) {
    send(res, 403, 'Forbidden');
    return;
  }

  fs.stat(target, (err, stat) => {
    if (err) {
      send(res, 404, 'Not found');
      return;
    }

    let filePath = target;
    if (stat.isDirectory()) filePath = path.join(target, 'index.html');

    fs.readFile(filePath, (readErr, data) => {
      if (readErr) {
        send(res, 404, 'Not found');
        return;
      }
      const ext = path.extname(filePath).toLowerCase();
      send(res, 200, data, mimeTypes[ext] || 'application/octet-stream');
    });
  });
}).listen(port, '127.0.0.1', () => {
  console.log(`static-server listening on http://127.0.0.1:${port}`);
});
