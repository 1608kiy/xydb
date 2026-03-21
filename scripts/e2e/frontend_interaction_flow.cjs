const fs = require('fs');
const path = require('path');
const {
  createBrowserContext,
  createMockState,
  ensureDir,
  handleApiRoute,
  startStaticServer,
  ts
} = require('./_frontend_test_utils.cjs');

async function expectVisible(locator, message) {
  try {
    await locator.first().waitFor({ state: 'visible', timeout: 6000 });
  } catch (e) {
    throw new Error(message);
  }
}

async function getFirstVisible(page, selectors, message) {
  for (const selector of selectors) {
    const candidate = page.locator(selector).first();
    if (await candidate.isVisible().catch(() => false)) {
      return candidate;
    }
  }

  for (const selector of selectors) {
    const candidate = page.locator(selector).first();
    try {
      await candidate.waitFor({ state: 'visible', timeout: 2500 });
      return candidate;
    } catch (e) {
      // try next candidate
    }
  }

  throw new Error(message);
}

async function clickFirstVisible(page, selectors, message) {
  const target = await getFirstVisible(page, selectors, message);
  await target.click();
  return target;
}

async function selectDateFromMenu(page, prefix, dateValue) {
  const dateMenu = page.locator(`#${prefix}-date-menu`);
  await expectVisible(
    dateMenu.locator('.datetime-calendar-day, .datetime-select-option'),
    `${prefix} 日期下拉未打开`
  );

  const calendarItem = dateMenu.locator(`.datetime-calendar-day[data-date="${dateValue}"]`).first();
  if (await calendarItem.count()) {
    await calendarItem.click();
    return;
  }

  const legacyItem = dateMenu.locator(`.datetime-select-option[data-value="${dateValue}"]`).first();
  if (await legacyItem.count()) {
    await legacyItem.click();
    return;
  }

  const todayAction = dateMenu.locator('[data-calendar-action="pick-today"]').first();
  if (await todayAction.count()) {
    await todayAction.click();
    return;
  }

  throw new Error(`${prefix} 日期项未找到: ${dateValue}`);
}

async function pickDateTime(page, prefix, dateValue, timeValue) {
  await clickFirstVisible(
    page,
    [`#${prefix}-date-trigger`, `#${prefix}-datetime-trigger`],
    `${prefix} 日期触发器不可见`
  );
  await selectDateFromMenu(page, prefix, dateValue);

  await clickFirstVisible(
    page,
    [`#${prefix}-time-trigger`, `#${prefix}-datetime-trigger`],
    `${prefix} 时间触发器不可见`
  );
  await expectVisible(page.locator(`#${prefix}-time-menu .datetime-select-option`), `${prefix} 时间下拉未打开`);
  await page.locator(`#${prefix}-time-menu .datetime-select-option[data-value="${timeValue}"]`).first().click();
}

