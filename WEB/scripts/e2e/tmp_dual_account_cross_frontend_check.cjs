const fs = require('fs');
const http = require('http');
const path = require('path');
const { chromium } = require('playwright');

const BACKEND_ORIGIN = process.env.BACKEND_ORIGIN || 'http://47.108.170.112';
const WEB_PORT = Number(process.env.WEB_PORT || 4181);
const SOFTWARE_PORT = Number(process.env.SOFTWARE_PORT || 4182);

function ts() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
  return dir;
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
  if (ext === '.webp') return 'image/webp';
  if (ext === '.ico') return 'image/x-icon';
  return 'application/octet-stream';
}

function startServer(frontendRoot, repoRoot, port, defaultPage) {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      try {
        let reqPath = decodeURIComponent((req.url || '/').split('?')[0]);
        if (reqPath === '/' || reqPath === '') reqPath = `/${defaultPage}`;

        let filePath;
        if (reqPath.startsWith('/SHARE/')) {
          filePath = path.resolve(repoRoot, reqPath.slice(1));
        } else {
          filePath = path.resolve(frontendRoot, reqPath.slice(1));
        }

        if (!filePath.startsWith(frontendRoot) && !filePath.startsWith(path.resolve(repoRoot, 'SHARE'))) {
          res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
          res.end('Forbidden');
          return;
        }

        if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
          res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
          res.end('Not Found');
          return;
        }

        res.writeHead(200, {
          'Content-Type': mimeType(filePath),
          'Cache-Control': 'no-store'
        });
        fs.createReadStream(filePath).pipe(res);
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end(String(err && err.message ? err.message : err));
      }
    });

    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => {
      resolve({
        baseUrl: `http://127.0.0.1:${port}`,
        close: () => new Promise((done) => server.close(() => done()))
      });
    });
  });
}

async function postJson(url, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body || {}) });
  let data = null;
  try { data = await res.json(); } catch (_) {}
  return { ok: res.ok, status: res.status, body: data };
}

async function getJson(url, token) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(url, { method: 'GET', headers });
  let data = null;
  try { data = await res.json(); } catch (_) {}
  return { ok: res.ok, status: res.status, body: data };
}

async function ensureUser(phone, password) {
  const email = `${phone}@mobile.local`;
  await postJson(`${BACKEND_ORIGIN}/api/auth/register`, {
    nickname: `cross-${phone.slice(-4)}`,
    email,
    phone,
    password
  });
  const login = await postJson(`${BACKEND_ORIGIN}/api/auth/login`, { email, password });
  if (!login.ok || !login.body || login.body.code !== 200 || !login.body.data || !login.body.data.token) {
    throw new Error(`ensureUser login failed: ${email}`);
  }
  return { phone, email, token: login.body.data.token };
}

async function createTask(token, title) {
  const resp = await postJson(`${BACKEND_ORIGIN}/api/tasks`, {
    title,
    description: 'dual account cross frontend check',
    priority: 'medium',
    status: 'pending',
    tags: '["work"]'
  }, token);
  if (!resp.ok) {
    throw new Error(`createTask failed: ${resp.status}`);
  }
}

async function listTaskTitles(token) {
  const resp = await getJson(`${BACKEND_ORIGIN}/api/tasks`, token);
  if (!resp.ok) return [];
  const data = resp.body && resp.body.data;
  const list = Array.isArray(data) ? data : (Array.isArray(data && data.list) ? data.list : []);
  return list.map((t) => String((t && t.title) || '')).filter(Boolean);
}

async function fillFirst(page, selectors, value) {
  for (const sel of selectors) {
    const node = page.locator(sel).first();
    if (await node.count()) {
      await node.fill(value);
      return true;
    }
  }
  return false;
}

async function clickFirst(page, selectors) {
  for (const sel of selectors) {
    const node = page.locator(sel).first();
    if (await node.count()) {
      await node.click();
      return true;
    }
  }
  return false;
}

