const fs = require('fs');
const path = require('path');
const {
  createBrowserContext,
  ensureDir,
  startStaticServer,
  ts
} = require('./_frontend_test_utils.cjs');

async function expectVisible(locator, message) {
  try {
    await locator.first().waitFor({ state: 'visible', timeout: 7000 });
  } catch (_) {
    throw new Error(message);
  }
}

async function clickFirstVisible(page, selectors, message) {
  for (const selector of selectors) {
    const node = page.locator(selector).first();
    if (await node.isVisible().catch(() => false)) {
      await node.click();
      return;
    }
  }
  for (const selector of selectors) {
    const node = page.locator(selector).first();
    try {
      await node.waitFor({ state: 'visible', timeout: 2500 });
      await node.click();
      return;
    } catch (_) {}
  }
  throw new Error(message);
}

async function pickModalDateTime(page, dayValue, timeValue) {
  await clickFirstVisible(page, ['#modal-date-trigger'], '日期触发器不可见');
  const dateMenu = page.locator('#modal-date-menu');
  await expectVisible(dateMenu.locator('.datetime-calendar-day, .datetime-select-option'), '日期菜单未打开');

  const dayBtn = dateMenu.locator(`.datetime-calendar-day[data-date="${dayValue}"]`).first();
  if (await dayBtn.count()) {
    await dayBtn.click();
  } else {
    const todayBtn = dateMenu.locator('[data-calendar-action="pick-today"]').first();
    await todayBtn.click();
  }

  await clickFirstVisible(page, ['#modal-time-trigger'], '时间触发器不可见');
  await expectVisible(page.locator('#modal-time-menu .datetime-select-option'), '时间菜单未打开');
  await page.locator(`#modal-time-menu .datetime-select-option[data-value="${timeValue}"]`).first().click();
}

