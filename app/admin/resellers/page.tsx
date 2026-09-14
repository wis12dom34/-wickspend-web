"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ApiError, wickspendApi } from "@/lib/api";
import { getSessionToken } from "@/lib/session";
import styles from "./resellers.module.css";

type Tab = "overview" | "plans" | "accounts" | "domains";
type PlanForm = { code:string; name:string; monthly:string; annual:string; api_access:boolean; api_key_limit:string; custom_domain:boolean; is_active:boolean };
const blankPlan:PlanForm={code:"",name:"",monthly:"",annual:"",api_access:false,api_key_limit:"1",custom_domain:false,is_active:false};
const money=(v:unknown)=>`₦${Number(v||0).toLocaleString("en-NG",{maximumFractionDigits:2})}`;
const date=(v:unknown)=>{if(!v)return "—";const d=new Date(String(v));return Number.isNaN(d.getTime())?"—":d.toLocaleString()};

async function adminApi<T=any>(path:string,init:RequestInit={}){
 const token=getSessionToken();
 if(!token)throw new Error("Please sign in with the WickSpend admin account.");
 return wickspendApi<T>(path,{...init,token,preserveSessionOn401:true});
}
function errorText(e:unknown){return e instanceof ApiError?(e.code||e.message):e instanceof Error?e.message:"Request failed."}

