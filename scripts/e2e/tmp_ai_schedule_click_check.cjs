const fs = require('fs');
const path = require('path');
const {
  createBrowserContext,
  ensureDir,
  startStaticServer,
  ts
} = require('./_frontend_test_utils.cjs');

async function run() {
  const root = path.resolve(__dirname, '..', '..');
  const reportDir = ensureDir(path.join(root, 'REPORTS', 'e2e', `ai_schedule_check_${ts()}`));
  const resultPath = path.join(reportDir, 'result.json');

  const server = await startStaticServer(root, 4177);
  const { browser, context } = await createBrowserContext(server.baseUrl);

  const result = { startedAt: new Date().toISOString(), reportDir, pass: false };

  try {
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (err) => errors.push(String(err && err.message ? err.message : err)));

    await page.goto('/frontend/日历页面.html', { waitUntil: 'domcontentloaded', timeout: 50000 });
    await page.waitForTimeout(1200);

    await page.evaluate(() => {
      if (typeof AppState !== 'undefined' && AppState) {
        AppState.tasks = [
          { id: 'ai-1', title: 'AI排程任务A', status: 'pending', priority: 'high', dueAt: null, labels: ['工作'] },
          { id: 'ai-2', title: 'AI排程任务B', status: 'pending', priority: 'medium', dueAt: null, labels: ['学习'] }
        ];
        if (typeof AppState.save === 'function') AppState.save();
      }
    });

    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1200);

    await page.locator('#ai-schedule-btn').click();
    await page.waitForTimeout(1800);

    const statusText = await page.locator('#ai-schedule-status').innerText().catch(() => '');
    const taskDueCount = await page.evaluate(() => {
      if (typeof AppState === 'undefined' || !AppState || !Array.isArray(AppState.tasks)) return -1;
      return AppState.tasks.filter((t) => !!t.dueAt).length;
    });

    result.statusText = statusText;
    result.taskDueCount = taskDueCount;
    result.pageErrors = errors;
    result.pass = taskDueCount >= 1 && errors.length === 0;

    await page.screenshot({ path: path.join(reportDir, 'calendar_ai_schedule.png'), fullPage: true });
    await page.close();
  } catch (err) {
    result.error = String(err && err.message ? err.message : err);
    result.pass = false;
  } finally {
    result.finishedAt = new Date().toISOString();
    fs.writeFileSync(resultPath, JSON.stringify(result, null, 2), 'utf8');
    try { await context.close(); } catch (_) {}
    try { await browser.close(); } catch (_) {}
    try { await server.close(); } catch (_) {}
  }

  if (!result.pass) {
    console.error('AI 排程点击测试未通过，详情见：' + resultPath);
    process.exit(1);
  }
  console.log('AI 排程点击测试通过，报告：' + resultPath);
}

run().catch((err) => {
  console.error(err && err.stack ? err.stack : err);
  process.exit(1);
});
