import { NUMBER_SERVICE_NAMES } from "@/lib/number-service-names";

const UPSTREAM_BASE = "https://n8n.wickspend.com/webhook/wickspend/store/";
const NOTICE_START = "function note(m,e){var n=document.getElementById('notice');";
const DIALOG_NOTICE_START = "function note(m,e){var d=document.querySelector('dialog[open]'),n=document.getElementById('notice');if(d){n=d.querySelector('.dialogNotice');if(!n){n=document.createElement('div');n.className='notice dialogNotice';d.prepend(n)}}";
const NUMBER_CLICK_OLD = "box.querySelectorAll('.numberBuy').forEach(function(b){b.onclick=function(){buyNumber(Number(b.dataset.i))}})}";
const NUMBER_CLICK_NEW = "box.querySelectorAll('.numberBuy').forEach(function(b){b.onclick=function(){buyNumber(Number(b.dataset.i),b)}})}";
const BUY_NUMBER_OLD = "async function buyNumber(i){if(!token)return openAuth();var v=numberCatalog[i];if(!v)return;note('Placing your order…');var x=await req('wickspend/store/numbers/buy',{method:'POST',body:JSON.stringify({country_code:v.country_code,service_code:v.service_code,provider_id:v.provider_id||'auto',request_key:requestKey()})});if(x.j.ok){note('Number purchased.');await session()}else if(x.r.status===202)note('Provider is confirming your number.');else note(x.j.code||'Order failed.',true)}";
const BUY_NUMBER_NEW = "async function buyNumber(i,b){if(!token)return openAuth();var v=numberCatalog[i];if(!v)return;var label=b&&b.textContent;if(b){b.disabled=true;b.textContent='Buying…'}note('Placing your order…');try{var x=await req('wickspend/store/numbers/buy',{method:'POST',body:JSON.stringify({country_code:v.country_code,service_code:v.service_code,provider_id:v.provider_id||'auto',offer_id:v.offer_id||undefined,operator_id:v.operator_id||undefined,request_key:requestKey()})});if(x.j.ok){note('Number purchased.');await session()}else if(x.r.status===202)note('Provider is confirming your number.');else if(String(x.j.code||x.j.error||'').toUpperCase()==='SELECTED_OFFER_UNAVAILABLE'){await loadNumberCatalog();note('That live offer changed. Prices refreshed — choose an available offer.',true)}else note(x.j.code||x.j.error||'Order failed.',true)}catch(e){note('Could not place order. Please try again.',true)}finally{if(b){b.disabled=false;b.textContent=label||'Buy number'}}}";
const CHECK_OTP_OLD = "async function checkOtp(ref,out){var x=await req('wickspend/store/numbers/status?reference='+encodeURIComponent(ref));if(!x.j.ok)return note(x.j.code||'Could not load OTP.',true);out.textContent=x.j.otp||'Waiting';note(x.j.otp?'OTP received: '+x.j.otp:'Still waiting for the SMS code.')}";
const CHECK_OTP_NEW = "async function checkOtp(ref,out){var x=await req('wickspend/store/numbers/status?reference='+encodeURIComponent(ref));if(!x.j.ok)return note(x.j.code||'Could not load OTP.',true);if(x.j.otp){out.textContent=x.j.otp;return note('OTP received: '+x.j.otp)}if(x.j.status==='completed'){out.textContent='No code';return note('Activation finished without an OTP code.',true)}out.textContent='Waiting';note('Still waiting for the SMS code.')}";
const DYNAMIC_NUMBER_FILTERS = `
async function loadNumberFilters(){var country=document.getElementById('country'),service=document.getElementById('service'),x=await req('wickspend/store/catalog/numbers?store_slug='+encodeURIComponent(slug)),countries=x.j.countries||[];if(x.j.ok&&countries.length){country.innerHTML=countries.map(function(v){return '<option value="'+esc(v.country_code)+'">'+esc((v.flag||'🌐')+' '+(v.country_name||v.iso_code||v.country_code))+'</option>'}).join('');var preferred=countries.find(function(v){return v.country_name==='United States'})||countries[0];country.value=String(preferred.country_code)}country.onchange=async function(){await loadNumberServices();await loadNumberCatalog()};service.onchange=loadNumberCatalog;var initialService=service.value;await Promise.all([loadNumberCatalog(),loadNumberServices()]);if(service.value!==initialService)await loadNumberCatalog()}
async function loadNumberServices(){var country=document.getElementById('country'),service=document.getElementById('service'),previous=service.value;service.disabled=true;service.innerHTML='<option>Loading services…</option>';var x=await req('wickspend/store/catalog/numbers?store_slug='+encodeURIComponent(slug)+'&country_code='+encodeURIComponent(country.value)),names={};(x.j.items||[]).forEach(function(v){var code=String(v.service_code||'').trim();if(code&&Number(v.available||v.count||0)>0&&!names[code])names[code]=v.service_name||code.toUpperCase()});var codes=Object.keys(names).sort(function(a,b){return String(names[a]).localeCompare(String(names[b]))});service.innerHTML=codes.length?codes.map(function(code){return '<option value="'+esc(code)+'">'+esc(names[code])+'</option>'}).join(''):'<option value="">No services available</option>';var preferred=codes.indexOf(previous)>=0?previous:(codes.indexOf('telegram')>=0?'telegram':(codes.indexOf('wa')>=0?'wa':codes[0]));if(preferred)service.value=preferred;service.disabled=!codes.length}
`;