export default function AdminResellersPage(){
 const[tab,setTab]=useState<Tab>("overview");
 const[loading,setLoading]=useState(true),[busy,setBusy]=useState(""),[message,setMessage]=useState("");
 const[overview,setOverview]=useState<any>(null),[plans,setPlans]=useState<any[]>([]),[accounts,setAccounts]=useState<any[]>([]),[domains,setDomains]=useState<any[]>([]),[domainStats,setDomainStats]=useState<any>({});
 const[query,setQuery]=useState(""),[domainFilter,setDomainFilter]=useState("all"),[plan,setPlan]=useState<PlanForm>(blankPlan);

 const load=useCallback(async()=>{
   setLoading(true);setMessage("");
   try{
    const [o,p,a,d]=await Promise.all([
      adminApi("wickspend/backend/admin/reseller/overview"),
      adminApi("wickspend/backend/admin/reseller/plans"),
      adminApi(`wickspend/backend/admin/reseller/accounts?q=${encodeURIComponent(query)}`),
      adminApi(`wickspend/backend/admin/reseller/domains/readiness?status=${encodeURIComponent(domainFilter)}`),
    ]);
    setOverview(o);setPlans(Array.isArray(p?.items)?p.items:[]);setAccounts(Array.isArray(a?.items)?a.items:[]);setDomains(Array.isArray(d?.items)?d.items:[]);setDomainStats(d?.stats||{});
   }catch(e){setMessage(errorText(e))}finally{setLoading(false)}
 },[query,domainFilter]);
 useEffect(()=>{void load()},[load]);

 const totals=useMemo(()=>({resellers:Number(overview?.resellers?.total_resellers||0),active:Number(overview?.resellers?.active_resellers||0),stores:Number(overview?.resellers?.live_stores||0),customers:Number(overview?.customers?.total_customers||0),orders:Number(overview?.store_sales?.total_store_orders||0),sales:Number(overview?.store_sales?.gross_sales_ngn||0),subscriptions:Number(overview?.subscriptions?.subscription_revenue_ngn||0),profit:Number(overview?.earnings?.available_profit_ngn||0)}),[overview]);

 function editPlan(p:any){setTab("plans");setPlan({code:String(p.code||""),name:String(p.name||""),monthly:p.monthly_price_ngn==null?"":String(p.monthly_price_ngn),annual:p.annual_price_ngn==null?"":String(p.annual_price_ngn),api_access:Boolean(p.features?.api_access),api_key_limit:String(p.features?.api_key_limit||1),custom_domain:Boolean(p.features?.custom_domain),is_active:Boolean(p.is_active)});window.scrollTo({top:0,behavior:"smooth"})}
 async function savePlan(){
   const code=plan.code.trim().toLowerCase();const name=plan.name.trim();
   if(code.length<2||name.length<2){setMessage("Plan code and name are required.");return}
   if(plan.is_active&&!plan.monthly&&!plan.annual){setMessage("An active plan needs a monthly or annual price.");return}
   setBusy("plan");setMessage("");
   try{
    const features={api_access:plan.api_access,api_key_limit:Math.max(1,Math.min(20,Number(plan.api_key_limit||1))),custom_domain:plan.custom_domain};
    await adminApi("wickspend/backend/admin/reseller/plans",{method:"POST",body:JSON.stringify({code,name,monthly_price_ngn:plan.monthly===""?null:Number(plan.monthly),annual_price_ngn:plan.annual===""?null:Number(plan.annual),features,is_active:plan.is_active})});
    setMessage("Plan saved.");setPlan(blankPlan);await load();
   }catch(e){setMessage(errorText(e))}finally{setBusy("")}
 }
 async function changeResellerStatus(r:any){
   const next=r.status==="suspended"?"active":"suspended";
   if(!confirm(`${next==="suspended"?"Suspend":"Reactivate"} reseller ${r.store_name||r.email}? This changes reseller access but does not alter balances, orders or subscription records.`))return;
   setBusy(`reseller-${r.reseller_id}`);setMessage("");
   try{await adminApi("wickspend/backend/admin/reseller/status",{method:"POST",body:JSON.stringify({reseller_id:r.reseller_id,status:next})});setMessage(`Reseller ${next}.`);await load()}catch(e){setMessage(errorText(e))}finally{setBusy("")}
 }
 async function activateDomain(d:any,action:"activate"|"deactivate"){
   if(!confirm(`${action==="activate"?"Activate":"Take offline"} custom domain ${d.domain}?`))return;
   setBusy(`domain-${d.reseller_id}`);setMessage("");
   try{await adminApi("wickspend/backend/admin/reseller/domain/activation",{method:"POST",body:JSON.stringify({reseller_id:d.reseller_id,domain:d.domain,action,request_key:`admin-domain-${Date.now()}-${d.reseller_id}`,reason:action==="activate"?"Admin activation after verified routing/TLS":"Admin deactivation"})});setMessage(`Domain ${action} request applied.`);await load()}catch(e){setMessage(errorText(e))}finally{setBusy("")}
 }

 return <main className={styles.page}><div className={styles.shell}>
   <header className={styles.header}><Link className={styles.back} href="/admin/menu">‹</Link><div><span>WickSpend Admin</span><h1>Reseller Control Center</h1><p>Plans, accounts, revenue and custom-domain readiness.</p></div><button className={styles.refresh} onClick={()=>void load()} disabled={loading}>{loading?"Loading…":"Refresh"}</button></header>
   <nav className={styles.tabs}>{(["overview","plans","accounts","domains"] as Tab[]).map(t=><button key={t} className={tab===t?styles.tabActive:styles.tab} onClick={()=>setTab(t)}>{t}</button>)}</nav>
   {message&&<div className={message.includes("saved")||message.includes("active")||message.includes("applied")||message.includes("suspended")?styles.success:styles.error}>{message}</div>}
   {tab==="overview"&&<Overview totals={totals} overview={overview} loading={loading}/>}
   {tab==="plans"&&<Plans plans={plans} plan={plan} setPlan={setPlan} savePlan={savePlan} editPlan={editPlan} busy={busy}/>}
   {tab==="accounts"&&<Accounts accounts={accounts} query={query} setQuery={setQuery} load={load} changeStatus={changeResellerStatus} busy={busy}/>}
   {tab==="domains"&&<Domains items={domains} stats={domainStats} filter={domainFilter} setFilter={setDomainFilter} activate={activateDomain} busy={busy}/>}
 </div></main>
}

function Overview({totals,overview,loading}:{totals:any;overview:any;loading:boolean}){
 if(loading&&!overview)return <div className={styles.empty}>Loading reseller analytics…</div>;
 return <><section className={styles.metrics}><Metric label="Resellers" value={totals.resellers}/><Metric label="Active" value={totals.active}/><Metric label="Live stores" value={totals.stores}/><Metric label="Customers" value={totals.customers}/><Metric label="Store orders" value={totals.orders}/><Metric label="Gross store sales" value={money(totals.sales)}/><Metric label="Subscription revenue" value={money(totals.subscriptions)}/><Metric label="Available reseller profit" value={money(totals.profit)}/></section><section className={styles.grid2}><article className={styles.card}><h2>Product orders</h2><Row label="Numbers" value={overview?.store_sales?.number_orders||0}/><Row label="Marketplace" value={overview?.store_sales?.marketplace_orders||0}/><Row label="Boostly" value={overview?.store_sales?.boostly_orders||0}/><Row label="Provider pending" value={overview?.store_sales?.provider_pending_orders||0}/><Row label="Refunded" value={overview?.store_sales?.refunded_store_orders||0}/></article><article className={styles.card}><h2>Domains & API</h2><Row label="Ownership verified" value={overview?.resellers?.ownership_verified_domains||0}/><Row label="Pending domain activation" value={overview?.resellers?.pending_domain_activation||0}/><Row label="Verified/live domains" value={overview?.resellers?.verified_domains||0}/><Row label="API sales" value={money(overview?.api_sales?.api_sales_ngn)}/><Row label="API orders" value={overview?.api_sales?.total_api_orders||0}/></article></section></>
}
function Metric({label,value}:{label:string;value:any}){return <article className={styles.metric}><span>{label}</span><strong>{value}</strong></article>}
function Row({label,value}:{label:string;value:any}){return <div className={styles.row}><span>{label}</span><b>{value}</b></div>}

