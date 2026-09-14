const STORE_APP_URL = "https://n8n.wickspend.com/webhook/wickspend/store/app";
const STORE_RESOLVE_URL = "https://n8n.wickspend.com/webhook/wickspend/store/resolve";
const APP_SCRIPT = '<script src="/webhook/wickspend/store/app.js"></script>';
const MANUAL_FUNDING_CSS = `.manualTransferBtn{flex-basis:100%}.manualAccountDetails{display:grid;gap:7px;padding:15px;border:1px solid var(--line);border-radius:15px;background:#f8fafc}.manualAccountDetails .transferLabel{font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.08em}.manualAccountDetails strong{font-size:18px}.manualAccountDetails b{font-size:24px;letter-spacing:1.4px}.manualAccountDetails span{font-size:14px}.manualAccountDetails p{font-size:12px;line-height:1.5;color:var(--muted);margin:4px 0 0}.manualPaymentForm{display:grid;gap:8px;margin-top:12px}.manualHistoryRow{padding:13px 0;border-bottom:1px solid var(--line);display:grid;grid-template-columns:minmax(0,1fr) minmax(180px,.8fr);gap:12px}.manualHistoryRow:last-child{border-bottom:0}.manualHistoryRow b,.manualHistoryRow small{display:block}.manualHistoryRow small{font-size:10px;color:var(--muted);margin-top:5px;line-height:1.4}.manualHistoryRow>div:last-child{text-align:right}@media(max-width:520px){.manualHistoryRow{grid-template-columns:1fr}.manualHistoryRow>div:last-child{text-align:left}}`;
const MANUAL_FUNDING_BUTTON = '<button class="btn light manualTransferBtn" onclick="openManualFunding()">Manual Bank Transfer</button>';
const MANUAL_FUNDING_HISTORY = '<section class="section"><div class="row"><h2 class="grow" style="margin:0">Manual funding</h2><button class="btn light" onclick="loadManualFundingHistory()">Refresh</button></div><div id="manualFundingHistory" class="card" style="margin-top:12px"><div class="empty">Sign in to see manual funding requests.</div></div></section>';
const MANUAL_FUNDING_DIALOG = `<dialog id="manualFundingDialog"><div class="modal"><div class="row"><h2 class="grow">Manual Bank Transfer</h2><button class="btn light" onclick="document.getElementById('manualFundingDialog').close()">Close</button></div><div id="manualAccountDetails" class="manualAccountDetails"></div><button id="manualMadeButton" class="btn blue" style="width:100%;margin-top:12px" onclick="showManualPaymentForm()">I’ve Made Payment</button><div id="manualPaymentForm" class="manualPaymentForm hide"><input id="manualAmount" class="field" type="number" min="0.01" step="0.01" placeholder="Amount transferred"><input id="manualSender" class="field" placeholder="Sender / account name"><input id="manualBank" class="field" placeholder="Bank used"><input id="manualReference" class="field" placeholder="Transaction / reference ID (optional)"><label class="muted">Payment date and time<input id="manualPaymentTime" class="field" type="datetime-local" style="margin-top:5px"></label><button class="btn blue" style="width:100%" onclick="submitManualFunding()">Submit Payment</button></div></div></dialog>`;

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
  let body = await upstream.text();
  if (!upstream.ok) {
    if (upstream.status === 404 || upstream.status === 403) return brandedPage("Store unavailable", "This reseller store is currently unavailable.", 404);
    return brandedPage("Store temporarily unavailable", "We could not load this reseller store right now. Please try again shortly.", 503);
  }

  body = body
    .replace("</style>", `${MANUAL_FUNDING_CSS}</style>`)
    .replace('<button class="btn blue" onclick="fundWallet()">Add funds</button>', `<button class="btn blue" onclick="fundWallet()">Add funds</button>${MANUAL_FUNDING_BUTTON}`)
    .replace('<div class="footer">Powered by WickSpend</div>', `${MANUAL_FUNDING_HISTORY}<div class="footer">Powered by WickSpend</div>`)
    .replace('<dialog id="boostDialog">', `${MANUAL_FUNDING_DIALOG}<dialog id="boostDialog">`);
  const bootSlug = `<script>history.replaceState(null,'',location.pathname+'?store='+encodeURIComponent(${JSON.stringify(slug)}))</script>${APP_SCRIPT}<script>history.replaceState(null,'',location.pathname)</script>`;
  const html = body.includes(APP_SCRIPT) ? body.replace(APP_SCRIPT, bootSlug) : body;
  const headers = new Headers();
  for (const name of ["content-type", "content-security-policy", "x-content-type-options", "referrer-policy"]) {
    const value = upstream.headers.get(name);
    if (value) headers.set(name, value);
  }
  const contentSecurityPolicy = headers.get("content-security-policy");
  if (contentSecurityPolicy?.includes("sandbox") && !contentSecurityPolicy.includes("allow-same-origin")) {
    headers.set("Content-Security-Policy", contentSecurityPolicy.replace("sandbox", "sandbox allow-same-origin"));
  }
  headers.set("Content-Type", headers.get("content-type") || "text/html; charset=utf-8");
  headers.set("Cache-Control", "no-store, max-age=0");
  return new Response(html, { status: 200, headers });
}
