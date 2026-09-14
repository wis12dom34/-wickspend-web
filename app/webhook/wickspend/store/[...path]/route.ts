import { NUMBER_SERVICE_NAMES } from "@/lib/number-service-names";

const UPSTREAM_BASE = "https://n8n.wickspend.com/webhook/wickspend/store/";
const NOTICE_START = "function note(m,e){var n=document.getElementById('notice');";
const DIALOG_NOTICE_START = "function note(m,e){var d=document.querySelector('dialog[open]'),n=document.getElementById('notice');if(d){n=d.querySelector('.dialogNotice');if(!n){n=document.createElement('div');n.className='notice dialogNotice';d.prepend(n)}}";
const DYNAMIC_NUMBER_FILTERS = `
async function loadNumberFilters(){var country=document.getElementById('country'),service=document.getElementById('service'),x=await req('wickspend/store/catalog/numbers?store_slug='+encodeURIComponent(slug)),countries=x.j.countries||[];if(x.j.ok&&countries.length){country.innerHTML=countries.map(function(v){return '<option value="'+esc(v.country_code)+'">'+esc((v.flag||'🌐')+' '+(v.country_name||v.iso_code||v.country_code))+'</option>'}).join('');var preferred=countries.find(function(v){return v.country_name==='United States'})||countries[0];country.value=String(preferred.country_code)}country.onchange=async function(){await loadNumberServices();await loadNumberCatalog()};service.onchange=loadNumberCatalog;await loadNumberServices()}
async function loadNumberServices(){var country=document.getElementById('country'),service=document.getElementById('service'),previous=service.value;service.disabled=true;service.innerHTML='<option>Loading services…</option>';var x=await req('wickspend/store/catalog/numbers?store_slug='+encodeURIComponent(slug)+'&country_code='+encodeURIComponent(country.value)),names={};(x.j.items||[]).forEach(function(v){var code=String(v.service_code||'').trim();if(code&&Number(v.available||v.count||0)>0&&!names[code])names[code]=v.service_name||code.toUpperCase()});var codes=Object.keys(names).sort(function(a,b){return String(names[a]).localeCompare(String(names[b]))});service.innerHTML=codes.length?codes.map(function(code){return '<option value="'+esc(code)+'">'+esc(names[code])+'</option>'}).join(''):'<option value="">No services available</option>';var preferred=codes.indexOf(previous)>=0?previous:(codes.indexOf('telegram')>=0?'telegram':(codes.indexOf('wa')>=0?'wa':codes[0]));if(preferred)service.value=preferred;service.disabled=!codes.length}
`;

const MANUAL_FUNDING_SCRIPT = `
var manualFundingAccount=null;
async function openManualFunding(){if(!token)return openAuth();var x=await req('wickspend/store/manual-funding/account');var d=document.getElementById('manualFundingDialog'),details=document.getElementById('manualAccountDetails'),form=document.getElementById('manualPaymentForm'),made=document.getElementById('manualMadeButton');form.classList.add('hide');if(!x.j.ok||!x.j.available||!x.j.account){manualFundingAccount=null;details.innerHTML='<div class="empty">Manual bank transfer is currently unavailable for this store.</div>';made.classList.add('hide')}else{manualFundingAccount=x.j.account;details.innerHTML='<div class="transferLabel">Transfer to:</div><strong>'+esc(manualFundingAccount.bank_name)+'</strong><b>'+esc(manualFundingAccount.account_number)+'</b><span>'+esc(manualFundingAccount.account_name)+'</span><p>Important: Your wallet will be credited after your payment has been confirmed.</p><p>Manual transfers are reviewed by the store owner and may take up to 24 hours to reflect.</p>';made.classList.remove('hide')}d.showModal()}
function showManualPaymentForm(){document.getElementById('manualPaymentForm').classList.remove('hide');document.getElementById('manualMadeButton').classList.add('hide');var field=document.getElementById('manualPaymentTime');if(!field.value){var now=new Date(Date.now()-new Date().getTimezoneOffset()*60000);field.value=now.toISOString().slice(0,16)}}
async function submitManualFunding(){var amount=Number(document.getElementById('manualAmount').value||0),sender=document.getElementById('manualSender').value.trim(),bank=document.getElementById('manualBank').value.trim(),reference=document.getElementById('manualReference').value.trim(),when=document.getElementById('manualPaymentTime').value;if(!(amount>0))return note('Enter the amount transferred.',true);if(sender.length<2)return note('Enter the sender or account name.',true);if(bank.length<2)return note('Enter the bank used.',true);if(!when)return note('Enter the payment date and time.',true);var x=await req('wickspend/store/manual-funding/requests',{method:'POST',body:JSON.stringify({amount_ngn:amount,sender_name:sender,bank:bank,transaction_reference:reference,payment_date_time:new Date(when).toISOString(),request_key:'manual-submit-'+requestKey()})});if(!x.j.ok)return note(x.j.code||'Could not submit payment.',true);document.getElementById('manualFundingDialog').close();note('Payment submitted. The store owner will review it within 24 hours.');await loadManualFundingHistory()}
async function loadManualFundingHistory(){var box=document.getElementById('manualFundingHistory');if(!box)return;if(!token){box.innerHTML='<div class="empty">Sign in to see manual funding requests.</div>';return}var x=await req('wickspend/store/manual-funding/requests'),items=x.j.items||[];if(!x.j.ok||!items.length){box.innerHTML='<div class="empty">No manual funding requests yet.</div>';return}box.innerHTML=items.map(function(v){var status=String(v.status||'PENDING').toUpperCase(),message=status==='APPROVED'?'Payment confirmed. Your wallet has been credited.':status==='REJECTED'?'Payment could not be verified.':'Payment submitted. The store owner will review it within 24 hours.';return '<div class="manualHistoryRow"><div><b>Manual Funding — '+money(v.amount_ngn)+'</b><small>'+esc(v.reference||'')+' · '+new Date(v.submitted_at).toLocaleString()+'</small></div><div><span class="pill '+(status==='APPROVED'?'stock':'')+'">'+(status==='APPROVED'?'Successful':status.charAt(0)+status.slice(1).toLowerCase())+'</span><small>'+esc(message)+'</small></div></div>'}).join('')}
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
      .replace("async function fundWallet(){", `${MANUAL_FUNDING_SCRIPT}\nasync function fundWallet(){`)
      .replace(
        "await loadNumberCatalog()}\nasync function session",
        "await loadNumberFilters();await loadNumberCatalog()}\nasync function session",
      )
      .replace("await loadCurrentOrders()}\nfunction switchService", "await loadCurrentOrders();await loadManualFundingHistory()}\nfunction switchService")
      .replace("function setGuest(){", "function setGuest(){var mh=document.getElementById('manualFundingHistory');if(mh)mh.innerHTML='<div class=\"empty\">Sign in to see manual funding requests.</div>';");
    return new Response(rewritten, { status: upstream.status, headers: responseHeaders });
  }
  return new Response(upstreamBody, { status: upstream.status, headers: responseHeaders });
}

export async function GET(request: Request, context: ProxyContext) { return proxy(request, context); }
export async function POST(request: Request, context: ProxyContext) { return proxy(request, context); }
export async function PUT(request: Request, context: ProxyContext) { return proxy(request, context); }
export async function PATCH(request: Request, context: ProxyContext) { return proxy(request, context); }
export async function DELETE(request: Request, context: ProxyContext) { return proxy(request, context); }
