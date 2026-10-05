const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function load(file, globals = {}, imports = {}) {
  const context = { exports: {}, require: name => {
    if (!(name in imports)) throw new Error(`Unexpected import: ${name}`);
    return imports[name];
  }, Promise, Map, Set, Date, JSON, URLSearchParams, AbortController, DOMException,
  setTimeout, clearTimeout, process: { env: {} }, ...globals };
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  vm.runInNewContext(code, context, { filename: file });
  return context.exports;
}
const { ReadCache } = load('lib/read-cache.ts');
const deferred = () => { let resolve, reject; const promise = new Promise((a,b) => {resolve=a;reject=b;}); return {promise,resolve,reject}; };

test('1000 concurrent reads make one request; zero TTL never serves stale status', async () => {
  const cache = new ReadCache(); const pending = deferred(); let calls = 0;
  const fetcher = () => { calls++; return pending.promise; };
  const requests = Array.from({length:1000}, () => cache.get('status', fetcher, 0));
  await Promise.resolve(); assert.equal(calls, 1);
  pending.resolve('ready'); assert.equal((await Promise.all(requests)).length, 1000);
  await cache.get('status', fetcher, 0); assert.equal(calls, 2);
});

test('TTL expiry, bounded LRU, and failures permit a later retry', async () => {
  let now = 0; const cache = new ReadCache(2, () => now); let calls = 0;
  const fetcher = async () => ++calls;
  await cache.get('a', fetcher, 100); await cache.get('b', fetcher, 100);
  assert.equal(await cache.get('a', fetcher, 100), 1);
  await cache.get('c', fetcher, 100);
  assert.equal(await cache.get('a', fetcher, 100), 1);
  assert.equal(await cache.get('b', fetcher, 100), 4);
  now = 101; assert.equal(await cache.get('b', fetcher, 100), 5);
  await assert.rejects(cache.get('failure', async () => { throw Error('offline'); }, 100));
  assert.equal(await cache.get('failure', async () => 'recovered', 100), 'recovered');
});

test('fresh requests bypass old reads, coalesce together and reject stale write-back', async () => {
  const cache = new ReadCache(); const old = deferred(); const fresh = deferred();
  const oldRead = cache.get('wallet', () => old.promise, 1000);
  const newRead = cache.get('wallet', () => fresh.promise, 1000, true);
  assert.equal(cache.get('wallet', () => {throw Error('duplicate');}, 1000, true), newRead);
  fresh.resolve('new'); await newRead;
  old.resolve('old'); await oldRead;
  assert.equal(await cache.get('wallet', () => {throw Error('stale cached result');}, 1000), 'new');
});

test('invalidated in-flight reads cannot populate the cache or remove a new request', async () => {
  const cache = new ReadCache(); const old = deferred(); const next = deferred();
  const first = cache.get('wallet', () => old.promise, 1000);
  cache.invalidate(key => key === 'wallet');
  const second = cache.get('wallet', () => next.promise, 1000);
  old.resolve('old'); await first;
  assert.equal(cache.get('wallet', () => {throw Error('duplicate');}, 1000), second);
  next.resolve('new'); await second;
  assert.equal(await cache.get('wallet', () => {throw Error('uncached');}, 1000), 'new');
});

function apiFixture(browser = true) {
  const calls = []; const waiting = [];
  const exports = load('lib/api.ts', {
    ...(browser ? {window:{location:{pathname:'/wallet',assign(){}}}} : {}),
    fetch: (path, options) => {
      const pending = deferred(); calls.push({path,options}); waiting.push(pending);
      return pending.promise.then(value => ({status:value.__status || 200,ok:(value.__status || 200) < 400,json:async () => value.payload || value}));
    },
  }, {
    '@/lib/read-cache': {ReadCache},
    '@/lib/session': {clearSessionTokenIfMatches(){}},
    '@/lib/client-cache': {clearVerifiedBalance(){}},
  });
  return {api:exports.api,calls,waiting,flush:async () => {await Promise.resolve();await Promise.resolve();}};
}

// These fixture tokens collide under the previous 32-bit session key hash.
test('colliding legacy session hashes stay isolated; server reads are never cached or shared', async () => {
  for (const browser of [true,false]) {
    const f = apiFixture(browser);
    const a = f.api.wallet.get('fixture-ze4-1xtedm4'); const b = f.api.wallet.get('fixture-4jkc-1nzislo');
    await f.flush(); assert.equal(f.calls.length, 2);
    f.waiting[0].resolve({balance:10}); f.waiting[1].resolve({balance:20});
    assert.equal((await a).balance, 10); assert.equal((await b).balance, 20);
    const same = f.api.wallet.get('fixture-ze4-1xtedm4'); await f.flush();
    assert.equal(f.calls.length, browser ? 2 : 3);
    if (!browser) f.waiting[2].resolve({balance:30});
    assert.equal((await same).balance, browser ? 10 : 30);
  }
});

