const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE_URL = process.env.BASE_URL || 'http://47.108.170.112';

function ts() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

async function postJson(url, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  let json = null;
  try { json = await res.json(); } catch (e) {}
  return { status: res.status, body: json };
}

async function ensureMobileUser(phone, password) {
  const email = `${phone}@mobile.local`;
  await postJson(`${BASE_URL}/api/auth/register`, {
    nickname: `回归${phone.slice(-4)}`,
    email,
    phone,
    password
  });
  const login = await postJson(`${BASE_URL}/api/auth/login`, { email, password });
  if (!(login && login.status === 200 && login.body && login.body.code === 200)) {
    throw new Error('mobile user login failed');
  }
}

async function uiLogin(page, account, password) {
  await page.goto(`${BASE_URL}/登录页面.html`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.fill('#login-account', account);
  await page.fill('#login-password', password);
  await page.click('#login-form button[type="submit"]');
  await page.waitForFunction(() => {
    const href = String(window.location.href || '');
    const decoded = (() => {
      try { return decodeURIComponent(href); } catch (e) { return href; }
    })();
    return decoded.includes('待办页面.html') || decoded.includes('后台管理页面.html');
  }, null, { timeout: 20000 });
}

async function goTodo(page) {
  await page.goto(`${BASE_URL}/待办页面.html`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(1000);
}

async function injectMarkerTask(page, marker) {
  return await page.evaluate((m) => {
    const ACTIVE_USER_KEY = 'ringnote_active_user_v1';
    const STORAGE_KEY_PREFIX = 'ringnote_app_state_v2::';
    const LEGACY_KEY = 'ringnote_app_state_v1';

    const active = localStorage.getItem(ACTIVE_USER_KEY) || 'guest';
    const bucketKey = STORAGE_KEY_PREFIX + active;

    const readBucket = (k) => {
      try {
        const raw = localStorage.getItem(k);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === 'object' ? parsed : null;
      } catch (e) {
        return null;
      }
    };

    const base = readBucket(bucketKey) || readBucket(LEGACY_KEY) || { user: {}, tasks: [], pomodoroSessions: [], checkins: [], settings: {}, labels: [] };
    const now = new Date().toISOString();
    const tasks = Array.isArray(base.tasks) ? base.tasks.slice() : [];
    const filtered = tasks.filter(t => !String((t && t.title) || '').includes('AB_ISO_'));
    filtered.push({
      id: 'ab_iso_' + Date.now(),
      title: m,
      description: 'A账号隔离测试任务',
      dueAt: null,
      status: 'pending',
      priority: 'medium',
      labels: ['工作'],
      estimate: 1,
      createdAt: now,
      subTasks: []
    });

    const payload = Object.assign({}, base, { tasks: filtered });
    localStorage.setItem(bucketKey, JSON.stringify(payload));
    localStorage.setItem(LEGACY_KEY, JSON.stringify(payload));
    localStorage.setItem(ACTIVE_USER_KEY, active);

    return {
      marker: m,
      userKey: active,
      bucketKey,
      taskCount: filtered.length
    };
  }, marker);
}

async function pageHasMarker(page, pageName, marker) {
  const url = `${BASE_URL}/${pageName}`;
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(1200);
  return await page.evaluate((m) => {
    const ACTIVE_USER_KEY = 'ringnote_active_user_v1';
    const STORAGE_KEY_PREFIX = 'ringnote_app_state_v2::';
    const LEGACY_KEY = 'ringnote_app_state_v1';

    let inBucket = false;
    let inLegacy = false;
    let currentUserKey = '';
    let bucketKey = '';
    try {
      currentUserKey = localStorage.getItem(ACTIVE_USER_KEY) || 'guest';
      bucketKey = STORAGE_KEY_PREFIX + currentUserKey;
      const bucketRaw = localStorage.getItem(bucketKey);
      const legacyRaw = localStorage.getItem(LEGACY_KEY);
      const bucket = bucketRaw ? JSON.parse(bucketRaw) : null;
      const legacy = legacyRaw ? JSON.parse(legacyRaw) : null;
      const bucketTasks = (bucket && Array.isArray(bucket.tasks)) ? bucket.tasks : [];
      const legacyTasks = (legacy && Array.isArray(legacy.tasks)) ? legacy.tasks : [];
      inBucket = bucketTasks.some(t => String((t && t.title) || '').includes(m));
      inLegacy = legacyTasks.some(t => String((t && t.title) || '').includes(m));
    } catch (e) {}
    const text = (document.body && document.body.innerText) ? document.body.innerText : '';
    const inDom = text.includes(m);
    return { inBucket, inLegacy, inDom, currentUserKey, bucketKey };
  }, marker);
}

async function doLogout(page) {
  await page.evaluate(() => {
    if (typeof window.performUnifiedLogoutFlow === 'function') {
      window.performUnifiedLogoutFlow();
      return;
    }
    if (window.AppState && typeof window.AppState.logout === 'function') {
      window.AppState.logout();
    }
    window.location.href = '登录页面.html';
  });
  await page.waitForFunction(() => {
    const href = String(window.location.href || '');
    const decoded = (() => {
      try { return decodeURIComponent(href); } catch (e) { return href; }
    })();
    return decoded.includes('登录页面.html');
  }, null, { timeout: 15000 });
}

(async () => {
  const root = path.resolve(__dirname, '..', '..');
  const reportDir = ensureDir(path.join(root, 'REPORTS', 'e2e', `ab_isolation_${ts()}`));
  const resultPath = path.join(reportDir, 'result.json');

  const marker = `AB_ISO_${Date.now()}`;
  const phoneB = '139' + String(Date.now()).slice(-8);
  const pwdB = 'Qy_abIso_A1!';
  const result = {
    startedAt: new Date().toISOString(),
    baseUrl: BASE_URL,
    marker,
    accountA: 'admin',
    accountB: phoneB,
    checks: [],
    pass: false
  };

  let browser;
  try {
    await ensureMobileUser(phoneB, pwdB);
    result.checks.push({ step: 'prepare_account_b', pass: true, detail: `${phoneB}@mobile.local` });

    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
    const page = await context.newPage();

    await uiLogin(page, 'admin', 'admin');
    await goTodo(page);
    const markerInfo = await injectMarkerTask(page, marker);
    result.checks.push({ step: 'inject_marker_for_A', pass: true, detail: markerInfo });

    const pages = ['日历页面.html', '数据周报页面.html', '番茄钟页面.html'];
    for (const p of pages) {
      const snap = await pageHasMarker(page, p, marker);
      const ok = snap.inBucket === true || snap.inLegacy === true;
      result.checks.push({ step: `A_${p}`, pass: ok, detail: snap });
    }

    await doLogout(page);
    await uiLogin(page, phoneB, pwdB);

    for (const p of pages) {
      const snap = await pageHasMarker(page, p, marker);
      const ok = snap.inBucket === false && snap.inLegacy === false && snap.inDom === false;
      result.checks.push({ step: `B_${p}`, pass: ok, detail: snap });
    }

    result.pass = result.checks.every(c => c.pass);
    await page.screenshot({ path: path.join(reportDir, 'final.png'), fullPage: true });
  } catch (e) {
    result.error = String(e && e.stack ? e.stack : e);
  } finally {
    if (browser) await browser.close();
    result.finishedAt = new Date().toISOString();
    fs.writeFileSync(resultPath, JSON.stringify(result, null, 2), 'utf8');
    if (result.pass) {
      console.log('AB_ISOLATION_PASS');
    } else {
      console.log('AB_ISOLATION_FAIL');
    }
    console.log(resultPath);
    console.log(JSON.stringify(result, null, 2));
    process.exit(result.pass ? 0 : 1);
  }
})();