type ProxyContext = { params: Promise<{ path: string[] }> };

export const dynamic = "force-dynamic";

async function proxy(request: Request, context: ProxyContext) {
  const { path } = await context.params;
  const safePath = (Array.isArray(path) ? path : []).map((segment) => encodeURIComponent(segment)).join("/");
  if (!safePath) return new Response("Not found", { status: 404 });
  if (safePath === "manual-funding/account" || safePath === "manual-funding/requests") {
    return Response.json({ ok: false, code: "FEATURE_REMOVED", message: "Manual bank transfer has been removed." }, {
      status: 410,
      headers: { "Cache-Control": "no-store" },
    });
  }

  const incoming = new URL(request.url);
  const upstreamUrl = `${UPSTREAM_BASE}${safePath}${incoming.search}`;
  const headers = new Headers();
  const authorization = request.headers.get("authorization");
  const contentType = request.headers.get("content-type");
  const isPasswordResetPath = safePath.startsWith("auth/password/");
  if (authorization && !isPasswordResetPath) headers.set("Authorization", authorization);
  if (contentType) headers.set("Content-Type", contentType);
  headers.set("X-Forwarded-Host", incoming.host);
  headers.set("X-Forwarded-Proto", "https");

  let body: ArrayBuffer | undefined;
  if (request.method !== "GET" && request.method !== "HEAD") {
    const buffer = await request.arrayBuffer();
    if (buffer.byteLength) body = buffer;
  }

  const upstream = await fetch(upstreamUrl, {
    method: request.method,
    headers,
    body,
    cache: "no-store",
    redirect: "manual",
  });
  const responseHeaders = new Headers();
  for (const name of ["content-type", "cache-control", "location", "x-content-type-options", "referrer-policy", "content-security-policy"]) {
    const value = upstream.headers.get(name);
    if (value) responseHeaders.set(name, value);
  }
  if (!responseHeaders.has("Cache-Control")) responseHeaders.set("Cache-Control", "no-store");
  const upstreamBody = await upstream.arrayBuffer();
  if (safePath === "auth/password/reset" && upstream.ok) {
    responseHeaders.set("Content-Type", "application/json; charset=utf-8");
    return Response.json({ ok: true, password_reset: true }, { status: 200, headers: responseHeaders });
  }
  if (isPasswordResetPath && !upstream.ok && upstreamBody.byteLength === 0) {
    const code = upstream.status === 401
      ? "INVALID_OR_EXPIRED_RESET_CODE"
      : upstream.status === 429
        ? "RATE_LIMITED"
        : upstream.status === 404
          ? "STORE_UNAVAILABLE"
          : "RESET_REQUEST_FAILED";
    responseHeaders.set("Content-Type", "application/json; charset=utf-8");
    return Response.json({ ok: false, code }, { status: upstream.status, headers: responseHeaders });
  }
  if (safePath === "catalog/numbers" && upstream.ok) {
    try {
      const payload = JSON.parse(new TextDecoder().decode(upstreamBody)) as {
        items?: Array<Record<string, unknown>>;
      };
      if (Array.isArray(payload.items)) {
        payload.items = payload.items.map((item) => {
          const code = String(item.service_code || "").trim();
          return {
            ...item,
            service_name: item.service_name || NUMBER_SERVICE_NAMES[code.toLowerCase()] || code.toUpperCase(),
          };
        });
      }
      responseHeaders.set("Content-Type", "application/json; charset=utf-8");
      return Response.json(payload, { status: upstream.status, headers: responseHeaders });
    } catch {
      // Preserve the original upstream response if its format changes unexpectedly.
    }
  }
  if (safePath === "app.js" && upstream.ok) {
    const script = new TextDecoder().decode(upstreamBody);
    const rewritten = script
      .replace(NOTICE_START, DIALOG_NOTICE_START)
      .replace(NUMBER_CLICK_OLD, NUMBER_CLICK_NEW)
      .replace(BUY_NUMBER_OLD, BUY_NUMBER_NEW)
      .replace(CHECK_OTP_OLD, CHECK_OTP_NEW)
      .replace("async function loadNumberCatalog(){", `${DYNAMIC_NUMBER_FILTERS}\nasync function loadNumberCatalog(){`)
      .replace(
        "await loadNumberCatalog()}\nasync function session",
        "await loadNumberFilters()}\nasync function session",
      );
    return new Response(rewritten, { status: upstream.status, headers: responseHeaders });
  }
  return new Response(upstreamBody, { status: upstream.status, headers: responseHeaders });
}

export async function GET(request: Request, context: ProxyContext) { return proxy(request, context); }
export async function POST(request: Request, context: ProxyContext) { return proxy(request, context); }
export async function PUT(request: Request, context: ProxyContext) { return proxy(request, context); }
export async function PATCH(request: Request, context: ProxyContext) { return proxy(request, context); }
export async function DELETE(request: Request, context: ProxyContext) { return proxy(request, context); }