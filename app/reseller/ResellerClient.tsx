"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import ResellerNav from "./ResellerNav";
import { ApiError, wickspendApi } from "@/lib/api";
import { getSessionToken } from "@/lib/session";

type Mode = "loading" | "ready" | "not-enrolled" | "error";
type BillingCycle = "monthly" | "six_months" | "annual";

function money(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? `₦${n.toLocaleString("en-NG", { maximumFractionDigits: 2 })}` : "₦0";
}
function date(value: unknown) {
  if (!value) return "—";
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}
function billingOptions(plan:any):Array<{cycle:BillingCycle;label:string;price:unknown}> {
  const options:Array<{cycle:BillingCycle;label:string;price:unknown}>=[];
  if(plan?.monthly_enabled!==false&&plan?.monthly_price_ngn!=null) options.push({cycle:"monthly",label:"Monthly",price:plan.monthly_price_ngn});
  if(plan?.six_month_enabled===true&&plan?.six_month_price_ngn!=null) options.push({cycle:"six_months",label:"6 Months",price:plan.six_month_price_ngn});
  if(plan?.annual_enabled!==false&&plan?.annual_price_ngn!=null) options.push({cycle:"annual",label:"Yearly",price:plan.annual_price_ngn});
  return options;
}
function codeMessage(code?: string) {
  const map: Record<string,string> = {
    INVALID_STORE_NAME: "Enter a store name between 2 and 80 characters.",
    INVALID_STORE_SLUG: "Use a store URL name between 3 and 48 characters.",
    SLUG_RESERVED: "That store URL name is reserved.",
    SLUG_TAKEN: "That store URL name is already in use.",
    RATE_LIMITED: "Too many requests. Try again shortly.",
  };
  return map[code || ""] || "Could not complete that request.";
}

