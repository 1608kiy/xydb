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
  const ok = await locator.first().isVisible().catch(() => false);
  if (!ok) throw new Error(message);
}

async function pickDateTime(page, prefix, dateValue, timeValue) {
  await page.locator(`#${prefix}-date-trigger`).click();
  await expectVisible(page.locator(`#${prefix}-date-menu .datetime-select-option`), `${prefix} 日期下拉未打开`);
  await page.locator(`#${prefix}-date-menu .datetime-select-option[data-value="${dateValue}"]`).first().click();

  await page.locator(`#${prefix}-time-trigger`).click();
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

  await expectVisible(page.locator('#add-task-header-btn'), '待办页新建任务按钮不可见');
  await page.locator('#add-task-header-btn').click();
  await expectVisible(page.locator('#new-task-modal:not(.hidden)'), '新建任务弹窗未打开');

  await page.fill('#modal-title', taskTitle);
  await page.fill('#modal-description', 'E2E 前端交互脚本创建');
  await pickDateTime(page, 'modal', today, '09:00');
  await page.locator('#new-task-modal button:has-text("创建任务")').click();

  await page.waitForTimeout(800);
  await expectVisible(page.locator(`#today-task-list .task-card:has-text("${taskTitle}")`), '新建任务未出现在今日列表');

  const targetCard = page.locator(`#today-task-list .task-card:has-text("${taskTitle}")`).first();
  await targetCard.click();
  await expectVisible(page.locator('#task-detail-panel:not(.hidden)'), '任务详情弹窗未打开');

  const subtask = '子任务-' + Date.now();
  await page.fill('#new-subtask-input', subtask);
  await page.locator('#add-subtask-btn').click();
  await expectVisible(page.locator(`#subtask-list .subtask-item:has-text("${subtask}")`), '子任务添加失败');

  await page.locator('#save-task-btn').click();
  await page.waitForTimeout(700);
  return { taskTitle, subtask };
}

async function runCalendarFlow(page) {
  await page.goto('/frontend/日历页面.html', { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForTimeout(1400);

  await expectVisible(page.locator('#task-pool .task-card'), '日历页任务池为空或未渲染');
  await page.locator('#task-pool .task-card').first().click();
  await expectVisible(page.locator('#task-detail-panel:not(.hidden)'), '日历页任务详情未打开');

  await page.locator('#detail-date-trigger').click();
  await expectVisible(page.locator('#detail-date-menu .datetime-select-option'), '日历详情日期下拉未打开');
  await page.locator('#detail-date-menu .datetime-select-option').nth(0).click();

  const calSubtask = '日历子任务-' + Date.now();
  await page.fill('#new-subtask-input', calSubtask);
  await page.locator('#add-subtask-btn').click();
  await expectVisible(page.locator(`#subtask-list .subtask-item:has-text("${calSubtask}")`), '日历页子任务添加失败');

  await page.locator('#save-btn').click();
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

