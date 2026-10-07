// Run against an isolated local production build, never the production VPS listener.
import {performance} from 'node:perf_hooks';
const base = new URL(process.env.WICKSPEND_LOAD_URL || 'http://127.0.0.1:3097');
if (!['127.0.0.1','localhost','[::1]'].includes(base.hostname) || !base.port || base.port === '3080') {
  throw new Error('Use an isolated loopback listener on a non-production port.');
}
const routes = ['/landing','/login','/buy-number','/marketplace','/wallet','/reseller'];
const requests = 240, concurrency = 12;
for (const route of routes) {
  const response = await fetch(new URL(route,base)); await response.arrayBuffer();
  if (!response.ok) throw Error(`Warmup failed: ${route} ${response.status}`);
}
let next = 0;
const durations = [], errors = [];
const start = performance.now();
await Promise.all(Array.from({length:concurrency}, async () => {
  while (next < requests) {
    const index = next++, route = routes[index % routes.length], started = performance.now();
    try {
      const response = await fetch(new URL(route,base), {signal:AbortSignal.timeout(15000)});
      await response.arrayBuffer();
      if (!response.ok) errors.push({route,status:response.status});
    } catch (error) { errors.push({route,error:String(error)}); }
    durations.push(performance.now()-started);
  }
}));
const elapsed = performance.now()-start;
durations.sort((a,b)=>a-b);
console.log(JSON.stringify({scope:'Local frontend HTML only; excludes browser JS, authenticated APIs, orders and wallet debits',requests,concurrency,elapsedMs:Math.round(elapsed),requestsPerSecond:Math.round(requests/elapsed*1000),p50Ms:Math.round(durations[Math.floor(requests*.5)]),p95Ms:Math.round(durations[Math.floor(requests*.95)]),p99Ms:Math.round(durations[Math.floor(requests*.99)]),errors},null,2));
if (errors.length) process.exitCode=1;