export default function ResellerDashboard() {
  const router = useRouter();
  const [mode,setMode] = useState<Mode>("loading");
  const [dashboard,setDashboard] = useState<any>(null);
  const [profile,setProfile] = useState<any>(null);
  const [plans,setPlans] = useState<any[]>([]);
  const [message,setMessage] = useState("");
  const [storeName,setStoreName] = useState("");
  const [storeSlug,setStoreSlug] = useState("");
  const [busy,setBusy] = useState(false);

  const load = useCallback(async () => {
    const token = getSessionToken();
    setMode("loading"); setMessage("");
    const planPromise = wickspendApi<any>("wickspend/backend/reseller/plans").catch(() => ({ items: [] }));
    if (!token) { const pl = await planPromise; setPlans(Array.isArray(pl?.items) ? pl.items : []); setMode("not-enrolled"); return; }
    try {
      const [d,p,pl] = await Promise.all([
        wickspendApi<any>("wickspend/backend/reseller/dashboard",{token}),
        wickspendApi<any>("wickspend/backend/reseller/profile",{token}),
        planPromise,
      ]);
      setDashboard(d); setProfile(p); setPlans(Array.isArray(pl?.items) ? pl.items : []); setMode("ready");
    } catch (error) {
      const pl = await planPromise; setPlans(Array.isArray(pl?.items) ? pl.items : []);
      if (error instanceof ApiError && error.code === "NOT_ENROLLED") { setMode("not-enrolled"); return; }
      setMessage(error instanceof Error ? error.message : "Unable to load reseller dashboard."); setMode("error");
    }
  },[router]);

  useEffect(() => { load(); },[load]);

  async function enroll() {
    const token = getSessionToken(); if (!token) return router.replace("/login");
    setBusy(true); setMessage("");
    try {
      await wickspendApi("wickspend/backend/reseller/enroll",{method:"POST",token,body:JSON.stringify({store_name:storeName,store_slug:storeSlug})});
      await load();
    } catch (error) {
      setMessage(error instanceof ApiError ? codeMessage(error.code) : error instanceof Error ? error.message : "Could not create reseller account.");
    } finally { setBusy(false); }
  }

  async function subscribe(_planCode:string,_billingCycle:BillingCycle) {
    const token=getSessionToken();
    if(!token)return router.replace("/login");
    router.push("/reseller/billing");
  }

  const metrics = dashboard?.metrics || {};
  const store = profile?.store || dashboard?.store || {};
  const domain = profile?.domain || dashboard?.domain || {};
  const subscription = profile?.subscription || dashboard?.subscription || {};
  const hostedStoreUrl = store?.slug ? `https://wickspend.com/store/${encodeURIComponent(store.slug)}` : null;
  const storeUrl = domain?.activation_ready && store?.custom_domain_url ? store.custom_domain_url : hostedStoreUrl || store?.preview_url || dashboard?.store?.preview_url;
  const recent = Array.isArray(dashboard?.recent_orders) ? dashboard.recent_orders : [];
  const statusClass = subscription?.active ? "good" : subscription?.status === "pending" ? "warn" : "muted";
  const planCards = useMemo(() => plans.filter(Boolean),[plans]);

  if (mode === "loading") return <main className="resellerShell"><ResellerNav/><section className="resellerHero onboardingHero"><div><span className="eyebrow">WickSpend Reseller</span><h1>Build and manage a WickSpend-powered Mini Store.</h1><p>Sell supported WickSpend services through your own storefront, manage customers and orders, and use reseller API, Mini Store and custom-domain features with any active subscription.</p></div></section><section className="seoContent"><h2>Reseller features</h2><p>WickSpend Reseller uses the existing Mini Store, customer, wallet, order, pricing-rule and subscription systems. Plan availability and pricing are loaded from the current Admin-managed configuration rather than hard-coded here.</p><nav className="seoRelatedLinks"><a href="/tutorials">View tutorials</a><a href="/">WickSpend home</a></nav></section><div className="resellerLoading">Checking reseller workspace…</div></main>;

  if (mode === "not-enrolled") return (
    <main className="resellerShell">
      <ResellerNav/>
      <section className="resellerHero onboardingHero">
        <div><span className="eyebrow">WickSpend Reseller</span><h1>Launch your own digital-services store.</h1><p>Use WickSpend infrastructure for numbers, Marketplace and Boostly while you control your brand and selling price.</p></div>
      </section>
      {message && <div className="resellerMessage error">{message}</div>}
      <section className="resellerCard enrollmentCard">
        <div><h2>Create reseller workspace</h2><p className="subtle">Your store starts disabled. Activate a subscription before launching it publicly.</p></div>
        <label>Store name<input value={storeName} onChange={e=>setStoreName(e.target.value)} placeholder="My Store" maxLength={80}/></label>
        <label>Store URL name<input value={storeSlug} onChange={e=>setStoreSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]+/g,"-"))} placeholder="my-store" maxLength={48}/></label>
        <div className="slugPreview">Preview: https://wickspend.com/store/{storeSlug || "my-store"}</div>
        <button className="primaryButton" disabled={busy || storeName.trim().length<2 || storeSlug.trim().length<3} onClick={enroll}>{busy ? "Creating…" : "Create reseller workspace"}</button>
      </section>
      <Plans plans={planCards} busy={busy} canRenew={false} onSubscribe={subscribe}/>
    </main>
  );

  if (mode === "error") return <main className="resellerShell"><ResellerNav/><div className="resellerMessage error">{message || "Unable to load reseller dashboard."}</div><button className="primaryButton" onClick={load}>Try again</button></main>;

  return (
    <main className="resellerShell">
      <ResellerNav/>
      <header className="resellerTopbar"><div><span className="eyebrow">Reseller Center</span><h1>{store?.store_name || "Your reseller business"}</h1><p>Manage sales, customers and your storefront from one place.</p></div><div className="topbarActions">{storeUrl && <a className="secondaryButton" href={storeUrl} target="_blank" rel="noreferrer">Open store</a>}<button className="primaryButton compact" onClick={load}>Refresh</button></div></header>
      {message && <div className="resellerMessage error">{message}</div>}
      <section className="resellerCard launchChecklist">
        <div className="cardHead"><div><span className="eyebrow">Launch checklist</span><h2>Get your store ready</h2></div><span className={`status ${profile?.can_launch_store ? "good" : "warn"}`}>{profile?.can_launch_store ? "Ready" : "Setup needed"}</span></div>
        <div className="checklistRows">
          <Link href="/reseller/billing" className={`checklistRow ${subscription?.active ? "done" : ""}`}><span className="checkDot">{subscription?.active ? "✓" : "1"}</span><span><b>Active reseller subscription</b><small>{subscription?.active ? `Active until ${date(subscription?.expires_at)}` : "Choose an active plan before launching."}</small></span><i>›</i></Link>
          <Link href="/reseller/store" className={`checklistRow ${store?.enabled ? "done" : ""}`}><span className="checkDot">{store?.enabled ? "✓" : "2"}</span><span><b>Enable your storefront</b><small>{store?.enabled ? "Storefront is enabled." : "Finish branding and enable the storefront."}</small></span><i>›</i></Link>
          <Link href="/reseller/store" className={`checklistRow ${store?.slug ? "done" : ""}`}><span className="checkDot">{store?.slug ? "✓" : "3"}</span><span><b>Clean WickSpend store URL</b><small>{store?.slug ? `wickspend.com/store/${store.slug}` : "Choose your store URL name."}</small></span><i>›</i></Link>
          <Link href="/reseller/store" className="checklistRow optional"><span className="checkDot">+</span><span><b>Custom pricing <em>Optional</em></b><small>Add markup or fixed retail rules. Without a rule, WickSpend base pricing remains the floor.</small></span><i>›</i></Link>
          <Link href="/reseller/developer" className="checklistRow optional"><span className="checkDot">+</span><span><b>API integration <em>Optional</em></b><small>Use API keys if you already have your own website or backend.</small></span><i>›</i></Link>
          <Link href="/reseller/store" className={`checklistRow optional ${domain?.activation_ready ? "done" : ""}`}><span className="checkDot">{domain?.activation_ready ? "✓" : "+"}</span><span><b>Custom domain <em>Optional</em></b><small>{domain?.activation_ready ? "Custom domain is live." : "Verify a domain when your plan includes custom domains."}</small></span><i>›</i></Link>
        </div>
      </section>
      <section className="resellerStats">
        <Metric label="Gross sales" value={money(metrics.gross_sales_ngn)}/>
        <Metric label="Earned profit" value={money(metrics.earned_profit_ngn)}/>
        <Metric label="Customers" value={String(metrics.customers ?? 0)}/>
        <Metric label="Orders" value={String(metrics.total_orders ?? 0)}/>
      </section>
      <section className="resellerGrid two">
        <article className="resellerCard"><div className="cardHead"><div><span className="eyebrow">Store</span><h2>{store?.store_name || "Store setup"}</h2></div><span className={`status ${store?.enabled ? "good" : "muted"}`}>{store?.enabled ? "Enabled" : "Disabled"}</span></div><dl className="detailList"><div><dt>Slug</dt><dd>{store?.slug || "—"}</dd></div><div><dt>Custom domain</dt><dd>{store?.custom_domain || "Not connected"}</dd></div><div><dt>Domain</dt><dd>{domain?.domain_status || store?.domain_status || "none"}</dd></div><div><dt>Routing / TLS</dt><dd>{domain?.routing_status || "not configured"} / {domain?.ssl_status || "not configured"}</dd></div></dl>{storeUrl && <a className="textLink" href={storeUrl} target="_blank" rel="noreferrer">Preview storefront →</a>}</article>
        <article className="resellerCard"><div className="cardHead"><div><span className="eyebrow">Subscription</span><h2>{profile?.reseller?.plan_code || "No active plan"}</h2></div><span className={`status ${statusClass}`}>{subscription?.status || "inactive"}</span></div><dl className="detailList"><div><dt>Active</dt><dd>{subscription?.active ? "Yes" : "No"}</dd></div><div><dt>Expires</dt><dd>{date(subscription?.expires_at)}</dd></div><div><dt>Store launch</dt><dd>{profile?.can_launch_store ? "Ready" : "Not ready"}</dd></div></dl><Link className="textLink" href="/reseller/billing">Manage subscription & billing →</Link></article>
      </section>
      <section className="resellerGrid three">
        <Link className="resellerAction" href="/reseller/orders"><b>Orders</b><span>{metrics.total_orders ?? 0} total</span><small>Numbers, Marketplace and Boostly →</small></Link>
        <Link className="resellerAction" href="/reseller/customers"><b>Customers</b><span>{metrics.active_customers ?? 0} active</span><small>Wallets, spend and activity →</small></Link>
        <div className="resellerAction"><b>Profit</b><span>{money(metrics.earned_profit_ngn)}</span><small>{money(metrics.settled_profit_ngn)} settled</small></div>
      </section>
      <section className="resellerCard"><div className="cardHead"><div><span className="eyebrow">Recent orders</span><h2>Latest activity</h2></div><Link className="textLink" href="/reseller/orders">View all →</Link></div>{recent.length ? <div className="tableWrap"><table><thead><tr><th>Order</th><th>Customer</th><th>Type</th><th>Amount</th><th>Profit</th><th>Status</th></tr></thead><tbody>{recent.map((o:any)=><tr key={o.reference}><td><b>{o.product_name || o.reference}</b><small>{o.reference}</small></td><td>{o.full_name || o.email || "Customer"}</td><td>{o.product_type}</td><td>{money(o.sale_amount_ngn)}</td><td>{money(o.reseller_profit_ngn)}</td><td><span className="status muted">{o.status}</span></td></tr>)}</tbody></table></div> : <div className="emptyState">No reseller orders yet.</div>}</section>
      <Plans plans={planCards} busy={busy} canRenew={Boolean(subscription?.active || subscription?.started_at || subscription?.expires_at)} onSubscribe={subscribe}/>
    </main>
  );
}