function Plans({plans,plan,setPlan,savePlan,editPlan,busy}:{plans:any[];plan:PlanForm;setPlan:(p:PlanForm)=>void;savePlan:()=>void;editPlan:(p:any)=>void;busy:string}){
 return <><section className={styles.card}><div className={styles.cardHead}><div><span className={styles.eyebrow}>Plan editor</span><h2>{plan.code?`Edit ${plan.code}`:"Create reseller plan"}</h2></div>{plan.code&&<button className={styles.secondary} onClick={()=>setPlan(blankPlan)}>New plan</button>}</div><div className={styles.formGrid}><label>Plan code<input value={plan.code} disabled={Boolean(plans.find(p=>p.code===plan.code))} onChange={e=>setPlan({...plan,code:e.target.value.toLowerCase().replace(/[^a-z0-9_-]+/g,"-")})} placeholder="pro"/></label><label>Plan name<input value={plan.name} onChange={e=>setPlan({...plan,name:e.target.value})} placeholder="Pro"/></label><label>Monthly price (NGN)<input type="number" min="0" value={plan.monthly} onChange={e=>setPlan({...plan,monthly:e.target.value})} placeholder="Leave blank until decided"/></label><label>Annual price (NGN)<input type="number" min="0" value={plan.annual} onChange={e=>setPlan({...plan,annual:e.target.value})} placeholder="Leave blank until decided"/></label><label>API key limit<input type="number" min="1" max="20" value={plan.api_key_limit} onChange={e=>setPlan({...plan,api_key_limit:e.target.value})}/></label><div className={styles.checks}><label><input type="checkbox" checked={plan.api_access} onChange={e=>setPlan({...plan,api_access:e.target.checked})}/> API access</label><label><input type="checkbox" checked={plan.custom_domain} onChange={e=>setPlan({...plan,custom_domain:e.target.checked})}/> Custom domains</label><label><input type="checkbox" checked={plan.is_active} onChange={e=>setPlan({...plan,is_active:e.target.checked})}/> Public/active plan</label></div></div><p className={styles.help}>No prices are pre-filled. An active plan must have at least one price. API access and custom domains remain disabled unless explicitly enabled here.</p><button className={styles.primary} disabled={busy==="plan"} onClick={savePlan}>{busy==="plan"?"Saving…":"Save plan"}</button></section><section className={styles.card}><div className={styles.cardHead}><div><span className={styles.eyebrow}>Configured plans</span><h2>{plans.length} plans</h2></div></div>{plans.length?<div className={styles.planGrid}>{plans.map(p=><button key={p.code} className={styles.planCard} onClick={()=>editPlan(p)}><div><b>{p.name}</b><small>{p.code}</small></div><span className={p.is_active?styles.good:styles.muted}>{p.is_active?"Active":"Inactive"}</span><strong>{p.monthly_price_ngn==null?"No monthly":`${money(p.monthly_price_ngn)}/mo`}</strong><small>{p.annual_price_ngn==null?"No annual":`${money(p.annual_price_ngn)}/yr`}</small><div className={styles.featureLine}><span>API {p.features?.api_access?"✓":"—"}</span><span>Keys {p.features?.api_key_limit||1}</span><span>Domain {p.features?.custom_domain?"✓":"—"}</span></div></button>)}</div>:<div className={styles.empty}>No reseller plans configured yet. Create one above when you have decided the prices.</div>}</section></>
}

