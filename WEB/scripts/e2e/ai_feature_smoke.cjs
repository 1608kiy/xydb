const path = require('path');
const {
  createBrowserContext,
  createMockState,
  ensureDir,
  handleApiRoute,
  startStaticServer,
  ts
} = require('./_frontend_test_utils.cjs');

async function run() {
  const root = path.resolve(__dirname, '..', '..');
  const reportDir = ensureDir(path.join(root, 'REPORTS', 'e2e', `ai_smoke_${ts()}`));
  const server = await startStaticServer(root, 4176);
  const { browser, context } = await createBrowserContext(server.baseUrl);

  const state = createMockState();
  state.tasks.push({
    id: '2999',
    title: 'AI 排程待安排任务',
    description: '用于 AI 排程测试',
    priority: 'high',
    status: 'pending',
    tags: JSON.stringify(['work']),
    dueAt: null,
    subtasks: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });

  await context.route('**/api/**', (route) => handleApiRoute(route, state));

  const result = {
    startedAt: new Date().toISOString(),
    baseUrl: server.baseUrl,
    checks: []
  };

  try {
    const page = await context.newPage();

    // 1) Calendar AI scheduling button smoke test
    await page.goto('/frontend/日历页面.html', { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForTimeout(1200);

    const aiBtn = page.locator('#ai-schedule-btn');
    const aiStatus = page.locator('#ai-schedule-status');
    const hasAiBtn = await aiBtn.isVisible().catch(() => false);
    if (!hasAiBtn) throw new Error('日历页 AI 排程按钮不可见');

    await aiBtn.click();
    await page.waitForFunction(() => {
      const el = document.getElementById('ai-schedule-status');
      if (!el) return false;
      const text = (el.textContent || '').trim();
      return text && text !== 'AI 正在生成排程建议...';
    }, { timeout: 14000 }).catch(() => null);
    const statusText = (await aiStatus.textContent().catch(() => '')) || '';
    const scheduleOk = /已自动排程|已预排程|AI 优化完成|AI 优化中|未生成可应用|暂无未排程任务|未发现未排程任务|AI 不可用/.test(statusText);
    result.checks.push({ step: 'calendar_ai_schedule', pass: scheduleOk, detail: statusText.trim() });
    if (!scheduleOk) throw new Error('AI 排程状态异常: ' + statusText);

    // 2) Report AI suggestions smoke test
    await page.goto('/frontend/数据周报页面.html', { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForTimeout(2200);

    const cards = page.locator('#smart-suggestions-list .suggestion-card');
    const cardCount = await cards.count();
    const refreshBtn = page.locator('#ai-suggestions-refresh');
    if (await refreshBtn.isVisible().catch(() => false)) {
      await refreshBtn.click();
      await page.waitForTimeout(1800);
    }
    const cardCountAfter = await cards.count();
    const reportOk = cardCount > 0 && cardCountAfter > 0;
    result.checks.push({ step: 'report_ai_suggestions', pass: reportOk, detail: `before=${cardCount}, after=${cardCountAfter}` });
    if (!reportOk) throw new Error('周报智能建议渲染失败');

    // 3) Profile apple icon visibility in dark mode
    await page.goto('/frontend/个人中心页面.html', { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForTimeout(1200);
    await page.evaluate(() => {
      document.body.classList.add('theme-night');
      document.documentElement.classList.add('unified-dark-mode');
    });
    const appleStyle = await page.evaluate(() => {
      const el = document.querySelector('.social-icon.apple');
      if (!el) return null;
      const s = window.getComputedStyle(el);
      return { color: s.color, backgroundColor: s.backgroundColor };
    });
    const profileOk = !!appleStyle;
    result.checks.push({ step: 'profile_apple_icon_dark', pass: profileOk, detail: appleStyle || 'missing' });
    if (!profileOk) throw new Error('个人中心苹果图标未找到');

    result.pass = result.checks.every((c) => c.pass);
    result.finishedAt = new Date().toISOString();

    const out = path.join(reportDir, 'result.json');
    require('fs').writeFileSync(out, JSON.stringify(result, null, 2), 'utf8');
    console.log('AI 功能冒烟测试完成：' + out);

    await page.close();
  } catch (err) {
    result.pass = false;
    result.checks.push({ step: 'exception', pass: false, detail: String(err && err.message ? err.message : err) });
    result.finishedAt = new Date().toISOString();
    const out = path.join(reportDir, 'result.json');
    require('fs').writeFileSync(out, JSON.stringify(result, null, 2), 'utf8');
    console.error('AI 功能冒烟测试失败：' + out);
    console.error(err && err.stack ? err.stack : err);
    process.exitCode = 1;
  } finally {
    await context.close();
    await browser.close();
    await server.close();
  }
}

run().catch((err) => {
  console.error(err && err.stack ? err.stack : err);
  process.exit(1);
});