async function loginUi(page, baseUrl, loginPath, account, password, todoPath) {
  await page.goto(`${baseUrl}${loginPath}`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForTimeout(800);

  const accountOk = await fillFirst(page, ['#login-account', '#email', 'input[type="text"]'], account);
  const passOk = await fillFirst(page, ['#login-password', '#password', 'input[type="password"]'], password);
  if (!accountOk || !passOk) {
    throw new Error('login form input not found');
  }

  const clicked = await clickFirst(page, ['#btn-login', '#login-form button[type="submit"]', 'button[type="submit"]']);
  if (!clicked) throw new Error('login submit button not found');

  await page.waitForFunction((p) => {
    const href = String(window.location.href || '');
    let hasToken = false;
    try {
      hasToken = !!(localStorage.getItem('token') || sessionStorage.getItem('token'));
    } catch (_) {}
    return hasToken || href.includes(p) || href.includes('待办页面.html') || href.includes('后台管理页面.html');
  }, todoPath, { timeout: 30000 });

  await page.goto(`${baseUrl}${todoPath}`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForTimeout(2000);
}

async function createContext(browser) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'zh-CN' });
  await context.addInitScript((apiBase) => {
    try {
      localStorage.setItem('apiBase', apiBase);
      localStorage.setItem('backendBaseUrl', apiBase);
      localStorage.setItem('API_BASE_URL', apiBase);
      window.__API_BASE__ = apiBase;
    } catch (_) {}
  }, BACKEND_ORIGIN);
  return context;
}

async function pageHasText(page, text) {
  return await page.evaluate((v) => {
    const bodyText = (document.body && document.body.innerText) || '';
    return bodyText.includes(v);
  }, text);
}

function toMd(resultPath, result) {
  const lines = [];
  const accA = (result.accounts && result.accounts[0]) || { phone: 'N/A', email: 'N/A' };
  const accB = (result.accounts && result.accounts[1]) || { phone: 'N/A', email: 'N/A' };
  lines.push('# 双账号跨前端同步核验报告');
  lines.push('');
  lines.push(`- Started At: ${result.startedAt}`);
  lines.push(`- Finished At: ${result.finishedAt || ''}`);
  lines.push(`- Backend: ${result.backendOrigin}`);
  lines.push(`- WEB Frontend: ${result.webBaseUrl}`);
  lines.push(`- Software Frontend: ${result.softwareBaseUrl}`);
  lines.push(`- Overall: ${result.pass ? 'PASS' : 'FAIL'}`);
  lines.push('');
  lines.push('## Accounts');
  lines.push(`- Account A: ${accA.phone} / ${accA.email}`);
  lines.push(`- Account B: ${accB.phone} / ${accB.email}`);
  lines.push('');
  lines.push('## Checks');
  for (const c of result.checks) {
    lines.push(`- ${c.step}: ${c.pass ? 'PASS' : 'FAIL'}`);
  }
  lines.push('');
  lines.push('## Artifacts');
  lines.push(`- JSON: ${resultPath.replace(/\\/g, '/')}`);
  lines.push(`- Markdown: ${resultPath.replace(/\\/g, '/').replace(/result\.json$/, 'result.md')}`);
  return lines.join('\n');
}

