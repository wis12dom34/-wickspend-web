const API_V1_UPSTREAM = "https://n8n.wickspend.com/webhook/wickspend/api/v1/";
const DOCS_UPSTREAM = "https://n8n.wickspend.com/webhook/wickspend/api/docs";

type ProxyContext = { params: Promise<{ path: string[] }> };

export const dynamic = "force-dynamic";

function safeSegments(input: string[]) {
  return (Array.isArray(input) ? input : []).filter(Boolean).map((segment) => encodeURIComponent(segment));
}

async function proxy(request: Request, context: ProxyContext) {
  const { path } = await context.params;
  const segments = safeSegments(path);
  if (!segments.length) return new Response(JSON.stringify({ ok:false, code:"API_PATH_REQUIRED" }), { status:404, headers:{"Content-Type":"application/json; charset=utf-8"} });

  const incoming = new URL(request.url);
  const joined = segments.join("/");
  const isDocs = request.method === "GET" && joined === "docs";
  const upstreamUrl = isDocs ? DOCS_UPSTREAM : `${API_V1_UPSTREAM}${joined}${incoming.search}`;

  const headers = new Headers();
  for (const name of ["authorization","x-api-key","content-type","accept","idempotency-key"]) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  headers.set("X-Forwarded-Host", incoming.host);
  headers.set("X-Forwarded-Proto", "https");

  let body: ArrayBuffer | undefined;
  if (!["GET","HEAD"].includes(request.method)) {
    const buf = await request.arrayBuffer();
    if (buf.byteLength) body = buf;
  }

  const upstream = await fetch(upstreamUrl, { method:request.method, headers, body, cache:"no-store", redirect:"manual" });
  let responseBody = await upstream.arrayBuffer();
  const upstreamType = upstream.headers.get("content-type") || "application/json; charset=utf-8";

  if (isDocs && upstream.ok) {
    const text = new TextDecoder().decode(responseBody)
      .replaceAll("https://n8n.wickspend.com/webhook/wickspend/api/v1", "https://wickspend.com/api/v1")
      .replaceAll("/webhook/wickspend/api/v1/openapi.json", "/api/v1/openapi.json");
    responseBody = new TextEncoder().encode(text).buffer;
  } else if (request.method === "GET" && joined === "openapi.json" && upstream.ok) {
    try {
      const raw = new TextDecoder().decode(responseBody);
      const json = JSON.parse(raw);
      json.servers = [{ url:"https://wickspend.com/api/v1" }];
      responseBody = new TextEncoder().encode(JSON.stringify(json)).buffer;
    } catch {}
  }

  const out = new Headers();
  for (const name of ["content-type","cache-control","retry-after","x-content-type-options","referrer-policy"]) {
    const value = upstream.headers.get(name);
    if (value) out.set(name, value);
  }
  out.set("Content-Type", isDocs ? "text/html; charset=utf-8" : (out.get("content-type") || upstreamType));
  if (!out.has("Cache-Control")) out.set("Cache-Control", "no-store");
  if (!out.has("X-Content-Type-Options")) out.set("X-Content-Type-Options", "nosniff");
  if (!out.has("Referrer-Policy")) out.set("Referrer-Policy", "no-referrer");
  return new Response(responseBody, { status:upstream.status, headers:out });
}

export async function GET(request: Request, context: ProxyContext) { return proxy(request, context); }
export async function POST(request: Request, context: ProxyContext) { return proxy(request, context); }
export async function PUT(request: Request, context: ProxyContext) { return proxy(request, context); }
export async function PATCH(request: Request, context: ProxyContext) { return proxy(request, context); }
export async function DELETE(request: Request, context: ProxyContext) { return proxy(request, context); }
export async function HEAD(request: Request, context: ProxyContext) { return proxy(request, context); }