function Accounts({accounts,query,setQuery,load,changeStatus,busy}:{accounts:any[];query:string;setQuery:(s:string)=>void;load:()=>Promise<void>;changeStatus:(r:any)=>void;busy:string}){
 return <><section className={styles.toolbar}><input value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")void load()}} placeholder="Search reseller, email, store, slug or domain"/><button className={styles.secondary} onClick={()=>void load()}>Search</button></section><section className={styles.list}>{accounts.map(r=><article className={styles.account} key={r.reseller_id}><div className={styles.accountTop}><div><b>{r.store_name||r.full_name||r.email}</b><small>{r.email} · #{r.reseller_id}</small></div><span className={r.status==="active"?styles.good:styles.warn}>{r.status}</span></div><div className={styles.accountStats}><span>{r.plan_code||"No plan"} · {r.subscription_status}</span><span>{r.customer_count||0} customers</span><span>{r.store_orders||0} store orders</span><span>{money(r.gross_store_sales_ngn)} sales</span><span>{money(r.available_profit_ngn)} available profit</span><span>{r.active_api_keys||0} API keys</span></div><div className={styles.accountBottom}><div><small>Store</small><b>{r.slug?`wickspend.com/store/${r.slug}`:"Not configured"}</b>{r.custom_domain&&<small>{r.custom_domain} · {r.domain_status}</small>}</div><button className={r.status==="active"?styles.danger:styles.primary} disabled={busy===`reseller-${r.reseller_id}`} onClick={()=>changeStatus(r)}>{busy===`reseller-${r.reseller_id}`?"Updating…":r.status==="active"?"Suspend":"Reactivate"}</button></div></article>)}{!accounts.length&&<div className={styles.empty}>No reseller accounts match this search.</div>}</section></>
}

function Domains({items,stats,filter,setFilter,activate,busy}:{items:any[];stats:any;filter:string;setFilter:(s:string)=>void;activate:(d:any,a:"activate"|"deactivate")=>void;busy:string}){
 return <><section className={styles.domainStats}><Metric label="Configured" value={stats.total_configured||0}/><Metric label="Ownership" value={stats.awaiting_ownership||0}/><Metric label="Routing" value={stats.awaiting_routing||0}/><Metric label="TLS" value={stats.awaiting_ssl||0}/><Metric label="Ready to activate" value={stats.ready_to_activate||0}/><Metric label="Live" value={stats.live||0}/></section><section className={styles.toolbar}><select value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">All domains</option><option value="pending">All pending</option><option value="ownership">Awaiting ownership</option><option value="routing">Awaiting routing</option><option value="ssl">Awaiting TLS</option><option value="activate">Ready to activate</option><option value="live">Live</option></select></section><section className={styles.list}>{items.map(d=><article className={styles.domain} key={`${d.reseller_id}-${d.domain}`}><div className={styles.accountTop}><div><b>{d.domain}</b><small>{d.store_name||d.email} · #{d.reseller_id}</small></div><span className={d.stage==="live"?styles.good:d.stage==="ready_to_activate"?styles.ready:styles.muted}>{String(d.stage).replaceAll("_"," ")}</span></div><div className={styles.domainFlow}><span className={d.ownership_status==="verified"?styles.stepDone:styles.step}>Ownership<br/><b>{d.ownership_status}</b></span><i>→</i><span className={d.routing_status==="ready"?styles.stepDone:styles.step}>Routing<br/><b>{d.routing_status}</b></span><i>→</i><span className={d.ssl_status==="ready"?styles.stepDone:styles.step}>TLS<br/><b>{d.ssl_status}</b></span><i>→</i><span className={d.domain_status==="verified"?styles.stepDone:styles.step}>Activation<br/><b>{d.domain_status}</b></span></div>{d.last_error&&<p className={styles.domainError}>{d.last_error}</p>}<div className={styles.accountBottom}><small>Last check: {date(d.last_checked_at||d.updated_at)}</small>{d.stage==="ready_to_activate"&&<button className={styles.primary} disabled={busy===`domain-${d.reseller_id}`} onClick={()=>activate(d,"activate")}>Activate domain</button>}{d.stage==="live"&&<button className={styles.danger} disabled={busy===`domain-${d.reseller_id}`} onClick={()=>activate(d,"deactivate")}>Take offline</button>}</div></article>)}{!items.length&&<div className={styles.empty}>No domains in this stage.</div>}</section><p className={styles.help}>Activation buttons appear only after ownership, VPS routing and TLS are already ready. This page does not create DNS records, Nginx routes or certificates.</p></>
}
