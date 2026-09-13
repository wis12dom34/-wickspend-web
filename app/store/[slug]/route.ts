const STORE_APP_URL = "https://n8n.wickspend.com/webhook/wickspend/store/app";
const STORE_RESOLVE_URL = "https://n8n.wickspend.com/webhook/wickspend/store/resolve";
const APP_SCRIPT = '<script src="/webhook/wickspend/store/app.js"></script>';

type RouteContext = { params: Promise<{ slug: string }> };

export const dynamic = "force-dynamic";

function brandedPage(title: string, message: string, status: number) {
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>${title} · WickSpend</title><meta name="robots" content="noindex,nofollow"><style>*{box-sizing:border-box}body{margin:0;min-height:100dvh;background:#f6f7f9;color:#101114;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;display:grid;place-items:center;padding:22px}.box{width:min(100%,440px);background:#fff;border:1px solid #e5e7eb;border-radius:26px;padding:30px 24px;text-align:center;box-shadow:0 14px 45px rgba(0,0,0,.06)}.mark{width:54px;height:54px;border-radius:17px;background:#0866F5;color:#fff;display:grid;place-items:center;margin:0 auto 18px;font-weight:900;font-size:20px}.eyebrow{font-size:10px;text-transform:uppercase;letter-spacing:.12em;color:#68707d;font-weight:800}.box h1{font-size:27px;line-height:1.08;margin:8px 0 10px;letter-spacing:-.5px}.box p{font-size:13px;line-height:1.55;color:#68707d;margin:0 auto 20px;max-width:330px}.box a{display:inline-flex;min-height:44px;align-items:center;justify-content:center;border-radius:14px;padding:0 17px;background:#111;color:#fff;text-decoration:none;font-size:12px;font-weight:800}</style></head><body><main class="box"><div class="mark">W</div><span class="eyebrow">WickSpend Store</span><h1>${title}</h1><p>${message}</p><a href="https://wickspend.com">Go to WickSpend</a></main></body></html>`;
  return new Response(html, { status, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store, max-age=0", "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer" } });
}

export async function GET(_request: Request, context: RouteContext) {
  const { slug: rawSlug } = await context.params;
  const slug = String(rawSlug || "").trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9-]{1,46}[a-z0-9]$/.test(slug)) {
    return brandedPage("Store not found", "This WickSpend reseller store does not exist or the link is invalid.", 404);
  }

  let resolved = false;
  try {
    const check = await fetch(`${STORE_RESOLVE_URL}?slug=${encodeURIComponent(slug)}`, {
      cache: "no-store",
      redirect: "manual",
      headers: { Accept: "application/json", "X-Forwarded-Host": "wickspend.com" },
    });
    if (check.ok) {
      const payload = await check.json().catch(() => null) as { ok?: boolean } | null;
      resolved = payload?.ok === true;
    } else if (check.status === 404) {
      return brandedPage("Store unavailable", "This store is not available right now. Check the link or contact the store owner.", 404);
    } else if (check.status === 403 || check.status === 409) {
      return brandedPage("Store unavailable", "This reseller store is currently unavailable.", 404);
    }
  } catch {
    return brandedPage("Store temporarily unavailable", "We could not load this reseller store right now. Please try again shortly.", 503);
  }
  if (!resolved) return brandedPage("Store unavailable", "This reseller store is currently unavailable.", 404);

  const upstream = await fetch(`${STORE_APP_URL}?store=${encodeURIComponent(slug)}`, {
    cache: "no-store",
    redirect: "manual",
    headers: { "X-Forwarded-Host": "wickspend.com" },
  });
  const body = await upstream.text();
  if (!upstream.ok) {
    if (upstream.status === 404 || upstream.status === 403) return brandedPage("Store unavailable", "This reseller store is currently unavailable.", 404);
    return brandedPage("Store temporarily unavailable", "We could not load this reseller store right now. Please try again shortly.", 503);
  }

  const bootSlug = `<script>history.replaceState(null,'',location.pathname+'?store='+encodeURIComponent(${JSON.stringify(slug)}))</script>${APP_SCRIPT}<script>history.replaceState(null,'',location.pathname)</script>`;
  const html = body.includes(APP_SCRIPT) ? body.replace(APP_SCRIPT, bootSlug) : body;
  const headers = new Headers();
  for (const name of ["content-type", "content-security-policy", "x-content-type-options", "referrer-policy"]) {
    const value = upstream.headers.get(name);
    if (value) headers.set(name, value);
  }
  headers.set("Content-Type", headers.get("content-type") || "text/html; charset=utf-8");
  headers.set("Cache-Control", "no-store, max-age=0");
  return new Response(html, { status: 200, headers });
}