async function runTodoFlow(page) {
  const taskTitle = 'E2E 自动化任务-' + Date.now();
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const today = `${yyyy}-${mm}-${dd}`;

  await page.goto('/frontend/待办页面.html', { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForTimeout(1200);

  await clickFirstVisible(
    page,
    ['#add-task-header-btn', 'button:has-text("新建任务")', 'button:has-text("添加任务")'],
    '待办页新建任务按钮不可见'
  );
  await expectVisible(page.locator('#new-task-modal:not(.hidden)'), '新建任务弹窗未打开');

  await page.fill('#modal-title', taskTitle);
  await page.fill('#modal-description', 'E2E 前端交互脚本创建');
  await pickDateTime(page, 'modal', today, '09:00');
  await clickFirstVisible(
    page,
    ['#new-task-modal button:has-text("创建任务")', '#new-task-modal #create-task-btn', '#new-task-modal button[type="submit"]'],
    '新建任务提交按钮不可见'
  );

  await page.waitForTimeout(800);
  const createdTaskCard = await getFirstVisible(
    page,
    [
      `#today-task-list .task-card:has-text("${taskTitle}")`,
      `#today-task-list .task-item:has-text("${taskTitle}")`,
      `#today-task-list [data-task-id]:has-text("${taskTitle}")`
    ],
    '新建任务未出现在今日列表'
  );

  await createdTaskCard.click();
  await expectVisible(page.locator('#task-detail-panel:not(.hidden)'), '任务详情弹窗未打开');

  const subtask = '子任务-' + Date.now();
  await page.fill('#new-subtask-input', subtask);
  await page.locator('#add-subtask-btn').click();
  await expectVisible(page.locator(`#subtask-list .subtask-item:has-text("${subtask}")`), '子任务添加失败');

  await clickFirstVisible(
    page,
    ['#save-task-btn', '#task-detail-panel button:has-text("保存")', '#task-detail-panel button:has-text("更新")'],
    '待办详情保存按钮不可见'
  );
  await page.waitForTimeout(700);
  return { taskTitle, subtask };
}

async function runCalendarFlow(page) {
  await page.goto('/frontend/日历页面.html', { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForTimeout(1400);

  const poolItem = page.locator('#task-pool .task-pool-item, #task-pool .task-card').first();
  await expectVisible(poolItem, '日历页任务池为空或未渲染');
  await poolItem.click();
  await expectVisible(page.locator('#task-detail-panel:not(.hidden)'), '日历页任务详情未打开');

  const detailDateTrigger = page.locator('#detail-date-trigger').first();
  if (!(await detailDateTrigger.isVisible().catch(() => false))) {
    const detailDatetimeTrigger = page.locator('#detail-datetime-trigger').first();
    if (await detailDatetimeTrigger.isVisible().catch(() => false)) {
      await detailDatetimeTrigger.click();
    }
  }

  await detailDateTrigger.click();
  await selectDateFromMenu(page, 'detail', new Date().toISOString().slice(0, 10));

  const calSubtask = '日历子任务-' + Date.now();
  await page.fill('#new-subtask-input', calSubtask);
  await page.locator('#add-subtask-btn').click();
  await expectVisible(page.locator(`#subtask-list .subtask-item:has-text("${calSubtask}")`), '日历页子任务添加失败');

  await clickFirstVisible(
    page,
    ['#save-btn', '#save-task-btn', '#task-detail-panel button:has-text("保存")'],
    '日历详情保存按钮不可见'
  );
  await page.waitForTimeout(700);
}

async function run() {
  const root = path.resolve(__dirname, '..', '..');
  const reportDir = ensureDir(path.join(root, 'REPORTS', 'e2e', `interaction_${ts()}`));
  const logPath = path.join(reportDir, 'result.json');
  const server = await startStaticServer(root, 4174);
  const { browser, context } = await createBrowserContext(server.baseUrl);
  const state = createMockState();
  await context.route('**/api/**', (route) => handleApiRoute(route, state));

  const result = {
    startedAt: new Date().toISOString(),
    baseUrl: server.baseUrl,
    reportDir,
    checks: [],
    pass: false
  };

  try {
    const page = await context.newPage();
    const pageErrors = [];
    page.on('pageerror', (err) => pageErrors.push(String(err && err.message ? err.message : err)));

    const todo = await runTodoFlow(page);
    result.checks.push({ step: 'todo_flow', pass: true, detail: todo });

    await runCalendarFlow(page);
    result.checks.push({ step: 'calendar_flow', pass: true });

    const finalShot = path.join(reportDir, 'final_state.png');
    await page.screenshot({ path: finalShot, fullPage: true });
    result.screenshot = finalShot;
    result.pageErrors = pageErrors;
    result.pass = pageErrors.length === 0 && result.checks.every((c) => c.pass);
    await page.close();
  } catch (err) {
    result.checks.push({
      step: 'exception',
      pass: false,
      detail: String(err && err.message ? err.message : err)
    });
    result.pass = false;
  } finally {
    result.finishedAt = new Date().toISOString();
    fs.writeFileSync(logPath, JSON.stringify(result, null, 2), 'utf8');
    await context.close();
    await browser.close();
    await server.close();
  }

  if (!result.pass) {
    console.error('前端交互测试未通过，详情见：' + logPath);
    process.exit(1);
  }
  console.log('前端交互测试通过，报告：' + logPath);
}

run().catch((err) => {
  console.error(err && err.stack ? err.stack : err);
  process.exit(1);
});

