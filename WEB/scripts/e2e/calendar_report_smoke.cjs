const { chromium } = require('playwright');

(async () => {
  const baseUrl = process.env.BASE_URL || 'http://47.108.170.112';
  const loginUrl = `${baseUrl}/登录页面.html`;
  const calendarUrl = `${baseUrl}/日历页面.html`;
  const reportUrl = `${baseUrl}/数据周报页面.html`;

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const pageErrors = [];
  const consoleErrors = [];
  page.on('pageerror', (err) => pageErrors.push(String(err && err.message ? err.message : err)));
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });

  try {
    await page.goto(loginUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForSelector('.btn-social', { timeout: 15000 });
    await page.click('.btn-social');
    await page.waitForURL(/(待办页面\.html|%E5%BE%85%E5%8A%9E%E9%A1%B5%E9%9D%A2\.html)/, {
      timeout: 20000,
      waitUntil: 'domcontentloaded'
    });

    await page.goto(calendarUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForSelector('.view-btn[data-view="month"]', { timeout: 15000 });

    const viewChecks = await page.evaluate(async () => {
      const checks = [];
      for (const view of ['week', 'day', 'month']) {
        const btn = document.querySelector(`.view-btn[data-view="${view}"]`);
        if (btn) btn.click();
        await new Promise((resolve) => setTimeout(resolve, 360));
        const panel = document.getElementById(`${view}-view`);
        checks.push({
          view,
          activeBtn: !!(btn && btn.classList.contains('active')),
          visiblePanel: !!(panel && !panel.classList.contains('hidden'))
        });
      }
      return checks;
    });

    const t0 = Date.now();
    await page.goto(reportUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForSelector('#time-range-text', { timeout: 12000 });
    const tReady = Date.now() - t0;

    const reportSnapshot = await page.evaluate(() => {
      const title = (document.querySelector('h1') || {}).textContent || '';
      const dateText = (document.getElementById('current-date') || {}).textContent || '';
      return { title: title.trim(), dateText: dateText.trim() };
    });

    const allViewsOk = viewChecks.every((x) => x.activeBtn && x.visiblePanel);
    const hasBlockingErrors = pageErrors.length > 0;

    if (!allViewsOk || hasBlockingErrors) {
      console.error('CALENDAR_REPORT_SMOKE_FAIL');
      console.error(JSON.stringify({ viewChecks, pageErrors, consoleErrors: consoleErrors.slice(0, 20), tReady, reportSnapshot }, null, 2));
      process.exit(1);
    }

    console.log('CALENDAR_REPORT_SMOKE_PASS');
    console.log(JSON.stringify({ viewChecks, tReady, reportSnapshot, pageErrorCount: pageErrors.length, consoleErrorCount: consoleErrors.length }, null, 2));
    process.exit(0);
  } catch (err) {
    console.error('CALENDAR_REPORT_SMOKE_ERROR');
    console.error(err && err.message ? err.message : String(err));
    console.error(JSON.stringify({ pageErrors, consoleErrors: consoleErrors.slice(0, 20) }, null, 2));
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
