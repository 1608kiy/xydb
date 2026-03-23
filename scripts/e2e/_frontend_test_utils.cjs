const fs = require('fs');
const http = require('http');
const path = require('path');
const { URL } = require('url');

function requirePlaywright() {
  try {
    return require('playwright');
  } catch (err) {
    const msg = [
      '未检测到 playwright 依赖。',
      '请先执行：',
      '  cd scripts/e2e',
      '  ..\\..\\tools\\node\\npm.cmd install',
      '  ..\\..\\tools\\node\\npx.cmd playwright install chromium'
    ].join('\n');
    throw new Error(msg);
  }
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
  return dirPath;
}

function ts() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `${yyyy}${mm}${dd}_${hh}${mi}${ss}`;
}

function mimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.html') return 'text/html; charset=utf-8';
  if (ext === '.css') return 'text/css; charset=utf-8';
  if (ext === '.js') return 'application/javascript; charset=utf-8';
  if (ext === '.json') return 'application/json; charset=utf-8';
  if (ext === '.svg') return 'image/svg+xml';
  if (ext === '.png') return 'image/png';
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.gif') return 'image/gif';
  if (ext === '.ico') return 'image/x-icon';
  if (ext === '.webp') return 'image/webp';
  return 'application/octet-stream';
}

function startStaticServer(rootDir, preferredPort) {
  const root = path.resolve(rootDir);
  const port = preferredPort || 4173;

  const server = http.createServer((req, res) => {
    try {
      const reqUrl = new URL(req.url, `http://127.0.0.1:${port}`);
      let reqPath = decodeURIComponent(reqUrl.pathname || '/');
      if (reqPath === '/') reqPath = '/frontend/待办页面.html';
      const safeRel = reqPath.replace(/^\/+/, '');
      const filePath = path.resolve(root, safeRel);
      if (!filePath.startsWith(root)) {
        res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Forbidden');
        return;
      }
      if (!fs.existsSync(filePath)) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Not Found');
        return;
      }
      const stat = fs.statSync(filePath);
      if (stat.isDirectory()) {
        res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Directory listing disabled');
        return;
      }
      const headers = {
        'Content-Type': mimeType(filePath),
        'Cache-Control': 'no-store'
      };
      res.writeHead(200, headers);
      fs.createReadStream(filePath).pipe(res);
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Server error: ' + String(err && err.message ? err.message : err));
    }
  });

  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => {
      resolve({
        baseUrl: `http://127.0.0.1:${port}`,
        close: () => new Promise((done) => server.close(() => done()))
      });
    });
  });
}

function parseMaybeJson(text) {
  if (!text || typeof text !== 'string') return {};
  try {
    return JSON.parse(text);
  } catch (_) {
    return {};
  }
}

function parseTags(raw) {
  if (Array.isArray(raw)) return raw.map(String).map((v) => v.trim()).filter(Boolean);
  if (typeof raw === 'string') {
    const s = raw.trim();
    if (!s) return [];
    try {
      const parsed = JSON.parse(s);
      if (Array.isArray(parsed)) return parsed.map(String).map((v) => v.trim()).filter(Boolean);
    } catch (_) {}
    return s.split(/[;,|]/).map((v) => v.trim()).filter(Boolean);
  }
  if (raw == null) return [];
  return [String(raw)];
}

function createMockState() {
  const now = new Date();
  const todayDue = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 14, 0, 0).toISOString();
  const tomorrowDue = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 10, 30, 0).toISOString();
  return {
    nextId: 3000,
    tasks: [
      {
        id: '2001',
        title: 'E2E 初始任务',
        description: '用于交互脚本验证',
        priority: 'medium',
        status: 'pending',
        tags: JSON.stringify(['work']),
        dueAt: todayDue,
        subtasks: [{ title: '检查详情弹层', completed: false }],
        createdAt: now.toISOString(),
        updatedAt: now.toISOString()
      },
      {
        id: '2002',
        title: 'E2E 明日任务',
        description: '用于日历页面验证',
        priority: 'low',
        status: 'pending',
        tags: JSON.stringify(['study']),
        dueAt: tomorrowDue,
        subtasks: [],
        createdAt: now.toISOString(),
        updatedAt: now.toISOString()
      }
    ]
  };
}

