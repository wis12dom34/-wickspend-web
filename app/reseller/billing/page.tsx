"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import ResellerNav from "../ResellerNav";
import { ApiError, wickspendApi } from "@/lib/api";
import { getSessionToken } from "@/lib/session";

function money(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? `₦${n.toLocaleString("en-NG", { maximumFractionDigits: 2 })}` : "₦0";
}
function date(value: unknown) {
  if (!value) return "—";
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString(undefined,{year:"numeric",month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"});
}
function errorText(error: unknown) {
  if (error instanceof ApiError) return error.code || error.message;
  return error instanceof Error ? error.message : "Unable to load billing data.";
}

export default function ResellerBilling() {
  const router = useRouter();
  const [profile,setProfile] = useState<any>(null);
  const [plans,setPlans] = useState<any[]>([]);
  const [history,setHistory] = useState<any[]>([]);
  const [loading,setLoading] = useState(true);
  const [busy,setBusy] = useState(false);
  const [message,setMessage] = useState("");
  const [paymentReturn,setPaymentReturn] = useState(false);

  const load = useCallback(async () => {
    const token = getSessionToken();
    if (!token) { router.replace("/login"); return; }
    setLoading(true); setMessage("");
    try {
      const [p,pl,h] = await Promise.all([
        wickspendApi<any>("wickspend/backend/reseller/profile",{token}),
        wickspendApi<any>("wickspend/backend/reseller/plans"),
        wickspendApi<any>("wickspend/backend/reseller/subscription/history",{token}),
      ]);
      setProfile(p);
      setPlans(Array.isArray(pl?.items) ? pl.items : []);
      setHistory(Array.isArray(h?.items) ? h.items : []);
    } catch (error) {
      setMessage(errorText(error));
    } finally { setLoading(false); }
  },[router]);

  useEffect(()=>{ load(); },[load]);
  useEffect(()=>{
    if (typeof window === "undefined") return;
    const returned = new URLSearchParams(window.location.search).get("payment") === "return";
    if (!returned) return;
    setPaymentReturn(true);
    const first = window.setTimeout(()=>{ void load(); },3000);
    const second = window.setTimeout(()=>{ void load(); },8000);
    return ()=>{ window.clearTimeout(first); window.clearTimeout(second); };
  },[load]);

  async function subscribe(planCode:string,billingCycle:"monthly"|"annual") {
    const token=getSessionToken(); if(!token)return router.replace("/login");
    setBusy(true); setMessage("");
    try {
      const request_key = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `resub-${Date.now()}-${Math.random()}`;
      const result:any = await wickspendApi("wickspend/backend/reseller/subscription/initialize",{method:"POST",token,body:JSON.stringify({plan_code:planCode,billing_cycle:billingCycle,request_key})});
      if(result?.checkout_url){ window.location.assign(result.checkout_url); return; }
      if(result?.status === "active"){ setMessage("Subscription activated."); await load(); return; }
      setMessage("Checkout was created but no payment URL was returned.");
      await load();
    } catch(error){ setMessage(errorText(error)); }
    finally{ setBusy(false); }
  }

  const sub = profile?.subscription || {};
  const reseller = profile?.reseller || {};
  const currentPlan = reseller?.plan_code || "";
  const activePlan = useMemo(()=>plans.find((p:any)=>p.code===currentPlan),[plans,currentPlan]);
  const activeHistory = history.filter((x:any)=>x.status==="active");
  const paidTotal = activeHistory.reduce((sum:number,x:any)=>sum+Number(x.amount_ngn||0),0);

  return <main className="resellerShell">
    <ResellerNav/>
    <header className="resellerTopbar"><div><span className="eyebrow">Subscription</span><h1>Billing</h1><p>Manage your reseller plan and review subscription payments.</p></div><button className="secondaryButton" onClick={load}>Refresh</button></header>
    {paymentReturn&&<div className="resellerMessage success">Payment return received. WickSpend is checking KoraPay verification and will refresh your subscription status automatically.</div>}
    {message&&<div className="resellerMessage error">{message}</div>}
    {loading ? <div className="resellerLoading">Loading subscription billing…</div> : <>
      <section className="resellerStats">
        <article className="metricCard"><span>Current plan</span><strong>{activePlan?.name || currentPlan || "No plan"}</strong></article>
        <article className="metricCard"><span>Subscription</span><strong>{sub?.active ? "Active" : (sub?.status || "Inactive")}</strong></article>
        <article className="metricCard"><span>Expires</span><strong className="smallMetric">{date(sub?.expires_at)}</strong></article>
        <article className="metricCard"><span>Total paid</span><strong>{money(paidTotal)}</strong></article>
      </section>

      <section className="plansSection"><div className="sectionTitle"><div><span className="eyebrow">Available plans</span><h2>Choose a subscription</h2></div></div>
        {plans.length ? <div className="planGrid">{plans.map((p:any)=>{const monthly=p.monthly_enabled!==false&&p.monthly_price_ngn!=null;const annual=p.annual_enabled!==false&&p.annual_price_ngn!=null;return <article className="planCard" key={p.code}><div className="cardHead"><div><div className="planTitleRow"><h3>{p.name}</h3>{p.is_featured&&<span className="recommendedBadge">Recommended</span>}</div>{p.description&&<p className="planDescription">{p.description}</p>}</div>{currentPlan===p.code&&sub?.active&&<span className="status good">Current</span>}</div><div className="featureChips">{p.features?.api_access===true&&<span>API access</span>}{Number(p.features?.api_key_limit||0)>0&&<span>{Number(p.features.api_key_limit)} API key{Number(p.features.api_key_limit)===1?"":"s"}</span>}{p.features?.custom_domain===true&&<span>Custom domain{Number(p.features?.custom_domain_limit||0)>1?`s · ${p.features.custom_domain_limit}`:""}</span>}</div><div className="planPrices">{monthly&&<div><span>Monthly</span><b>{money(p.monthly_price_ngn)}</b><button disabled={busy} onClick={()=>subscribe(p.code,"monthly")}>{currentPlan===p.code&&sub?.active?"Renew monthly":"Choose monthly"}</button></div>}{annual&&<div><span>Annual</span><b>{money(p.annual_price_ngn)}</b><button disabled={busy} onClick={()=>subscribe(p.code,"annual")}>{currentPlan===p.code&&sub?.active?"Renew annual":"Choose annual"}</button></div>}</div></article>})}</div> : <div className="emptyState">No reseller plans are available yet. Your WickSpend administrator must configure and activate a plan first.</div>}
      </section>

      <section className="resellerCard billingHistory"><div className="cardHead"><div><span className="eyebrow">Payments</span><h2>Subscription history</h2></div><span className="status muted">{history.length} records</span></div>{history.length?<div className="tableWrap"><table><thead><tr><th>Reference</th><th>Plan</th><th>Cycle</th><th>Amount</th><th>Status</th><th>Started</th><th>Expires</th></tr></thead><tbody>{history.map((x:any)=><tr key={x.payment_reference}><td><b>{x.payment_reference}</b><small>{date(x.created_at)}</small></td><td>{x.plan_code}</td><td>{x.billing_cycle}</td><td>{money(x.amount_ngn)}</td><td><span className={`status ${x.status==="active"?"good":x.status==="pending"?"warn":"muted"}`}>{x.status}</span></td><td>{date(x.starts_at)}</td><td>{date(x.expires_at)}</td></tr>)}</tbody></table></div>:<div className="emptyState">No reseller subscription payments yet.</div>}</section>
    </>}
  </main>;
}