function Metric({label,value}:{label:string;value:string}) { return <article className="metricCard"><span>{label}</span><strong>{value}</strong></article>; }
function Plans({plans,busy,canRenew,onSubscribe}:{plans:any[];busy:boolean;canRenew:boolean;onSubscribe:(code:string,cycle:BillingCycle)=>void}) {
  const p=plans.find((plan:any)=>plan?.is_featured)||plans[0];
  if(!p) return <section className="plansSection"><div className="emptyState">Reseller subscription pricing is not configured yet.</div></section>;
  const pricingReady=p.monthly_enabled===true&&p.six_month_enabled===true&&p.annual_enabled===true&&p.monthly_price_ngn!=null&&p.six_month_price_ngn!=null&&p.annual_price_ngn!=null;
  if(!pricingReady) return <section className="plansSection"><div className="emptyState">Reseller subscription pricing is not fully configured yet.</div></section>;
  const monthly=Number(p.monthly_price_ngn);
  const sixMonths=Number(p.six_month_price_ngn);
  const annual=Number(p.annual_price_ngn);
  if(![monthly,sixMonths,annual].every(value=>Number.isFinite(value)&&value>=0)) return <section className="plansSection"><div className="emptyState">Reseller subscription pricing is invalid. Contact support.</div></section>;
  const choices=[
    {cycle:"monthly" as BillingCycle,title:"1 Month",price:monthly,normal:monthly,monthly,description:"Perfect for new resellers who want to start small."},
    {cycle:"six_months" as BillingCycle,title:"6 Months",price:sixMonths,normal:monthly*6,monthly:sixMonths/6,badge:"MOST POPULAR",description:"Best balance between affordability and long-term value."},
    {cycle:"annual" as BillingCycle,title:"1 Year",price:annual,normal:monthly*12,monthly:annual/12,badge:"BEST SAVINGS",description:"Best for serious resellers who want the lowest monthly cost."},
  ];
  return <section className="plansSection">
    <div className="sectionTitle"><div><span className="eyebrow">Simple pricing</span><h2>One subscription. Full reseller access.</h2><p className="subtle">All plans include the same reseller features. You only choose your subscription duration.</p></div></div>
    <div className="subscriptionPlanGrid">{choices.map(choice=>{
      const saving=Math.max(0,choice.normal-choice.price);
      const percent=choice.normal>0?Math.round((saving/choice.normal)*100):0;
      return <article className={`subscriptionPlanCard ${choice.cycle==="six_months"?"popular":""}`} key={choice.cycle}>
        {choice.badge&&<span className={`planBadge ${choice.cycle==="six_months"?"popularBadge":""}`}>{choice.badge}</span>}
        <div className="subscriptionPlanHead"><h3>{choice.title}</h3><p>{choice.description}</p></div>
        <div className="subscriptionPrice">{saving>0&&<span className="normalPrice">{money(choice.normal)}</span>}<strong>{money(choice.price)}</strong><small>{money(choice.monthly)}/month</small></div>
        <div className={`savingLine ${saving===0?"neutral":""}`}>{saving>0?`You save ${money(saving)} — ${percent}%`:"Pay month-to-month"}</div>
        <button className="planSubscribeButton" disabled={busy} onClick={()=>onSubscribe(p.code,choice.cycle)}>{canRenew?"Renew Subscription":`Choose ${choice.title}`}</button>
      </article>;
    })}</div>
    <div className="featureChips"><span>API access</span><span>Mini Store</span><span>Personal reseller website</span><span>Admin dashboard</span><span>Website customization</span><span>Branding</span><span>Products & customers</span><span>Orders & tracking</span><span>Wallet integration</span><span>Support</span></div>
  </section>;
}
