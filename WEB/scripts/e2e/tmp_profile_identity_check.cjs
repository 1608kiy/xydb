const { chromium } = require('playwright');

const BASE='http://47.108.170.112';

async function postJson(url, body){
  const r = await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  let j=null; try{ j=await r.json(); }catch(e){}
  return {status:r.status, body:j};
}

async function ensureUser(phone,pwd){
  const email=`${phone}@mobile.local`;
  await postJson(`${BASE}/api/auth/register`,{nickname:'核验用户',email,phone,password:pwd});
  const lr=await postJson(`${BASE}/api/auth/login`,{email,password:pwd});
  if(!(lr.status===200 && lr.body && lr.body.code===200)) throw new Error('login fail');
  return {email,phone};
}

async function login(page, account, pwd){
  await page.goto(`${BASE}/登录页面.html`,{waitUntil:'domcontentloaded'});
  await page.fill('#login-account', account);
  await page.fill('#login-password', pwd);
  await page.click('#login-form button[type="submit"]');
  await page.waitForTimeout(1200);
}

async function checkProfile(page){
  await page.goto(`${BASE}/个人中心页面.html`,{waitUntil:'domcontentloaded'});
  await page.waitForTimeout(1800);
  return await page.evaluate(() => ({
    name: (document.querySelector('#user-name') || {}).value || '',
    email: (document.querySelector('#user-email') || {}).textContent || '',
    phone: (document.querySelector('#user-phone') || {}).textContent || ''
  }));
}

(async()=>{
  const phone='139'+String(Date.now()).slice(-8);
  const pwd='Qy_view_A1!';
  const u=await ensureUser(phone,pwd);
  const browser=await chromium.launch({headless:true});
  const ctx=await browser.newContext({viewport:{width:1280,height:800}});
  const page=await ctx.newPage();

  await login(page,'admin','admin');
  const admin=await checkProfile(page);

  await page.evaluate(()=>{ if(window.performUnifiedLogoutFlow){window.performUnifiedLogoutFlow();} else { localStorage.removeItem('token'); location.href='登录页面.html'; }});
  await page.waitForTimeout(800);

  await login(page,u.phone,pwd);
  const mobile=await checkProfile(page);

  console.log(JSON.stringify({admin,mobile,expectedMobileEmail:u.email,expectedMobilePhone:u.phone},null,2));
  await browser.close();
})();