function okPayload(data) {
  return {
    code: 200,
    message: 'success',
    data: data == null ? {} : data
  };
}

async function fulfillJson(route, data, statusCode) {
  await route.fulfill({
    status: statusCode || 200,
    contentType: 'application/json; charset=utf-8',
    body: JSON.stringify(data)
  });
}

async function handleApiRoute(route, state) {
  const req = route.request();
  const method = req.method().toUpperCase();
  const urlObj = new URL(req.url());
  const pathname = urlObj.pathname;
  const body = parseMaybeJson(req.postData());

  if (pathname === '/api/me' && method === 'GET') {
    await fulfillJson(route, okPayload({ id: 'e2e-user', username: 'codex-e2e' }));
    return;
  }

  if (pathname === '/api/tasks' && method === 'GET') {
    await fulfillJson(route, okPayload(state.tasks));
    return;
  }

  if (pathname === '/api/tasks' && method === 'POST') {
    const id = String(state.nextId++);
    const task = {
      id,
      title: body.title || '未命名任务',
      description: body.description || '',
      priority: body.priority || 'medium',
      status: body.status || 'pending',
      tags: typeof body.tags === 'string' ? body.tags : JSON.stringify(parseTags(body.tags)),
      dueAt: body.dueAt || null,
      subtasks: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    state.tasks.unshift(task);
    await fulfillJson(route, okPayload(task), 201);
    return;
  }

  const subtaskMatch = pathname.match(/^\/api\/tasks\/([^/]+)\/subtasks$/);
  if (subtaskMatch && method === 'PUT') {
    const taskId = String(subtaskMatch[1]);
    const task = state.tasks.find((t) => String(t.id) === taskId);
    const incoming = Array.isArray(body) ? body : [];
    if (task) {
      task.subtasks = incoming.map((s) => ({
        title: String((s && (s.title || s.text || s.name)) || '').trim(),
        completed: !!(s && s.completed)
      })).filter((s) => !!s.title);
      task.updatedAt = new Date().toISOString();
    }
    await fulfillJson(route, okPayload(task || {}));
    return;
  }

  const taskMatch = pathname.match(/^\/api\/tasks\/([^/]+)$/);
  if (taskMatch && method === 'PUT') {
    const taskId = String(taskMatch[1]);
    const task = state.tasks.find((t) => String(t.id) === taskId);
    if (task) {
      Object.assign(task, {
        title: body.title != null ? body.title : task.title,
        description: body.description != null ? body.description : task.description,
        priority: body.priority != null ? body.priority : task.priority,
        status: body.status != null ? body.status : task.status,
        dueAt: body.dueAt !== undefined ? body.dueAt : task.dueAt,
        tags: body.tags !== undefined
          ? (typeof body.tags === 'string' ? body.tags : JSON.stringify(parseTags(body.tags)))
          : task.tags,
        updatedAt: new Date().toISOString()
      });
    }
    await fulfillJson(route, okPayload(task || {}));
    return;
  }

  if (taskMatch && method === 'DELETE') {
    const taskId = String(taskMatch[1]);
    state.tasks = state.tasks.filter((t) => String(t.id) !== taskId);
    await fulfillJson(route, okPayload(true));
    return;
  }

  if (pathname.startsWith('/api/')) {
    const fallback = method === 'GET' ? [] : {};
    await fulfillJson(route, okPayload(fallback));
    return;
  }

  await route.continue();
}

async function createBrowserContext(baseUrl) {
  const { chromium } = requirePlaywright();
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
  } catch (err) {
    browser = await chromium.launch({ channel: 'msedge', headless: true });
  }
  const context = await browser.newContext({
    baseURL: baseUrl,
    viewport: { width: 1440, height: 900 },
    locale: 'zh-CN'
  });
  await context.addInitScript(() => {
    try {
      localStorage.setItem('token', 'dev-e2e-token');
      localStorage.setItem('devSkipAuth', '1');
      localStorage.setItem('apiBase', window.location.origin);
    } catch (_) {}
  });
  return { browser, context };
}

module.exports = {
  createBrowserContext,
  createMockState,
  ensureDir,
  handleApiRoute,
  requirePlaywright,
  startStaticServer,
  ts
};
