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

function sanitize(name) {
  return name.replace(/[\\/:*?"<>|]/g, '_');
}

function containsAnyKeyword(text, keywords) {
  const source = String(text || '');
  return (keywords || []).some((k) => source.includes(k));
}

async function run() {
  const root = path.resolve(__dirname, '..', '..');
  const reportDir = ensureDir(path.join(root, 'REPORTS', 'e2e', `ui_smoke_${ts()}`));
  const summaryPath = path.join(reportDir, 'summary.json');
  const pages = [
    { name: '待办页面', url: '/frontend/待办页面.html', titleIncludes: '待办清单', keywords: ['新建任务', '添加任务'] },
    { name: '日历页面', url: '/frontend/日历页面.html', titleIncludes: '日历视图', keywords: ['任务池', '日历'] },
    { name: '番茄钟页面', url: '/frontend/番茄钟页面.html', titleIncludes: '番茄', keywords: ['专注', '番茄'] },
    { name: '数据周报页面', url: '/frontend/数据周报页面.html', titleIncludes: '数据周报', keywords: ['周报', '建议'] },
    { name: '打卡页面', url: '/frontend/打卡页面.html', titleIncludes: '打卡', keywords: ['打卡', '签到'] },
    { name: '个人中心页面', url: '/frontend/个人中心页面.html', titleIncludes: '个人中心', keywords: ['个人中心', '昵称'] }
  ];

  const server = await startStaticServer(root, 4173);
  const { browser, context } = await createBrowserContext(server.baseUrl);
  const state = createMockState();
  await context.route('**/api/**', (route) => handleApiRoute(route, state));

  const result = {
    startedAt: new Date().toISOString(),
    baseUrl: server.baseUrl,
    reportDir,
    pages: []
  };

  try {
    for (const cfg of pages) {
      const page = await context.newPage();
      const pageErrors = [];
      page.on('pageerror', (err) => pageErrors.push(String(err && err.message ? err.message : err)));

      await page.goto(cfg.url, { waitUntil: 'domcontentloaded', timeout: 45000 });
      await page.waitForTimeout(1200);

      const title = await page.title();
      const pageText = await page.evaluate(() => {
        return (document && document.body && document.body.innerText) || '';
      });
      const hasKeyword = containsAnyKeyword(pageText, cfg.keywords || []);
      const footerVisible = await page.locator('.unified-bottom-tab-dock, footer, #footer-container footer').first().isVisible().catch(() => false);
      const shotPath = path.join(reportDir, `${sanitize(cfg.name)}.png`);
      await page.screenshot({ path: shotPath, fullPage: true });

      const checks = {
        title: title.includes(cfg.titleIncludes),
        keyword: !!hasKeyword,
        footer: !!footerVisible
      };
      const pass = checks.title && checks.keyword && checks.footer && pageErrors.length === 0;

      result.pages.push({
        name: cfg.name,
        url: cfg.url,
        screenshot: shotPath,
        title,
        checks,
        pageErrors,
        pass
      });
      await page.close();
    }
  } finally {
    await context.close();
    await browser.close();
    await server.close();
    result.finishedAt = new Date().toISOString();
    result.pass = result.pages.every((p) => p.pass);
    fs.writeFileSync(summaryPath, JSON.stringify(result, null, 2), 'utf8');
  }

  if (!result.pass) {
    console.error('UI 自动化巡检未通过，详情见：' + summaryPath);
    process.exit(1);
  }
  console.log('UI 自动化巡检通过，报告：' + summaryPath);
}

run().catch((err) => {
  console.error(err && err.stack ? err.stack : err);
  process.exit(1);
});

