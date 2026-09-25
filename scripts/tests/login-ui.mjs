const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const base=process.env.TEST_BASE || 'http://127.0.0.1:3187';
try {
 for(const width of [320,393,430,1280]){
  const page=await browser.newPage({viewport:{width,height:932}});
  const errors=[]; page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/login'); await page.getByRole('heading',{name:'Welcome back'}).waitFor();
  const result=await page.evaluate(()=>{
   const buttons=[...document.querySelectorAll('main button')].map(b=>({text:b.textContent,bg:getComputedStyle(b).backgroundColor,height:b.getBoundingClientRect().height,radius:getComputedStyle(b).borderRadius}));
   return {overflow:document.documentElement.scrollWidth>innerWidth,buttons};
  });
  assert.equal(result.overflow,false,JSON.stringify(result));
  for(const b of result.buttons)assert(b.height>=44,JSON.stringify(b));
  assert.equal(result.buttons.find(b=>b.text.includes('New to')).bg,'rgba(0, 0, 0, 0)');
  assert.equal(result.buttons.find(b=>b.text.includes('verification')).bg,'rgb(238, 245, 255)');
  await page.getByRole('button',{name:'New to WickSpend? Create account'}).click();
  await page.getByLabel('Confirm password',{exact:true}).waitFor();
  await page.getByRole('button',{name:'Already have an account? Sign in'}).click();
  await page.getByRole('link',{name:'Forgot password?'}).click();
  await page.getByRole('button',{name:'Send verification code',exact:true}).waitFor();
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  assert.deepEqual(errors,[]);
  if(width===430)await page.screenshot({path:'/tmp/wickspend-reset-mobile.png',fullPage:true});
  console.log('PASS layout/navigation',width);
  await page.close();
 }
 const page=await browser.newPage({viewport:{width:430,height:932}});
 let sends=0,resets=0;
 await page.route('**/wickspend/backend/auth/email/request',async route=>{
  sends++; await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true})});
 });
 await page.route('**/wickspend/backend/auth/password/reset',async route=>{
  resets++; await route.fulfill({status:resets===1?400:200,contentType:'application/json',body:JSON.stringify(resets===1?{ok:false,code:'INVALID_OR_EXPIRED_RESET_CODE'}:{ok:true,password_reset:true})});
 });
 await page.goto(base+'/forgot-password');
 await page.getByLabel('Email address').fill('fixture@example.invalid');
 await page.getByRole('button',{name:'Send verification code',exact:true}).click();
 await page.getByLabel('Verification code',{exact:true}).fill('123456');
 await page.getByLabel('New password',{exact:true}).fill('new-password');
 await page.getByLabel('Confirm new password',{exact:true}).fill('different-password');
 await page.getByRole('button',{name:'Reset password',exact:true}).click();
 await page.getByText('Passwords do not match.').waitFor();
 assert.equal(resets,0);
 await page.getByLabel('Confirm new password',{exact:true}).fill('new-password');
 await page.getByRole('button',{name:'Reset password',exact:true}).click();
 await page.getByText(/That code is incorrect or expired/).waitFor();
 await page.getByRole('button',{name:'Send new code',exact:true}).click();
 assert.equal(sends,1);
 await page.getByRole('button',{name:'Reset password',exact:true}).click();
 await page.getByRole('heading',{name:'Password updated'}).waitFor();
 await page.getByRole('link',{name:'Sign in',exact:true}).click();
 await page.getByRole('heading',{name:'Welcome back'}).waitFor();
 await page.screenshot({path:'/tmp/wickspend-login-mobile.png',fullPage:true});
 console.log('PASS simulated reset flow, mismatch, invalid code, resend cooldown, success, return to login');
} finally {await browser.close();}
