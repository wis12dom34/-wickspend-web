const UPSTREAM_BASE = "https://n8n.wickspend.com/webhook/wickspend/store/";
const NOTICE_START = "function note(m,e){var n=document.getElementById('notice');";
const DIALOG_NOTICE_START = "function note(m,e){var d=document.getElementById('authDialog'),n=document.getElementById('notice');if(d&&d.open){n=d.querySelector('.authNotice');if(!n){n=document.createElement('div');n.className='notice authNotice';d.prepend(n)}}";

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
  if (safePath === "app.js" && upstream.ok) {
    const script = new TextDecoder().decode(upstreamBody);
    const rewritten = script.replace(NOTICE_START, DIALOG_NOTICE_START);
    return new Response(rewritten, { status: upstream.status, headers: responseHeaders });
  }
  return new Response(upstreamBody, { status: upstream.status, headers: responseHeaders });
}

export async function GET(request: Request, context: ProxyContext) { return proxy(request, context); }
export async function POST(request: Request, context: ProxyContext) { return proxy(request, context); }
export async function PUT(request: Request, context: ProxyContext) { return proxy(request, context); }
export async function PATCH(request: Request, context: ProxyContext) { return proxy(request, context); }
export async function DELETE(request: Request, context: ProxyContext) { return proxy(request, context); }