test('successful wallet mutation invalidates wallet and all filtered order reads', async () => {
  const f = apiFixture();
  const wallet = f.api.wallet.get('a'); const orders = f.api.orders('a',{page:2});
  await f.flush(); f.waiting[0].resolve({balance:100}); f.waiting[1].resolve({orders:[]});
  await Promise.all([wallet,orders]);
  const purchase = f.api.numbers.buy('a',{country_code:'US',service_code:'tg',request_key:'fixture'});
  await f.flush(); assert.equal(f.calls[2].options.method, 'POST');
  assert.equal(JSON.parse(f.calls[2].options.body).request_key, 'fixture');
  f.waiting[2].resolve({ok:true,reference:'fixture'}); await purchase;
  const reads = [f.api.wallet.get('a'), f.api.orders('a',{page:2})];
  await f.flush(); assert.equal(f.calls.length, 5);
  f.waiting[3].resolve({balance:90}); f.waiting[4].resolve({orders:['fixture']});
  assert.equal((await Promise.all(reads))[0].balance, 90);
});

test('pending status reads coalesce while mutations remain independent POSTs', async () => {
  const f = apiFixture();
  const statuses = Array.from({length:100}, () => f.api.numbers.status('a','fixture'));
  await f.flush(); assert.equal(f.calls.length, 1);
  f.waiting[0].resolve({status:'pending'}); await Promise.all(statuses);
  const next = f.api.numbers.status('a','fixture'); await f.flush();
  assert.equal(f.calls.length, 2); f.waiting[1].resolve({status:'ready'}); await next;
  const purchases = [1,2].map(() => f.api.numbers.buy('a',{country_code:'US',service_code:'tg',request_key:'same-fixture'}));
  await f.flush(); assert.equal(f.calls.length, 4);
  for (const call of f.calls.slice(2)) assert.equal(call.options.method, 'POST');
  f.waiting[2].resolve({ok:true}); f.waiting[3].resolve({ok:true}); await Promise.all(purchases);
});

test('insufficient funds, pending protection and provider pending keep API semantics with no retries', async () => {
  const f = apiFixture();
  for (const [status,code] of [[402,'INSUFFICIENT_BALANCE'],[409,'PENDING_TRANSACTION']]) {
    const before = f.calls.length;
    const purchase = f.api.numbers.buy('fixture',{country_code:'US',service_code:'tg',request_key:'fixture'});
    const rejected = assert.rejects(purchase, error => error.status === status && error.code === code);
    await f.flush(); assert.equal(f.calls.length, before+1);
    f.waiting[before].resolve({__status:status,payload:{ok:false,code}}); await rejected;
    assert.equal(f.calls.length, before+1);
  }
  const pending = f.api.numbers.buy('fixture',{country_code:'US',service_code:'tg',request_key:'fixture'});
  await f.flush(); f.waiting[2].resolve({__status:202,payload:{provider_pending:true,reference:'fixture'}});
  assert.equal((await pending).provider_pending,true); assert.equal(f.calls.length,3);
});

test('navigation warms contextual routes once and does nothing offline or hidden', () => {
  const ref = {current:new Set()}; let effect; let timer; let path='/wallet';
  const prefetched=[]; const listeners={};
  const document={visibilityState:'visible',addEventListener:(name,fn)=>listeners[name]=fn,removeEventListener(){}};
  const navigator={onLine:true};
  const {NavigationWarmup}=load('components/NavigationWarmup.tsx', {
    document,navigator,window:{setTimeout:fn=>{timer=fn;return 1;},clearTimeout(){},addEventListener:(name,fn)=>listeners[name]=fn,removeEventListener(){}},
  }, {'react':{useRef:()=>ref,useEffect:fn=>effect=fn},'next/navigation':{usePathname:()=>path,useRouter:()=>({prefetch:route=>prefetched.push(route)})}});
  NavigationWarmup(); let cleanup=effect(); timer();
  assert.deepEqual(prefetched,['/wallet/transactions','/add-funds']);
  listeners.online(); listeners.visibilitychange(); assert.equal(prefetched.length,2); cleanup();
  path='/buy-number'; NavigationWarmup(); cleanup=effect();
  document.visibilityState='hidden'; timer(); assert.equal(prefetched.length,2);
  document.visibilityState='visible'; navigator.onLine=false; listeners.visibilitychange(); assert.equal(prefetched.length,2);
  navigator.onLine=true; listeners.online(); assert.equal(prefetched.length,5); cleanup();
});
