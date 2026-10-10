import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');

// Exercise the production app.js proxy rewrite against the existing upstream
// renderer/purchase signatures. All wallet requests remain mocked.
const original = `var slug='test-store',token='',marketplaceCatalog=[];
function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function money(v){return '₦'+Number(v||0).toLocaleString('en-NG',{maximumFractionDigits:2})}
function requestKey(){return crypto.randomUUID()}
function note(v){document.getElementById('notice').textContent=v}
function openAuth(){window.authOpened=(window.authOpened||0)+1}
async function req(path,opt={}){opt.headers={Authorization:'Bearer '+token,'Content-Type':'application/json'};var r=await fetch('/webhook/'+path,opt);return {r:r,j:await r.json()}}
async function session(){window.sessionRefreshed=true}
async function loadMarketplaceOrders(){window.ordersRefreshed=true}
async function loadMarketplace(){var box=document.getElementById('marketProducts');box.innerHTML='Old cards'}
async function buyMarketplace(i){if(!token)return openAuth();var v=marketplaceCatalog[i],input=document.querySelector('.marketQty[data-i="'+i+'"]'),qty=Math.max(1,Number(input&&input.value||1));if(!v)return;note('Placing marketplace order…');var x=await req('wickspend/store/marketplace/buy',{method:'POST',body:JSON.stringify({product_id:String(v.id||v.product_id||''),quantity:qty,request_key:requestKey()})});if(x.j.ok){note(x.j.status==='fulfilled'?'Marketplace delivered.':'Marketplace order placed.');orderType='marketplace';await session();await loadMarketplaceOrders();document.getElementById('orders').scrollIntoView({behavior:'smooth',block:'center'})}else if(x.r.status===202){note('Provider is confirming your delivery.');orderType='marketplace';await loadMarketplaceOrders();document.getElementById('orders').scrollIntoView({behavior:'smooth',block:'center'})}else note(x.j.code||'Marketplace order failed.',true)}
var orderType='marketplace';`;
const source = fs.readFileSync('app/webhook/wickspend/store/[...path]/route.ts','utf8');
const compiled = ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const sandbox={exports:{},require:()=>({NUMBER_SERVICE_NAMES:{}}),fetch:async()=>new Response(original,{headers:{'Content-Type':'application/javascript'}}),Response,Request,Headers,URL,TextDecoder,console};
vm.runInNewContext(compiled,sandbox);
const response=await sandbox.exports.GET(new Request('https://store.test/webhook/wickspend/store/app.js'),{params:Promise.resolve({path:['app.js']})});
const script=await response.text();
assert(script.includes('function renderMarketplace()'));
assert(script.includes('async function placeMarketplaceOrder(i)'));
const storeRoute=fs.readFileSync('app/store/[slug]/route.ts','utf8');
const css=storeRoute.match(/const MINI_STORE_MARKETPLACE_STYLES = `([\s\S]*?)`;/)[1];
let html=`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>*{box-sizing:border-box}body{margin:0;background:#f6f7f9;font-family:Arial,sans-serif}.wrap{max-width:1320px;padding:16px;margin:auto}.card{background:#fff}.field{padding:12px}.btn{min-height:44px}.hide{display:none}:root{--p:#a32675}</style>${css}</head><body><main class="wrap"><div id="notice"></div><section id="panelMarketplace"><h2>Marketplace</h2><div class="card"><div class="searchbar"><input id="marketSearch"><button onclick="loadMarketplace()">Search</button></div></div><div id="marketProducts" class="grid"></div></section><div id="orders">Existing order stays here</div></main><script src="/webhook/wickspend/store/app.js"></script></body></html>`;
if(process.env.TEST_STORE_HTML){
 html=fs.readFileSync(process.env.TEST_STORE_HTML,'utf8').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace('</head>',css+'</head>').replace('</body>','<script src="/webhook/wickspend/store/app.js"></script></body>');
}
const products=[
 {id:'p1',name:'Instagram Accounts | Gmail or SMS Verified | 2FA Enabled | Registered from UK 🇬🇧 '+('Longtitle'.repeat(12)),description:'Details '.repeat(100)+' https://supplier.invalid/api shopviaclone',category:'Instagram',platform:'Instagram',country_code:'GB',country_name:'United Kingdom',price_ngn:3000,stock:369,imageUrl:'data:image/svg+xml,<svg/>',reseller_markup_ngn:1000,provider:'SECRET_SUPPLIER'},
 {id:'p2',name:'Facebook account',category:'Facebook',price_ngn:2500,stock:'0'},
 {id:'p3',name:'Manual digital tool',category:'Digital tools',price_ngn:12500,stock:null},
 {id:'p4',name:'Large price',category:'Instagram',price_ngn:123456789.99,stock:12},
];
sandbox.fetch=async()=>Response.json({ok:true,products,provider:'SECRET_SUPPLIER'});
const projected=await sandbox.exports.GET(new Request('https://store.test/webhook/wickspend/store/catalog/marketplace'),{params:Promise.resolve({path:['catalog','marketplace']})});
const customerCatalog=await projected.json();
assert.equal(customerCatalog.products[0].price_ngn,3000);
assert.equal(customerCatalog.products[0].id,'p1');
assert(!JSON.stringify(customerCatalog).includes('SECRET_SUPPLIER'));
assert(!JSON.stringify(customerCatalog).includes('reseller_markup_ngn'));
assert(!JSON.stringify(customerCatalog).includes('shopviaclone'));
assert(!JSON.stringify(customerCatalog).includes('supplier.invalid'));
sandbox.fetch=async()=>Response.json({ok:true,products:null});
const malformed=await sandbox.exports.GET(new Request('https://store.test/webhook/wickspend/store/catalog/marketplace'),{params:Promise.resolve({path:['catalog','marketplace']})});
assert.equal(malformed.status,502);
console.log('PASS customer catalog projection: selling price/reference preserved; supplier/markup omitted; malformed response fails safely');
const browser=await chromium.launch({headless:true,args:['--no-sandbox'],...(process.env.TEST_CHROMIUM?{executablePath:process.env.TEST_CHROMIUM}:{})});
try{
 for(const width of [320,375,390,393,414,430,768,1024,1440]){
  const page=await browser.newPage({viewport:{width,height:1000}}),errors=[];let fail=false,empty=false,delay=0,buys=[],buyStatus=200,paginated=false;
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('https://store.test/**',async route=>{
   const url=new URL(route.request().url());
   if(url.pathname.startsWith('/icons/services/'))return route.fulfill({contentType:'image/svg+xml',body:fs.readFileSync('public'+url.pathname,'utf8')});
   if(url.pathname.endsWith('app.js'))return route.fulfill({contentType:'application/javascript',body:script});
   if(url.pathname.includes('catalog/marketplace')){
    if(delay)await new Promise(r=>setTimeout(r,delay));
    const query=(url.searchParams.get('search')||'').toLowerCase();
    const pageNumber=Number(url.searchParams.get('page')||1);
    const rows=empty?[]:query?products.filter(p=>p.name.toLowerCase().includes(query)):paginated?(pageNumber===1?products.slice(0,2):products.slice(2)):products;
    sandbox.fetch=async()=>Response.json(fail?{ok:false}:{ok:true,products:rows,has_more:paginated&&pageNumber===1},{status:fail?503:200});
    const safeCatalog=await sandbox.exports.GET(new Request(url),{params:Promise.resolve({path:['catalog','marketplace']})});
    return route.fulfill({status:safeCatalog.status,contentType:'application/json',body:await safeCatalog.text()});
   }
   if(url.pathname.endsWith('/marketplace/buy')){
    buys.push({body:route.request().postDataJSON(),auth:route.request().headers().authorization});
    await new Promise(r=>setTimeout(r,80));
    return route.fulfill({status:buyStatus,contentType:'application/json',body:JSON.stringify(buyStatus===200?{ok:true,status:'fulfilled'}:buyStatus===202?{ok:false}:{ok:false,code:'SECRET_SUPPLIER_FAILURE'})});
   }
   return route.fulfill({contentType:'text/html',body:html});
  });
  await page.goto('https://store.test');await page.evaluate(()=>{document.documentElement.style.setProperty('--p','#a32675');document.body.classList.remove('wick-landing-active');document.getElementById('wickStorefront')?.remove();document.getElementById('panelMarketplace').classList.remove('hide');document.getElementById('panelNumbers')?.classList.add('hide');document.getElementById('orders').textContent='Existing order stays here';return loadMarketplace()});
  await page.locator('.marketCard').first().waitFor();
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`Overflow at ${width}`);
  const geometry=await page.locator('.marketCard').evaluateAll(cards=>cards.map(card=>{const r=card.getBoundingClientRect(),b=card.querySelector('.marketBag').getBoundingClientRect();return {width:r.width,height:r.height,right:r.right,bagRight:b.right,clamp:getComputedStyle(card.querySelector('.marketDetails')).webkitLineClamp,color:getComputedStyle(card.querySelector('.marketBag')).color,pills:[...card.querySelectorAll('.marketPill')].map(p=>p.getBoundingClientRect().width)}}));
  for(const card of geometry){assert(card.bagRight<=card.right);assert.equal(card.clamp,'4');assert(card.pills.every(w=>w>0&&w<card.width));}
  assert.equal(geometry[0].color,'rgb(163, 38, 117)');
  assert.equal(await page.locator('.marketCard[data-i="1"] .marketBag').isDisabled(),true);
  await page.evaluate(()=>buyMarketplace(1));assert.equal(buys.length,0);
  assert.equal(await page.locator('#marketProducts').innerText().then(t=>t.includes('SECRET_SUPPLIER')||t.includes('supplier.invalid')||t.includes('shopviaclone')),false);
  assert(await page.locator('#marketProducts').innerText().then(t=>t.includes('369 pcs')&&t.includes('In stock')&&/₦3[,.]?000/.test(t)),await page.locator('#marketProducts').innerText());
  assert.equal(await page.locator('#marketCategories button').count(),4);
  // Existing guest authentication and authenticated wallet payload.
  await page.locator('.marketCard[data-i="0"] .marketBag').click();assert.equal(await page.evaluate(()=>window.authOpened),1);assert.equal(buys.length,0);
  await page.locator('.marketCard[data-i="0"] .marketTitle').click();assert.equal(await page.evaluate(()=>window.authOpened),2);
  await page.evaluate(()=>{token='fixture-session'});
  await page.locator('.marketQty[data-i="0"]').fill('370');await page.evaluate(()=>buyMarketplace(0));assert.equal(buys.length,0);
  await page.locator('.marketQty[data-i="0"]').fill('2');
  await page.evaluate(()=>{buyMarketplace(0);buyMarketplace(0)});
  await page.waitForFunction(()=>!marketOrdering&&!marketBusy);
  assert.equal(buys.length,1);assert.equal(buys[0].body.quantity,2);assert.equal(buys[0].body.product_id,'p1');assert(buys[0].body.request_key);assert.equal(buys[0].auth,'Bearer fixture-session');assert.equal(await page.evaluate(()=>window.sessionRefreshed&&window.ordersRefreshed),true);
  assert.equal(await page.locator('#orders').innerText(),'Existing order stays here');
  await page.getByRole('button',{name:'Facebook',exact:true}).click();assert.equal(await page.locator('.marketCard').count(),1);
  await page.getByRole('button',{name:'All products',exact:true}).click();
  await page.locator('#marketSearch').fill('United Kingdom');await page.locator('#marketSearch').press('Enter');await page.waitForFunction(()=>!marketBusy);assert.equal(await page.locator('.marketCard').count(),1);
  await page.locator('#marketSearch').fill('');
  fail=true;await page.evaluate(()=>loadMarketplace());assert(await page.locator('.marketState').innerText().then(t=>t.includes('Could not load')));
  fail=false;await page.getByRole('button',{name:'Try again'}).click();await page.waitForFunction(()=>!marketBusy);
  empty=true;await page.evaluate(()=>loadMarketplace());assert(await page.locator('.marketState').innerText().then(t=>t.includes('No products')));
  empty=false;delay=150;await page.evaluate(()=>{loadMarketplace()});assert.equal(await page.locator('.marketSkeleton').count(),3);await page.waitForFunction(()=>!marketBusy);delay=0;
  if(width===393&&process.env.TEST_SCREENSHOT)await page.screenshot({path:process.env.TEST_SCREENSHOT,fullPage:true});
  assert.deepEqual(errors,[]);console.log(`PASS ${width}px: layout, theme, stock, quantity, auth, wallet payload, search, categories, states, existing orders`);
  if(width===393){
   buyStatus=202;await page.evaluate(()=>buyMarketplace(0));assert(await page.locator('#notice').innerText().then(t=>t.includes('delivery is being confirmed')));
   buyStatus=402;await page.evaluate(()=>buyMarketplace(0));assert(await page.locator('#notice').innerText().then(t=>!t.includes('SECRET_SUPPLIER')));
   paginated=true;await page.evaluate(()=>loadMarketplace());assert.equal(await page.locator('.marketCard').count(),2);
   await page.getByRole('button',{name:'Load more products'}).click();await page.waitForFunction(()=>!marketBusy);assert.equal(await page.locator('.marketCard').count(),4);
   assert.equal(await page.locator('.marketCard[data-i="2"] .marketTitle').innerText(),'Manual digital tool');
   await page.locator('.marketCard[data-i="2"]').focus();await page.keyboard.press('Enter');await page.waitForFunction(()=>!marketBusy&&!marketOrdering);assert.equal(buys.at(-1).body.product_id,'p3');
   console.log('PASS pending/failed wallet states, pagination, card taps and keyboard purchase');
  }
  await page.close();
 }
}finally{await browser.close()}
