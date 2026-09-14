import { NUMBER_SERVICE_NAMES } from "@/lib/number-service-names";

const UPSTREAM_BASE = "https://n8n.wickspend.com/webhook/wickspend/store/";
const NOTICE_START = "function note(m,e){var n=document.getElementById('notice');";
const DIALOG_NOTICE_START = "function note(m,e){var d=document.getElementById('authDialog'),n=document.getElementById('notice');if(d&&d.open){n=d.querySelector('.authNotice');if(!n){n=document.createElement('div');n.className='notice authNotice';d.prepend(n)}}";
const DYNAMIC_NUMBER_FILTERS = `
async function loadNumberFilters(){var country=document.getElementById('country'),service=document.getElementById('service'),x=await req('wickspend/store/catalog/numbers?store_slug='+encodeURIComponent(slug)),countries=x.j.countries||[];if(x.j.ok&&countries.length){country.innerHTML=countries.map(function(v){return '<option value="'+esc(v.country_code)+'">'+esc((v.flag||'🌐')+' '+(v.country_name||v.iso_code||v.country_code))+'</option>'}).join('');var preferred=countries.find(function(v){return v.country_name==='United States'})||countries[0];country.value=String(preferred.country_code)}country.onchange=async function(){await loadNumberServices();await loadNumberCatalog()};service.onchange=loadNumberCatalog;await loadNumberServices()}
async function loadNumberServices(){var country=document.getElementById('country'),service=document.getElementById('service'),previous=service.value;service.disabled=true;service.innerHTML='<option>Loading services…</option>';var x=await req('wickspend/store/catalog/numbers?store_slug='+encodeURIComponent(slug)+'&country_code='+encodeURIComponent(country.value)),names={};(x.j.items||[]).forEach(function(v){var code=String(v.service_code||'').trim();if(code&&Number(v.available||v.count||0)>0&&!names[code])names[code]=v.service_name||code.toUpperCase()});var codes=Object.keys(names).sort(function(a,b){return String(names[a]).localeCompare(String(names[b]))});service.innerHTML=codes.length?codes.map(function(code){return '<option value="'+esc(code)+'">'+esc(names[code])+'</option>'}).join(''):'<option value="">No services available</option>';var preferred=codes.indexOf(previous)>=0?previous:(codes.indexOf('telegram')>=0?'telegram':(codes.indexOf('wa')>=0?'wa':codes[0]));if(preferred)service.value=preferred;service.disabled=!codes.length}
`;

type ProxyContext = { params: Promise<{ path: string[] }> };

export const dynamic = "force-dynamic";

async function proxy(request: Request, context: ProxyContext) {
  const { path } = await context.params;
  const safePath = (Array.isArray(path) ? path : []).map((segment) => encodeURIComponent(segment)).join("/");
  if (!safePath) return new Response("Not found", { status: 404 });

  const incoming = new URL(request.url);
  const upstreamUrl = `${UPSTREAM_BASE}${safePath}${incoming.search}`;
  const headers = new Headers();
  const authorization = request.headers.get("authorization");
  const contentType = request.headers.get("content-type");
  if (authorization) headers.set("Authorization", authorization);
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
      .replace("async function loadNumberCatalog(){", `${DYNAMIC_NUMBER_FILTERS}\nasync function loadNumberCatalog(){`)
      .replace(
        "await loadNumberCatalog()}\nasync function session",
        "await loadNumberFilters();await loadNumberCatalog()}\nasync function session",
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
