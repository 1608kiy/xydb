const { chromium } = require('playwright');

(async () => {
  const baseUrl = process.env.BASE_URL || 'http://47.108.170.112';
  const loginUrl = `${baseUrl}/登录页面.html`;

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await page.goto(loginUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForSelector('.btn-social', { timeout: 15000 });

    await page.click('.btn-social');

    await page.waitForURL(/(待办页面\.html|%E5%BE%85%E5%8A%9E%E9%A1%B5%E9%9D%A2\.html)/, {
      timeout: 20000,
      waitUntil: 'domcontentloaded'
    });

    const token = await page.evaluate(() => localStorage.getItem('token') || '');
    const devSkipAuth = await page.evaluate(() => localStorage.getItem('devSkipAuth') || '');

    const okToken = !!token && !token.startsWith('dev-local-');
    const okSkip = !devSkipAuth || devSkipAuth !== '1';

    if (!okToken || !okSkip) {
      console.error('SOCIAL_LOGIN_SMOKE_FAIL');
      console.error(JSON.stringify({ token, devSkipAuth }, null, 2));
      process.exit(1);
    }

    console.log('SOCIAL_LOGIN_SMOKE_PASS');
    console.log(JSON.stringify({
      url: page.url(),
      tokenPrefix: token.slice(0, 24),
      hasDevSkipAuth: devSkipAuth === '1'
    }, null, 2));
    process.exit(0);
  } catch (err) {
    console.error('SOCIAL_LOGIN_SMOKE_ERROR');
    console.error(err && err.message ? err.message : String(err));
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
