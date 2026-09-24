import { NUMBER_SERVICE_NAMES } from "@/lib/number-service-names";

const UPSTREAM_BASE = "https://n8n.wickspend.com/webhook/wickspend/store/";
const NOTICE_START = "function note(m,e){var n=document.getElementById('notice');";
const DIALOG_NOTICE_START = "function note(m,e){var d=document.querySelector('dialog[open]'),n=document.getElementById('notice');if(d){n=d.querySelector('.dialogNotice');if(!n){n=document.createElement('div');n.className='notice dialogNotice';d.prepend(n)}}";
const NUMBER_CLICK_OLD = "box.querySelectorAll('.numberBuy').forEach(function(b){b.onclick=function(){buyNumber(Number(b.dataset.i))}})}";
const NUMBER_CLICK_NEW = "box.querySelectorAll('.numberBuy').forEach(function(b){b.onclick=function(){buyNumber(Number(b.dataset.i),b)}})}";
const BUY_NUMBER_OLD = "async function buyNumber(i){if(!token)return openAuth();var v=numberCatalog[i];if(!v)return;note('Placing your order…');var x=await req('wickspend/store/numbers/buy',{method:'POST',body:JSON.stringify({country_code:v.country_code,service_code:v.service_code,provider_id:v.provider_id||'auto',request_key:requestKey()})});if(x.j.ok){note('Number purchased.');await session()}else if(x.r.status===202)note('Provider is confirming your number.');else note(x.j.code||'Order failed.',true)}";
const BUY_NUMBER_NEW = "async function buyNumber(i,b){if(!token)return openAuth();var v=numberCatalog[i];if(!v)return;var label=b&&b.textContent;if(b){b.disabled=true;b.textContent='Buying…'}note('Placing your order…');try{var x=await req('wickspend/store/numbers/buy',{method:'POST',body:JSON.stringify({country_code:v.country_code,service_code:v.service_code,provider_id:v.provider_id||'auto',offer_id:v.offer_id||undefined,operator_id:v.operator_id||undefined,request_key:requestKey()})});var code=String(x.j.code||x.j.error||'').toUpperCase();if(x.j.ok){note('Number purchased.');await session()}else if(x.r.status===202)note('Provider is confirming your number.');else if(x.r.status===401||code==='UNAUTHORIZED'){note('Session expired — sign in again.',true);openAuth()}else if(code==='INSUFFICIENT_FUNDS'||x.r.status===402)note('Insufficient balance.',true);else if(code==='SELECTED_OFFER_UNAVAILABLE'){await loadNumberCatalog();note('Selected price changed — refreshed. Choose an available offer.',true)}else if(['NO_NUMBERS','PURCHASE_FAILED','NUMBER_UNAVAILABLE','PURCHASE_UNAVAILABLE'].includes(code)){await loadNumberCatalog();note('Number temporarily unavailable. Choose another available offer.',true)}else if(code==='FX_UNAVAILABLE'||code==='PROVIDER_UNAVAILABLE'||x.r.status>=500)note('Provider temporarily unavailable. Please try again shortly.',true);else note('Could not place order. Please try again.',true)}catch(e){note('Could not place order. Please try again.',true)}finally{if(b){b.disabled=false;b.textContent=label||'Buy number'}}}";
const CHECK_OTP_OLD = "async function checkOtp(ref,out){var x=await req('wickspend/store/numbers/status?reference='+encodeURIComponent(ref));if(!x.j.ok)return note(x.j.code||'Could not load OTP.',true);out.textContent=x.j.otp||'Waiting';note(x.j.otp?'OTP received: '+x.j.otp:'Still waiting for the SMS code.')}";
const CHECK_OTP_NEW = "async function checkOtp(ref,out){var x=await req('wickspend/store/numbers/status?reference='+encodeURIComponent(ref));if(!x.j.ok)return note(x.j.code||'Could not load OTP.',true);if(x.j.otp){out.textContent=x.j.otp;return note('OTP received: '+x.j.otp)}if(x.j.status==='completed'){out.textContent='No code';return note('Activation finished without an OTP code.',true)}out.textContent='Waiting';note('Still waiting for the SMS code.')}";
const FUND_WALLET_OLD = "async function fundWallet(){if(!token)return openAuth();var a=Number(document.getElementById('fundAmount').value||0);if(a<500)return note('Minimum funding is ₦500.',true);var w=window.open('about:blank','_blank');var x=await req('wickspend/store/wallet/funding/initialize',{method:'POST',body:JSON.stringify({amount_ngn:a})});if(x.j.ok&&x.j.checkout_url){if(w)w.location=x.j.checkout_url;else location.href=x.j.checkout_url;note('Complete payment, then return here and tap Refresh.')}else{if(w)w.close();note(x.j.code||'Could not start funding.',true)}}";
const FUND_WALLET_NEW = "async function fundWallet(){if(!token)return openAuth();var a=Number(document.getElementById('fundAmount').value||0);if(a<500)return note('Minimum funding is ₦500.',true);var w=window.open('about:blank','_blank');var x=await req('wickspend/store/wallet/funding/initialize',{method:'POST',body:JSON.stringify({amount_ngn:a})});if(x.j.ok&&x.j.checkout_url){try{localStorage.setItem('wickstore_pending_funding_return',JSON.stringify({slug:slug,reference:String(x.j.reference||''),createdAt:Date.now()}))}catch(e){}if(w)w.location=x.j.checkout_url;else location.href=x.j.checkout_url;note('Complete payment. You will return to this Mini Store.')}else{if(w)w.close();note(x.j.code||'Could not start funding.',true)}}";
const DYNAMIC_NUMBER_FILTERS = `
async function loadNumberFilters(){var country=document.getElementById('country'),service=document.getElementById('service'),x=await req('wickspend/store/catalog/numbers?store_slug='+encodeURIComponent(slug)),countries=x.j.countries||[];if(x.j.ok&&countries.length){country.innerHTML=countries.map(function(v){return '<option value="'+esc(v.country_code)+'">'+esc((v.flag||'🌐')+' '+(v.country_name||v.iso_code||v.country_code))+'</option>'}).join('');var preferred=countries.find(function(v){return v.country_name==='United States'})||countries[0];country.value=String(preferred.country_code)}country.onchange=async function(){await loadNumberServices();await loadNumberCatalog()};service.onchange=loadNumberCatalog;var initialService=service.value;await Promise.all([loadNumberCatalog(),loadNumberServices()]);if(service.value!==initialService)await loadNumberCatalog()}
async function loadNumberServices(){var country=document.getElementById('country'),service=document.getElementById('service'),previous=service.value;service.disabled=true;service.innerHTML='<option>Loading services…</option>';var x=await req('wickspend/store/catalog/numbers?store_slug='+encodeURIComponent(slug)+'&country_code='+encodeURIComponent(country.value)),names={};(x.j.items||[]).forEach(function(v){var code=String(v.service_code||'').trim();if(code&&Number(v.available||v.count||0)>0&&!names[code])names[code]=v.service_name||code.toUpperCase()});var codes=Object.keys(names).sort(function(a,b){return String(names[a]).localeCompare(String(names[b]))});service.innerHTML=codes.length?codes.map(function(code){return '<option value="'+esc(code)+'">'+esc(names[code])+'</option>'}).join(''):'<option value="">No services available</option>';var preferred=codes.indexOf(previous)>=0?previous:(codes.indexOf('telegram')>=0?'telegram':(codes.indexOf('wa')>=0?'wa':codes[0]));if(preferred)service.value=preferred;service.disabled=!codes.length}
`;
const RENTAL_SAFE_CODES = new Set([
  "UNAUTHORIZED", "INVALID_OR_EXPIRED_SESSION", "INSUFFICIENT_BALANCE",
  "RENTALS_DISABLED", "SERVICE_DISABLED", "SERVICE_NOT_FOUND",
  "RENTAL_UNAVAILABLE", "NUMBER_UNAVAILABLE", "RENTAL_NOT_FOUND",
  "RENTAL_EXPIRED", "SMS_NOT_RECEIVED", "PROVIDER_TIMEOUT",
  "DUPLICATE_REQUEST", "STORE_NOT_FOUND", "STORE_UNAVAILABLE",
]);