async function run() {
  const repoRoot = path.resolve(__dirname, '..', '..', '..');
  const webRoot = path.join(repoRoot, 'WEB', 'frontend');
  const softwareRoot = path.join(repoRoot, 'SFOTWARE', 'frontend');
  const reportDir = ensureDir(path.join(repoRoot, 'WEB', 'REPORTS', 'e2e', `dual_account_cross_frontend_${ts()}`));
  const resultPath = path.join(reportDir, 'result.json');
  const mdPath = path.join(reportDir, 'result.md');

  const now = Date.now();
  const phoneA = '139' + String(now).slice(-8);
  const phoneB = '138' + String(now + 17).slice(-8);
  const pwdA = 'Qy_dual_A1!';
  const pwdB = 'Qy_dual_B1!';

  const result = {
    startedAt: new Date().toISOString(),
    backendOrigin: BACKEND_ORIGIN,
    webBaseUrl: `http://127.0.0.1:${WEB_PORT}`,
    softwareBaseUrl: `http://127.0.0.1:${SOFTWARE_PORT}`,
    pass: false,
    accounts: [],
    checks: []
  };

  let webServer;
  let softwareServer;
  let browser;
  try {
    const accountA = await ensureUser(phoneA, pwdA);
    const accountB = await ensureUser(phoneB, pwdB);
    result.accounts = [
      { index: 1, email: accountA.email, phone: accountA.phone },
      { index: 2, email: accountB.email, phone: accountB.phone }
    ];

    const webTaskA = `A_TASK_${Date.now()}`;
    const softTaskB = `B_TASK_${Date.now() + 1}`;

    await createTask(accountA.token, webTaskA);

    webServer = await startServer(webRoot, repoRoot, WEB_PORT, '登录2.html');
    softwareServer = await startServer(softwareRoot, repoRoot, SOFTWARE_PORT, '登录页面.html');
    browser = await chromium.launch({ headless: true });

    // 1) WEB 登录 A，查看 A 任务
    {
      const context = await createContext(browser);
      const page = await context.newPage();
      await loginUi(page, webServer.baseUrl, '/登录2.html', accountA.email, pwdA, '/待办页面.html');
      const titlesA = await listTaskTitles(accountA.token);
      const webAHasTask = titlesA.includes(webTaskA);
      const webAVisible = await pageHasText(page, webTaskA);
      result.checks.push({ step: 'web_account_a_create_and_view', pass: webAHasTask && webAVisible, detail: { webAHasTask, webAVisible, webTaskA } });
      await page.screenshot({ path: path.join(reportDir, 'web_a_todo.png'), fullPage: true });
      await context.close();
    }

    // 2) 软件端登录 A，检查同步可见
    {
      const context = await createContext(browser);
      const page = await context.newPage();
      await loginUi(page, softwareServer.baseUrl, '/登录页面.html', accountA.email, pwdA, '/待办页面.html');
      const titlesA = await listTaskTitles(accountA.token);
      const softAHasTask = titlesA.includes(webTaskA);
      const softAVisible = await pageHasText(page, webTaskA);
      result.checks.push({ step: 'software_account_a_sync_view', pass: softAHasTask && softAVisible, detail: { softAHasTask, softAVisible, webTaskA } });
      await page.screenshot({ path: path.join(reportDir, 'software_a_todo.png'), fullPage: true });
      await context.close();
    }

    // 3) 软件端登录 B，检查隔离并创建 B 任务
    {
      await createTask(accountB.token, softTaskB);
      const context = await createContext(browser);
      const page = await context.newPage();
      await loginUi(page, softwareServer.baseUrl, '/登录页面.html', accountB.email, pwdB, '/待办页面.html');
      const titlesB = await listTaskTitles(accountB.token);
      const softBSeesA = titlesB.includes(webTaskA);
      const softBAbsentA = !softBSeesA;
      const softBHasOwn = titlesB.includes(softTaskB);
      const softBVisibleOwn = await pageHasText(page, softTaskB);
      result.checks.push({
        step: 'software_account_b_isolation_and_create',
        pass: softBAbsentA && softBHasOwn && softBVisibleOwn,
        detail: { softBSeesA, softBAbsentA, softBHasOwn, softBVisibleOwn, softTaskB }
      });
      await page.screenshot({ path: path.join(reportDir, 'software_b_todo.png'), fullPage: true });
      await context.close();
    }

    // 4) WEB 登录 B，检查 B 可见且 A 隔离
    {
      const context = await createContext(browser);
      const page = await context.newPage();
      await loginUi(page, webServer.baseUrl, '/登录2.html', accountB.email, pwdB, '/待办页面.html');
      const titlesB = await listTaskTitles(accountB.token);
      const webBHasOwn = titlesB.includes(softTaskB);
      const webBAbsentA = !titlesB.includes(webTaskA);
      const webBVisibleOwn = await pageHasText(page, softTaskB);
      const webBVisibleA = await pageHasText(page, webTaskA);
      result.checks.push({
        step: 'web_account_b_sync_view',
        pass: webBHasOwn && webBAbsentA && webBVisibleOwn,
        detail: { webBHasOwn, webBAbsentA, webBVisibleOwn, webBVisibleA, softTaskB, webTaskA }
      });
      await page.screenshot({ path: path.join(reportDir, 'web_b_todo.png'), fullPage: true });
      await context.close();
    }

    result.pass = result.checks.every((c) => c.pass);
  } catch (err) {
    result.error = String(err && err.stack ? err.stack : err);
  } finally {
    result.finishedAt = new Date().toISOString();
    fs.writeFileSync(resultPath, JSON.stringify(result, null, 2), 'utf8');
    fs.writeFileSync(mdPath, toMd(resultPath, result), 'utf8');
    if (browser) await browser.close().catch(() => {});
    if (webServer) await webServer.close().catch(() => {});
    if (softwareServer) await softwareServer.close().catch(() => {});
  }

  console.log(result.pass ? 'DUAL_ACCOUNT_CROSS_FRONTEND_PASS' : 'DUAL_ACCOUNT_CROSS_FRONTEND_FAIL');
  console.log(`REPORT_JSON=${resultPath}`);
  console.log(`REPORT_MD=${mdPath}`);
  if (!result.pass) process.exit(1);
}

run().catch((err) => {
  console.error(err && err.stack ? err.stack : err);
  process.exit(1);
});