async function run() {
  const root = path.resolve(__dirname, '..', '..');
  const reportDir = ensureDir(path.join(root, 'REPORTS', 'e2e', `todo_sync_check_${ts()}`));
  const resultPath = path.join(reportDir, 'result.json');
  const shotTodo = path.join(reportDir, 'todo_after_create.png');
  const shotCal = path.join(reportDir, 'calendar_check.png');
  const shotPomodoro = path.join(reportDir, 'pomodoro_check.png');

  const server = await startStaticServer(root, 4176);
  const { browser, context } = await createBrowserContext(server.baseUrl);

  const result = {
    startedAt: new Date().toISOString(),
    reportDir,
    checks: [],
    pass: false
  };

  try {
    const page = await context.newPage();
    const pageErrors = [];
    page.on('pageerror', (err) => pageErrors.push(String(err && err.message ? err.message : err)));

    const taskTitle = 'SYNC_CHECK_' + Date.now();
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const today = `${yyyy}-${mm}-${dd}`;

    // 1) 待办创建任务（在无后端时走本地回退保存）
    await page.goto('/frontend/待办页面.html', { waitUntil: 'domcontentloaded', timeout: 50000 });
    await page.waitForTimeout(1200);
    await clickFirstVisible(page, ['#add-task-header-btn', 'button:has-text("新建任务")'], '待办页新建按钮不可见');
    await expectVisible(page.locator('#new-task-modal:not(.hidden)'), '新建任务弹窗未打开');
    await page.fill('#modal-title', taskTitle);
    await page.fill('#modal-description', '同步专项测试任务');
    await pickModalDateTime(page, today, '09:00');
    await clickFirstVisible(page, ['#new-task-modal button:has-text("创建任务")'], '创建任务按钮不可见');
    await expectVisible(page.locator(`#today-task-list .task-card:has-text("${taskTitle}"), #today-task-list [data-task-id]:has-text("${taskTitle}")`), '待办页未看到新建任务');
    await page.screenshot({ path: shotTodo, fullPage: true });
    result.checks.push({ step: 'todo_create', pass: true, detail: taskTitle });

    // 2) 日历页面检查同名任务
    await page.goto('/frontend/日历页面.html', { waitUntil: 'domcontentloaded', timeout: 50000 });
    await page.waitForTimeout(1800);
    const calText = await page.evaluate(() => (document.body && document.body.innerText) || '');
    const calDebug = await page.evaluate(() => {
      let raw = null;
      let parsedCount = -1;
      let titles = [];
      try {
        raw = localStorage.getItem('qingyue_todo_app_state_v1');
        const parsed = raw ? JSON.parse(raw) : null;
        const tasks = parsed && Array.isArray(parsed.tasks) ? parsed.tasks : [];
        parsedCount = tasks.length;
        titles = tasks.map((t) => String((t && (t.title || t.name)) || '')).filter(Boolean).slice(0, 25);
      } catch (_) {}
      let appCount = -1;
      let appTitles = [];
      let appDefined = false;
      try {
        appDefined = (typeof AppState !== 'undefined');
        if (appDefined && Array.isArray(AppState.tasks)) {
          appCount = AppState.tasks.length;
          appTitles = AppState.tasks.map((t) => String((t && (t.title || t.name)) || '')).filter(Boolean).slice(0, 25);
        }
      } catch (_) {}
      let firstTask = null;
      try {
        if (appDefined && Array.isArray(AppState.tasks) && AppState.tasks.length > 0) {
          const t = AppState.tasks[0] || {};
          firstTask = {
            id: t.id,
            title: t.title,
            status: t.status,
            dueAt: t.dueAt,
            labels: t.labels,
            tag: t.tag,
            tags: t.tags
          };
        }
      } catch (_) {}
      return { parsedCount, appCount, titles, appTitles, appDefined, firstTask };
    });
    const calHasTask = calText.includes(taskTitle);
    await page.screenshot({ path: shotCal, fullPage: true });
    const calHasTaskInState = calDebug.titles.includes(taskTitle) || calDebug.appTitles.includes(taskTitle);
    result.checks.push({ step: 'calendar_contains_task', pass: calHasTask, detail: { taskTitle, calHasTaskInState, calDebug } });
    if (!calHasTask) {
      throw new Error('日历页面未发现待办新建任务: ' + taskTitle + ' | state=' + JSON.stringify(calDebug));
    }

    // 3) 番茄钟页面检查同名任务
    await page.goto('/frontend/番茄钟页面.html', { waitUntil: 'domcontentloaded', timeout: 50000 });
    await page.waitForTimeout(1800);
    const pomoText = await page.evaluate(() => (document.body && document.body.innerText) || '');
    const pomoHasTask = pomoText.includes(taskTitle);
    await page.screenshot({ path: shotPomodoro, fullPage: true });
    result.checks.push({ step: 'pomodoro_contains_task', pass: pomoHasTask, detail: taskTitle });
    if (!pomoHasTask) throw new Error('番茄钟页面未发现待办新建任务: ' + taskTitle);

    result.pageErrors = pageErrors;
    result.pass = pageErrors.length === 0 && result.checks.every((c) => c.pass);
    await page.close();
  } catch (err) {
    result.checks.push({ step: 'exception', pass: false, detail: String(err && err.message ? err.message : err) });
    result.pass = false;
  } finally {
    result.finishedAt = new Date().toISOString();
    fs.writeFileSync(resultPath, JSON.stringify(result, null, 2), 'utf8');
    try { await context.close(); } catch (_) {}
    try { await browser.close(); } catch (_) {}
    try { await server.close(); } catch (_) {}
  }

  if (!result.pass) {
    console.error('同步专项测试未通过，详情见：' + resultPath);
    process.exit(1);
  }
  console.log('同步专项测试通过，报告：' + resultPath);
}

run().catch((err) => {
  console.error(err && err.stack ? err.stack : err);
  process.exit(1);
});