function countryFlag(code: unknown) {
  const value = String(code || "").trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(value)) return "🌐";
  return String.fromCodePoint(...[...value].map(char => 127397 + char.charCodeAt(0)));
}

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
  const isRentalCatalog = safePath === "catalog/rentals";
  if (authorization && !isPasswordResetPath && !isRentalCatalog) headers.set("Authorization", authorization);
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
    cache: isRentalCatalog ? "force-cache" : "no-store",
    ...(isRentalCatalog ? { next: { revalidate: 20 } } : {}),
    redirect: "manual",
  });
  const responseHeaders = new Headers();
  for (const name of ["content-type", "cache-control", "location", "x-content-type-options", "referrer-policy", "content-security-policy"]) {
    const value = upstream.headers.get(name);
    if (value) responseHeaders.set(name, value);
  }
  if (!responseHeaders.has("Cache-Control")) responseHeaders.set("Cache-Control", "no-store");
  const upstreamBody = await upstream.arrayBuffer();
  const isRentalPath = safePath === "catalog/rentals" || safePath.startsWith("rentals/");
  if (isRentalPath && !upstream.ok) {
    let upstreamCode = "";
    try {
      const parsed = JSON.parse(new TextDecoder().decode(upstreamBody));
      upstreamCode = String(parsed?.code || parsed?.error || "").toUpperCase();
    } catch {}
    const code = RENTAL_SAFE_CODES.has(upstreamCode)
      ? upstreamCode
      : upstream.status === 401 ? "UNAUTHORIZED"
        : upstream.status === 402 ? "INSUFFICIENT_BALANCE"
          : upstream.status === 404 ? "RENTAL_NOT_FOUND"
            : upstream.status === 504 ? "PROVIDER_TIMEOUT"
              : "RENTAL_FAILED";
    responseHeaders.set("Content-Type", "application/json; charset=utf-8");
    return Response.json({ ok:false, code }, { status: upstream.status, headers: responseHeaders });
  }
  if (isRentalCatalog && upstream.ok) {
    try {
      const payload = JSON.parse(new TextDecoder().decode(upstreamBody)) as Record<string, any>;
      const source = Array.isArray(payload.services) ? payload.services : Array.isArray(payload.items) ? payload.items : [];
      const services = source.map((item:any) => ({
        service_code: String(item?.service_code || ""),
        service_name: String(item?.service_name || item?.service_code || "Service"),
        country_code: String(item?.country_code || item?.countries?.[0]?.country_code || ""),
        country_name: String(item?.country_name || item?.countries?.[0]?.country_name || ""),
        icon_url: item?.icon_url || undefined,
        available: item?.available !== false,
        periods: (Array.isArray(item?.periods) ? item.periods : Array.isArray(item?.countries?.[0]?.periods) ? item.countries[0].periods : []).map((period:any) => ({
          duration_minutes: Number(period?.duration_minutes || 0),
          duration_label: String(period?.duration_label || ""),
          price_ngn: Number(period?.price_ngn || 0),
          is_available: period?.is_available !== false,
        })).filter((period:any) => period.duration_minutes > 0),
      })).filter((item:any) => item.service_code);
      const countries = (Array.isArray(payload.countries) ? payload.countries : []).map((item:any) => ({
        country_code: String(item?.country_code || ""),
        country_name: String(item?.country_name || item?.country_code || ""),
        flag: String(item?.flag || countryFlag(item?.country_code)),
      })).filter((item:any) => item.country_code);
      responseHeaders.set("Content-Type", "application/json; charset=utf-8");
      responseHeaders.set("Cache-Control", "public, max-age=15, s-maxage=20, stale-while-revalidate=120");
      return Response.json({
        ok: payload.ok !== false,
        available: payload.available !== false,
        service_count: Number(payload.service_count || services.length),
        country_count: Number(payload.country_count || countries.length),
        services,
        countries,
      }, { status: upstream.status, headers: responseHeaders });
    } catch {
      // Preserve the provider response if the catalog shape changes unexpectedly.
    }
  }
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
      .replace(FUND_WALLET_OLD, FUND_WALLET_NEW)
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
