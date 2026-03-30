const fs = require('fs');
const http = require('http');
const path = require('path');
const { chromium } = require('playwright');
const { ensureDir, ts } = require('./_frontend_test_utils.cjs');

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
  return 'application/octet-stream';
}

function startProxyStaticServer(rootDir, port, backendPort) {
  const root = path.resolve(rootDir);
  const server = http.createServer((req, res) => {
    const reqPath = decodeURIComponent((req.url || '/').split('?')[0]);

    if (reqPath.startsWith('/api/')) {
      const proxyReq = http.request({
        hostname: '127.0.0.1',
        port: backendPort,
        path: req.url,
        method: req.method,
        headers: req.headers
      }, (proxyRes) => {
        res.writeHead(proxyRes.statusCode || 500, proxyRes.headers);
        proxyRes.pipe(res);
      });
      proxyReq.on('error', (err) => {
        res.writeHead(502, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ code: 502, message: 'proxy error: ' + err.message, data: null }));
      });
      req.pipe(proxyReq);
      return;
    }

    let pagePath = reqPath;
    if (pagePath === '/') pagePath = '/frontend/待办页面.html';
    const filePath = path.resolve(root, pagePath.replace(/^\/+/, ''));
    if (!filePath.startsWith(root) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not Found');
      return;
    }

    res.writeHead(200, {
      'Content-Type': mimeType(filePath),
      'Cache-Control': 'no-store'
    });
    fs.createReadStream(filePath).pipe(res);
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

async function postJson(url, payload, headers) {
  const res = await fetch(url, {
    method: 'POST',
    headers: Object.assign({ 'Content-Type': 'application/json' }, headers || {}),
    body: JSON.stringify(payload)
  });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

async function getJson(url, token) {
  const res = await fetch(url, {
    method: 'GET',
    headers: token ? { Authorization: 'Bearer ' + token } : {}
  });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

async function loginAndGetToken(apiBase, email, password) {
  const login = await postJson(apiBase + '/api/auth/login', { email, password });
  if (!(login.status === 200 && login.body && login.body.code === 200)) {
    throw new Error('login failed for ' + email + ': ' + JSON.stringify(login.body));
  }
  const token = login.body && login.body.data && login.body.data.token;
  if (!token) throw new Error('missing token for ' + email);
  return token;
}

async function run() {
  const root = path.resolve(__dirname, '..', '..');
  const backendBase = 'http://127.0.0.1:8082';
  const reportDir = ensureDir(path.join(root, 'REPORTS', 'e2e', 'admin_link_smoke_' + ts()));
  const screenshotPath = path.join(reportDir, 'admin_console.png');
  const summaryPath = path.join(reportDir, 'summary.json');

  const result = {
    startedAt: new Date().toISOString(),
    backendBase,
    pass: false,
    checks: {}
  };

  const server = await startProxyStaticServer(root, 4175, 8082);
  let browser;
  try {
    const adminToken = await loginAndGetToken(backendBase, 'admin', 'admin');

    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      baseURL: server.baseUrl,
      viewport: { width: 1440, height: 900 },
      locale: 'zh-CN'
    });

    await context.addInitScript((token, apiBase) => {
      try {
        localStorage.setItem('token', token);
        localStorage.setItem('apiBase', apiBase);
        localStorage.removeItem('devSkipAuth');
      } catch (_) {}
    }, adminToken, server.baseUrl);

    const page = await context.newPage();
    const unique = Date.now();
    const newAdminEmail = 'ui_admin_' + unique + '@ringnote.local';
    const newAdminPassword = 'Admin#123456';

    await page.goto('/frontend/后台管理页面.html', { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForSelector('#new-admin-email', { timeout: 20000 });

    await page.fill('#new-admin-nickname', 'UI联动管理员');
    await page.fill('#new-admin-email', newAdminEmail);
    await page.fill('#new-admin-password', newAdminPassword);
    await page.fill('#new-admin-phone', '13800138006');

    const createRespPromise = page.waitForResponse((resp) => {
      return resp.url().includes('/api/admin/users/create-admin');
    }, { timeout: 15000 });
    await page.click('#create-admin-user');
    const createResp = await createRespPromise;
    const createRespUrl = createResp.url();
    const createRespText = await createResp.text().catch(() => '');
    let createJson = {};
    try {
      createJson = JSON.parse(createRespText || '{}');
    } catch (_) {
      createJson = {};
    }

    await page.waitForTimeout(2200);
    const pageText = await page.evaluate(() => (document.body && document.body.innerText) || '');
    const hasEmailInPage = pageText.includes(newAdminEmail);

    await page.screenshot({ path: screenshotPath, fullPage: true });

    if (!(createResp.status() === 200 && createJson && createJson.code === 200)) {
      throw new Error('ui create-admin failed: url=' + createRespUrl + ', status=' + createResp.status() + ', body=' + createRespText);
    }

    const subToken = await loginAndGetToken(backendBase, newAdminEmail, newAdminPassword);
    const me = await getJson(backendBase + '/api/me', subToken);
    const adminList = await getJson(backendBase + '/api/admin/users', subToken);

    result.checks = {
      createdAdminAppearsInPage: hasEmailInPage,
      subAdminCanLogin: subToken.length > 20,
      subAdminMeHasAdminFlag: !!(me.body && me.body.data && me.body.data.admin),
      subAdminCanAccessAdminList: adminList.status === 200 && adminList.body && adminList.body.code === 200
    };
    result.newAdminEmail = newAdminEmail;
    result.screenshot = screenshotPath;
    result.pass = Object.values(result.checks).every(Boolean);

    await context.close();
  } finally {
    if (browser) await browser.close();
    await server.close();
    result.finishedAt = new Date().toISOString();
    fs.writeFileSync(summaryPath, JSON.stringify(result, null, 2), 'utf8');
  }

  if (!result.pass) {
    console.error('管理员后台联动冒烟未通过，报告：' + summaryPath);
    process.exit(1);
  }

  console.log('管理员后台联动冒烟通过，报告：' + summaryPath);
}

run().catch((err) => {
  console.error(err && err.stack ? err.stack : err);
  process.exit(1);
});
