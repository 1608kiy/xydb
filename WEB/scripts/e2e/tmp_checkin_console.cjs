const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const logs = [];

  page.on('console', (m) => logs.push({ type: m.type(), text: m.text() }));
  page.on('pageerror', (e) => logs.push({ type: 'pageerror', text: String(e && e.message ? e.message : e) }));

  await page.goto('http://47.108.170.112/登录页面.html?nocache=' + Date.now(), {
    waitUntil: 'domcontentloaded',
    timeout: 30000,
  });
  await page.waitForSelector('.btn-social', { timeout: 15000 });
  await page.click('.btn-social');
  await page.waitForURL(/(待办页面\.html|%E5%BE%85%E5%8A%9E%E9%A1%B5%E9%9D%A2\.html)/, {
    timeout: 25000,
    waitUntil: 'domcontentloaded',
  });

  const resp = await page.goto('http://47.108.170.112/打卡页面.html?nocache=' + Date.now(), {
    waitUntil: 'domcontentloaded',
    timeout: 30000,
  });
  await page.waitForTimeout(2200);

  const sample = await page.evaluate(() => ({
    title: document.querySelector('h2.text-sm.font-semibold')?.textContent?.trim() || '',
    distributionPeriod: document.getElementById('distribution-period')?.textContent?.trim() || '',
    checkinStatus: document.getElementById('checkin-status')?.textContent?.trim() || '',
    bodyTextHead: (document.body && document.body.innerText ? document.body.innerText.slice(0, 160) : ''),
  }));

  const errors = logs.filter((x) => x.type === 'error' || x.type === 'pageerror');

  console.log('DOC_STATUS=' + (resp ? resp.status() : -1));
  console.log('FINAL_URL=' + page.url());
  console.log('SAMPLE=' + JSON.stringify(sample));
  console.log('ERROR_COUNT=' + errors.length);
  errors.slice(0, 30).forEach((e, i) => {
    console.log('ERR_' + (i + 1) + '=' + e.type + '|' + e.text);
  });

  await browser.close();
})();
