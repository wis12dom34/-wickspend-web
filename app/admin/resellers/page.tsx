"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ApiError, wickspendApi } from "@/lib/api";
import { getSessionToken } from "@/lib/session";
import styles from "./resellers.module.css";

type Tab = "overview" | "plans" | "accounts" | "domains";
type PlanForm = {
  original_code:string; code:string; slug:string; name:string; description:string;
  monthly:string; six_month:string; annual:string; api_access:boolean; api_key_limit:string;
  custom_domain:boolean; custom_domain_limit:string; is_public:boolean; is_active:boolean;
  monthly_enabled:boolean; six_month_enabled:boolean; annual_enabled:boolean; is_featured:boolean;
};
const blankPlan:PlanForm={original_code:"",code:"",slug:"",name:"",description:"",monthly:"",six_month:"",annual:"",api_access:false,api_key_limit:"0",custom_domain:false,custom_domain_limit:"0",is_public:false,is_active:false,monthly_enabled:true,six_month_enabled:false,annual_enabled:true,is_featured:false};
const money=(v:unknown)=>`₦${Number(v||0).toLocaleString("en-NG",{maximumFractionDigits:2})}`;
const date=(v:unknown)=>{if(!v)return "—";const d=new Date(String(v));return Number.isNaN(d.getTime())?"—":d.toLocaleString()};
const slugify=(v:string)=>v.toLowerCase().trim().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,60);
const billingLabel=(v:unknown)=>{const cycle=String(v||"").toLowerCase();return cycle==="monthly"?"Monthly":cycle==="six_months"||cycle==="6_months"?"6 Months":cycle==="annual"?"Yearly":String(v||"—").replaceAll("_"," ");};

async function adminApi<T=any>(path:string,init:RequestInit={}){
 const token=getSessionToken();
 if(!token)throw new Error("Please sign in with the WickSpend admin account.");
 return wickspendApi<T>(path,{...init,token,preserveSessionOn401:true});
}
function errorText(e:unknown){
 const code=e instanceof ApiError?e.code:"";
 const friendly:Record<string,string>={
  ACTIVE_PUBLIC_PLAN_NEEDS_PRICE:"An active public plan needs at least one enabled monthly, 6-month or yearly price.",
  INVALID_MONTHLY_PRICE:"Enter a valid monthly price of ₦0 or more, or leave it blank when monthly billing is disabled.",
  INVALID_SIX_MONTH_PRICE:"Enter a valid 6-month price of ₦0 or more, or leave it blank when 6-month billing is disabled.",
  INVALID_ANNUAL_PRICE:"Enter a valid yearly price of ₦0 or more, or leave it blank when yearly billing is disabled.",
  INVALID_PLAN_NAME:"Plan name must contain at least 2 characters.",INVALID_PLAN_SLUG:"Use a plan slug between 2 and 60 characters.",
  PLAN_SLUG_EXISTS:"That plan slug is already in use.",PLAN_CODE_EXISTS:"A plan with that internal code already exists.",
  PLAN_IN_USE:"This plan has subscription history or is still assigned to a reseller. Archive it instead of deleting it.",
  PLAN_NOT_FOUND:"That plan no longer exists. Refresh the plan list and try again.",PLAN_SAVE_CONFLICT:"The plan changed while saving. Refresh and try again.",
  INVALID_ORDER:"The plan order could not be saved.",UNAUTHORIZED:"Your admin session is no longer authorized. Please sign in again.",
 };
 if(code&&friendly[code])return friendly[code];
 return e instanceof ApiError?(e.code||e.message):e instanceof Error?e.message:"Request failed.";
}
function formFromPlan(p:any):PlanForm{return {original_code:String(p.code||""),code:String(p.code||""),slug:String(p.slug||p.code||""),name:String(p.name||""),description:String(p.description||""),monthly:p.monthly_price_ngn==null?"":String(p.monthly_price_ngn),six_month:p.six_month_price_ngn==null?"":String(p.six_month_price_ngn),annual:p.annual_price_ngn==null?"":String(p.annual_price_ngn),api_access:Boolean(p.features?.api_access),api_key_limit:String(p.features?.api_key_limit??0),custom_domain:Boolean(p.features?.custom_domain),custom_domain_limit:String(p.features?.custom_domain_limit??(p.features?.custom_domain?1:0)),is_public:Boolean(p.is_public),is_active:Boolean(p.is_active),monthly_enabled:Boolean(p.monthly_enabled),six_month_enabled:Boolean(p.six_month_enabled),annual_enabled:Boolean(p.annual_enabled),is_featured:Boolean(p.is_featured)};}
function payloadFromForm(plan:PlanForm,overrides:Record<string,unknown>={}){
 const code=(plan.original_code||plan.code||plan.slug).trim().toLowerCase();
 return {action:"save",original_code:plan.original_code||undefined,code,slug:plan.slug.trim(),name:plan.name.trim(),description:plan.description.trim(),monthly_price_ngn:plan.monthly===""?null:Number(plan.monthly),six_month_price_ngn:plan.six_month===""?null:Number(plan.six_month),annual_price_ngn:plan.annual===""?null:Number(plan.annual),monthly_enabled:plan.monthly_enabled,six_month_enabled:plan.six_month_enabled,annual_enabled:plan.annual_enabled,is_public:plan.is_public,is_active:plan.is_active,is_featured:plan.is_featured,features:{api_access:plan.api_access,api_key_limit:Math.max(0,Math.min(100,Number(plan.api_key_limit||0))),custom_domain:plan.custom_domain,custom_domain_limit:Math.max(0,Math.min(20,Number(plan.custom_domain_limit||0)))},...overrides};
}

export default function AdminResellersPage(){
 const[tab,setTab]=useState<Tab>("overview");
 const[loading,setLoading]=useState(true),[busy,setBusy]=useState(""),[message,setMessage]=useState(""),[messageKind,setMessageKind]=useState<"success"|"error">("error");
 const[overview,setOverview]=useState<any>(null),[plans,setPlans]=useState<any[]>([]),[accounts,setAccounts]=useState<any[]>([]),[domains,setDomains]=useState<any[]>([]),[domainStats,setDomainStats]=useState<any>({});
 const[query,setQuery]=useState(""),[domainFilter,setDomainFilter]=useState("all"),[plan,setPlan]=useState<PlanForm>(blankPlan);
 const[editorOpen,setEditorOpen]=useState(false),[slugTouched,setSlugTouched]=useState(false),[planDetails,setPlanDetails]=useState<any>(null);
 const showError=(text:string)=>{setMessageKind("error");setMessage(text)};
 const showSuccess=(text:string)=>{setMessageKind("success");setMessage(text)};

 const load=useCallback(async()=>{
   setLoading(true);
   try{
    const [o,p,a,d]=await Promise.all([
      adminApi("wickspend/backend/admin/reseller/overview"),
      adminApi("wickspend/backend/admin/reseller/plans"),
      adminApi(`wickspend/backend/admin/reseller/accounts?q=${encodeURIComponent(query)}`),
      adminApi(`wickspend/backend/admin/reseller/domains/readiness?status=${encodeURIComponent(domainFilter)}`),
    ]);
    setOverview(o);setPlans(Array.isArray(p?.items)?p.items:[]);setAccounts(Array.isArray(a?.items)?a.items:[]);setDomains(Array.isArray(d?.items)?d.items:[]);setDomainStats(d?.stats||{});
   }catch(e){showError(errorText(e))}finally{setLoading(false)}
 },[query,domainFilter]);
 useEffect(()=>{void load()},[load]);

 const totals=useMemo(()=>({resellers:Number(overview?.resellers?.total_resellers||0),active:Number(overview?.resellers?.active_resellers||0),stores:Number(overview?.resellers?.live_stores||0),customers:Number(overview?.customers?.total_customers||0),orders:Number(overview?.store_sales?.total_store_orders||0),sales:Number(overview?.store_sales?.gross_sales_ngn||0),subscriptions:Number(overview?.subscriptions?.subscription_revenue_ngn||0),profit:Number(overview?.earnings?.available_profit_ngn||0)}),[overview]);

 function newPlan(){setTab("plans");setPlan({...blankPlan});setSlugTouched(false);setEditorOpen(true);setPlanDetails(null);window.scrollTo({top:0,behavior:"smooth"})}
 function editPlan(p:any){setTab("plans");setPlan(formFromPlan(p));setSlugTouched(true);setEditorOpen(true);setPlanDetails(null);window.scrollTo({top:0,behavior:"smooth"})}
 function duplicatePlan(p:any){const next=formFromPlan(p);const name=`${p.name||"Plan"} Copy`;const slug=slugify(name);setPlan({...next,original_code:"",code:slug,slug,name,is_active:false,is_public:false,is_featured:false});setSlugTouched(false);setEditorOpen(true);setPlanDetails(null);window.scrollTo({top:0,behavior:"smooth"})}
 async function savePlan(){
   const code=(plan.original_code||plan.code||plan.slug).trim().toLowerCase(),name=plan.name.trim(),slug=plan.slug.trim();
   const monthly=plan.monthly===""?null:Number(plan.monthly),sixMonth=plan.six_month===""?null:Number(plan.six_month),annual=plan.annual===""?null:Number(plan.annual);
   if(code.length<2||name.length<2||slug.length<2){showError("Plan name and slug are required.");return}
   if((monthly!=null&&(!Number.isFinite(monthly)||monthly<0))||(sixMonth!=null&&(!Number.isFinite(sixMonth)||sixMonth<0))||(annual!=null&&(!Number.isFinite(annual)||annual<0))){showError("Prices must be ₦0 or more.");return}
   if(plan.is_active&&plan.is_public&&!((plan.monthly_enabled&&monthly!=null)||(plan.six_month_enabled&&sixMonth!=null)||(plan.annual_enabled&&annual!=null))){showError("An active public plan needs at least one enabled monthly, 6-month or yearly price.");return}
   setBusy("plan-save");setMessage("");
   try{await adminApi("wickspend/backend/admin/reseller/plans",{method:"POST",body:JSON.stringify(payloadFromForm(plan))});setEditorOpen(false);setPlan({...blankPlan});await load();showSuccess("Plan saved");}
   catch(e){showError(errorText(e))}finally{setBusy("")}
 }
 async function postPlanAction(body:any,busyKey:string,success:string){setBusy(busyKey);setMessage("");try{await adminApi("wickspend/backend/admin/reseller/plans",{method:"POST",body:JSON.stringify(body)});await load();showSuccess(success)}catch(e){showError(errorText(e))}finally{setBusy("")}}
 async function togglePlan(p:any){const f=formFromPlan(p);await postPlanAction(payloadFromForm(f,{is_active:!p.is_active}),`toggle-${p.code}`,`Plan ${p.is_active?"deactivated":"activated"}`)}
 async function removePlan(p:any){
  const used=Number(p.subscriber_count||0)>0||Number(p.active_subscriber_count||0)>0;
  if(used){if(!confirm(`Archive "${p.name}"?\n\nExisting subscribers will remain on their current subscription, but new customers cannot select this plan.`))return;await postPlanAction({action:"archive",original_code:p.code},`remove-${p.code}`,"Plan archived");return}
  if(!confirm(`Delete "${p.name}"?\n\nThis plan has no subscribers and can be permanently removed.`))return;
  await postPlanAction({action:"delete",original_code:p.code},`remove-${p.code}`,"Plan deleted");
 }
 async function movePlan(index:number,direction:-1|1){const next=[...plans];const target=index+direction;if(target<0||target>=next.length)return;[next[index],next[target]]=[next[target],next[index]];setPlans(next);await postPlanAction({action:"reorder",codes:next.map(p=>p.code)},"reorder","Plan order saved")}
 async function viewSubscribers(p:any){setBusy(`subs-${p.code}`);setMessage("");try{const d=await adminApi(`wickspend/backend/admin/reseller/plans?code=${encodeURIComponent(p.code)}`);setPlanDetails(d)}catch(e){showError(errorText(e))}finally{setBusy("")}}
 async function changeResellerStatus(r:any){
   const next=r.status==="suspended"?"active":"suspended";
   if(!confirm(`${next==="suspended"?"Suspend":"Reactivate"} reseller ${r.store_name||r.email}? This changes reseller access but does not alter balances, orders or subscription records.`))return;
   setBusy(`reseller-${r.reseller_id}`);setMessage("");
   try{await adminApi("wickspend/backend/admin/reseller/status",{method:"POST",body:JSON.stringify({reseller_id:r.reseller_id,status:next})});await load();showSuccess(`Reseller ${next}`)}catch(e){showError(errorText(e))}finally{setBusy("")}
 }
 async function activateDomain(d:any,action:"activate"|"deactivate"){
   if(!confirm(`${action==="activate"?"Activate":"Take offline"} custom domain ${d.domain}?`))return;
   setBusy(`domain-${d.reseller_id}`);setMessage("");
   try{await adminApi("wickspend/backend/admin/reseller/domain/activation",{method:"POST",body:JSON.stringify({reseller_id:d.reseller_id,domain:d.domain,action,request_key:`admin-domain-${Date.now()}-${d.reseller_id}`,reason:action==="activate"?"Admin activation after verified routing/TLS":"Admin deactivation"})});await load();showSuccess(`Domain ${action} request applied`)}catch(e){showError(errorText(e))}finally{setBusy("")}
 }

 return <main className={styles.page}><div className={styles.shell}>
   <header className={styles.header}><Link className={styles.back} href="/admin/menu">‹</Link><div><span>WickSpend Admin</span><h1>Reseller Control Center</h1><p>Plans, accounts, revenue and custom-domain readiness.</p></div><button className={styles.refresh} onClick={()=>void load()} disabled={loading}>{loading?"Loading…":"Refresh"}</button></header>
   <nav className={styles.tabs}>{(["overview","plans","accounts","domains"] as Tab[]).map(t=><button key={t} className={tab===t?styles.tabActive:styles.tab} onClick={()=>setTab(t)}>{t}</button>)}</nav>
   {message&&<div className={messageKind==="success"?styles.success:styles.error}>{message}</div>}
   {tab==="overview"&&<Overview totals={totals} overview={overview} loading={loading}/>}
   {tab==="plans"&&<Plans plans={plans} plan={plan} setPlan={setPlan} editorOpen={editorOpen} setEditorOpen={setEditorOpen} slugTouched={slugTouched} setSlugTouched={setSlugTouched} newPlan={newPlan} savePlan={savePlan} editPlan={editPlan} duplicatePlan={duplicatePlan} togglePlan={togglePlan} removePlan={removePlan} movePlan={movePlan} viewSubscribers={viewSubscribers} details={planDetails} closeDetails={()=>setPlanDetails(null)} busy={busy}/>}
   {tab==="accounts"&&<Accounts accounts={accounts} query={query} setQuery={setQuery} load={load} changeStatus={changeResellerStatus} busy={busy}/>}
   {tab==="domains"&&<Domains items={domains} stats={domainStats} filter={domainFilter} setFilter={setDomainFilter} activate={activateDomain} busy={busy}/>}
 </div></main>
}

function Overview({totals,overview,loading}:{totals:any;overview:any;loading:boolean}){
 if(loading&&!overview)return <div className={styles.empty}>Loading reseller analytics…</div>;
 return <><section className={styles.metrics}><Metric label="Resellers" value={totals.resellers}/><Metric label="Active" value={totals.active}/><Metric label="Live stores" value={totals.stores}/><Metric label="Customers" value={totals.customers}/><Metric label="Store orders" value={totals.orders}/><Metric label="Gross store sales" value={money(totals.sales)}/><Metric label="Subscription revenue" value={money(totals.subscriptions)}/><Metric label="Available reseller profit" value={money(totals.profit)}/></section><section className={styles.grid2}><article className={styles.card}><h2>Product orders</h2><Row label="Numbers" value={overview?.store_sales?.number_orders||0}/><Row label="Rentals" value={overview?.store_sales?.rental_orders||0}/><Row label="Marketplace" value={overview?.store_sales?.marketplace_orders||0}/><Row label="Boostly" value={overview?.store_sales?.boostly_orders||0}/><Row label="Provider pending" value={overview?.store_sales?.provider_pending_orders||0}/><Row label="Refunded" value={overview?.store_sales?.refunded_store_orders||0}/></article><article className={styles.card}><h2>Domains & API</h2><Row label="Ownership verified" value={overview?.resellers?.ownership_verified_domains||0}/><Row label="Pending domain activation" value={overview?.resellers?.pending_domain_activation||0}/><Row label="Verified/live domains" value={overview?.resellers?.verified_domains||0}/><Row label="API sales" value={money(overview?.api_sales?.api_sales_ngn)}/><Row label="API orders" value={overview?.api_sales?.total_api_orders||0}/></article></section></>
}
function Metric({label,value}:{label:string;value:any}){return <article className={styles.metric}><span>{label}</span><strong>{value}</strong></article>}
function Row({label,value}:{label:string;value:any}){return <div className={styles.row}><span>{label}</span><b>{value}</b></div>}

function Plans({plans,plan,setPlan,editorOpen,setEditorOpen,slugTouched,setSlugTouched,newPlan,savePlan,editPlan,duplicatePlan,togglePlan,removePlan,movePlan,viewSubscribers,details,closeDetails,busy}:{plans:any[];plan:PlanForm;setPlan:(p:PlanForm)=>void;editorOpen:boolean;setEditorOpen:(v:boolean)=>void;slugTouched:boolean;setSlugTouched:(v:boolean)=>void;newPlan:()=>void;savePlan:()=>void;editPlan:(p:any)=>void;duplicatePlan:(p:any)=>void;togglePlan:(p:any)=>void;removePlan:(p:any)=>void;movePlan:(i:number,d:-1|1)=>void;viewSubscribers:(p:any)=>void;details:any;closeDetails:()=>void;busy:string}){
 const onName=(name:string)=>{if(!plan.original_code&&!slugTouched){const slug=slugify(name);setPlan({...plan,name,slug,code:slug})}else setPlan({...plan,name})};
 const onSlug=(slugRaw:string)=>{const slug=slugify(slugRaw);setSlugTouched(true);setPlan({...plan,slug,code:plan.original_code?plan.code:slug})};
 return <>
  <section className={styles.card}><div className={styles.plansToolbar}><div><span className={styles.eyebrow}>Configured plans</span><h2>{plans.length} plans</h2><p className={styles.help}>Customer pricing is generated from these plans. Archived plans remain here for history but cannot accept new subscriptions.</p></div><button className={styles.primary} onClick={newPlan}>+ New Plan</button></div></section>
  {editorOpen&&<section className={styles.card}><div className={styles.cardHead}><div><span className={styles.eyebrow}>Plan editor</span><h2>{plan.original_code?`Edit ${plan.name||plan.original_code}`:"Create subscription plan"}</h2>{plan.original_code&&<small className={styles.internalCode}>Internal code: {plan.original_code}</small>}</div><button className={styles.secondary} onClick={()=>setEditorOpen(false)}>Close</button></div>
   <div className={styles.formGrid}><label>Plan name<input value={plan.name} onChange={e=>onName(e.target.value)} placeholder="Starter" maxLength={80}/></label><label>Plan slug<input value={plan.slug} onChange={e=>onSlug(e.target.value)} placeholder="starter" maxLength={60}/><small>Used as the editable public slug. Existing subscription history keeps the stable internal code.</small></label><label className={styles.wide}>Description<textarea value={plan.description} onChange={e=>setPlan({...plan,description:e.target.value})} placeholder="Everything you need to launch your Mini Store." maxLength={300}/></label>
    <label>Monthly price (NGN)<input type="number" min="0" step="0.01" value={plan.monthly} onChange={e=>setPlan({...plan,monthly:e.target.value})} placeholder="0 or leave blank"/></label><label>6 Months price (NGN)<input type="number" min="0" step="0.01" value={plan.six_month} onChange={e=>setPlan({...plan,six_month:e.target.value})} placeholder="0 or leave blank"/></label><label>Yearly price (NGN)<input type="number" min="0" step="0.01" value={plan.annual} onChange={e=>setPlan({...plan,annual:e.target.value})} placeholder="0 or leave blank"/></label><div className={`${styles.checks} ${styles.wide}`}><label><input type="checkbox" checked={plan.monthly_enabled} onChange={e=>setPlan({...plan,monthly_enabled:e.target.checked})}/> Allow monthly billing</label><label><input type="checkbox" checked={plan.six_month_enabled} onChange={e=>setPlan({...plan,six_month_enabled:e.target.checked})}/> Allow 6-month billing</label><label><input type="checkbox" checked={plan.annual_enabled} onChange={e=>setPlan({...plan,annual_enabled:e.target.checked})}/> Allow yearly billing</label></div>
    <label>API key limit<input type="number" min="0" max="100" value={plan.api_key_limit} onChange={e=>setPlan({...plan,api_key_limit:e.target.value})}/></label><label>Custom domain limit<input type="number" min="0" max="20" value={plan.custom_domain_limit} onChange={e=>setPlan({...plan,custom_domain_limit:e.target.value})}/></label><div className={styles.checks}><label><input type="checkbox" checked={plan.api_access} onChange={e=>setPlan({...plan,api_access:e.target.checked})}/> API access</label><label><input type="checkbox" checked={plan.custom_domain} onChange={e=>setPlan({...plan,custom_domain:e.target.checked})}/> Custom domains</label></div>
    <div className={`${styles.checks} ${styles.wide}`}><label><input type="checkbox" checked={plan.is_public} onChange={e=>setPlan({...plan,is_public:e.target.checked})}/> Public plan</label><label><input type="checkbox" checked={plan.is_active} onChange={e=>setPlan({...plan,is_active:e.target.checked})}/> Active plan</label><label><input type="checkbox" checked={plan.is_featured} onChange={e=>setPlan({...plan,is_featured:e.target.checked})}/> Featured / Recommended</label></div>
   </div><p className={styles.help}>₦0 is valid. Monthly, 6-month and yearly billing are independent. An active public plan needs at least one enabled price.</p><button className={styles.primary} disabled={busy==="plan-save"} onClick={savePlan}>{busy==="plan-save"?"Saving…":"Save Plan"}</button>
  </section>}
  <section className={styles.card}>{plans.length?<div className={styles.planGrid}>{plans.map((p,i)=><article key={p.code} className={`${styles.planCard} ${p.archived_at?styles.archivedCard:""}`}><div className={styles.planCardHead}><div><b>{p.name}</b><small>{p.slug||p.code}</small></div><div className={styles.planBadges}>{p.is_featured&&<span className={styles.ready}>Recommended</span>}<span className={p.archived_at?styles.muted:p.is_active?styles.good:styles.warn}>{p.archived_at?"Archived":p.is_active?"Active":"Inactive"}</span><span className={p.is_public&&!p.archived_at?styles.good:styles.muted}>{p.is_public&&!p.archived_at?"Public":"Private"}</span></div></div>{p.description&&<p className={styles.planDescription}>{p.description}</p>}<div className={styles.planPriceLine}><div><small>Monthly</small><strong>{p.monthly_enabled&&p.monthly_price_ngn!=null?money(p.monthly_price_ngn):"Disabled"}</strong></div><div><small>6 Months</small><strong>{p.six_month_enabled&&p.six_month_price_ngn!=null?money(p.six_month_price_ngn):"Disabled"}</strong></div><div><small>Yearly</small><strong>{p.annual_enabled&&p.annual_price_ngn!=null?money(p.annual_price_ngn):"Disabled"}</strong></div></div><div className={styles.featureLine}><span>API {p.features?.api_access?"✓":"—"}</span><span>Keys {p.features?.api_key_limit??0}</span><span>Domain {p.features?.custom_domain?"✓":"—"}</span><span>Domains {p.features?.custom_domain_limit??0}</span></div><button className={styles.subscriberButton} disabled={busy===`subs-${p.code}`} onClick={()=>void viewSubscribers(p)}>Subscribers: {p.subscriber_count||0}{Number(p.active_subscriber_count||0)>0?` · ${p.active_subscriber_count} active`:""}</button><div className={styles.planFooter}><div className={styles.orderButtons}><button disabled={i===0||busy==="reorder"} onClick={()=>void movePlan(i,-1)}>↑</button><button disabled={i===plans.length-1||busy==="reorder"} onClick={()=>void movePlan(i,1)}>↓</button></div><details className={styles.planMenu}><summary aria-label={`Manage ${p.name}`}>•••</summary><div><button onClick={()=>editPlan(p)}>Edit</button><button onClick={()=>duplicatePlan(p)}>Duplicate</button>{!p.archived_at&&<button disabled={busy===`toggle-${p.code}`} onClick={()=>void togglePlan(p)}>{p.is_active?"Deactivate":"Activate"}</button>}<button className={styles.menuDanger} disabled={busy===`remove-${p.code}`} onClick={()=>void removePlan(p)}>{Number(p.subscriber_count||0)>0?"Archive":"Delete"}</button></div></details></div></article>)}</div>:<div className={styles.empty}>No reseller plans configured yet. Select + New Plan to create the first one.</div>}</section>
  {details&&<section className={styles.card}><div className={styles.cardHead}><div><span className={styles.eyebrow}>Subscribers</span><h2>{details.plan?.name||details.plan?.code}</h2><p className={styles.help}>{details.plan?.subscriber_count||0} historical subscriber{Number(details.plan?.subscriber_count||0)===1?"":"s"}</p></div><button className={styles.secondary} onClick={closeDetails}>Close</button></div>{Array.isArray(details.subscribers)&&details.subscribers.length?<div className={styles.tableWrap}><table><thead><tr><th>Customer / Reseller</th><th>Email</th><th>Plan</th><th>Billing period</th><th>Started</th><th>Expires</th><th>Status</th></tr></thead><tbody>{details.subscribers.map((s:any)=><tr key={s.subscription_id}><td>{s.customer_reseller}</td><td>{s.email}</td><td>{s.plan_code}</td><td>{billingLabel(s.billing_cycle)}</td><td>{date(s.starts_at||s.created_at)}</td><td>{date(s.expires_at)}</td><td><span className={s.status==="active"?styles.good:s.status==="pending"?styles.warn:styles.muted}>{s.status}</span></td></tr>)}</tbody></table></div>:<div className={styles.empty}>No subscriptions have used this plan yet.</div>}</section>}
 </>;
}

function Accounts({accounts,query,setQuery,load,changeStatus,busy}:{accounts:any[];query:string;setQuery:(s:string)=>void;load:()=>Promise<void>;changeStatus:(r:any)=>void;busy:string}){
 return <><section className={styles.toolbar}><input value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")void load()}} placeholder="Search reseller, email, store, slug or domain"/><button className={styles.secondary} onClick={()=>void load()}>Search</button></section><section className={styles.list}>{accounts.map(r=><article className={styles.account} key={r.reseller_id}><div className={styles.accountTop}><div><b>{r.store_name||r.full_name||r.email}</b><small>{r.email} · #{r.reseller_id}</small></div><span className={r.status==="active"?styles.good:styles.warn}>{r.status}</span></div><div className={styles.accountStats}><span>{r.plan_code||"No plan"} · {r.subscription_status}</span><span>{r.customer_count||0} customers</span><span>{r.store_orders||0} store orders</span><span>{money(r.gross_store_sales_ngn)} sales</span><span>{money(r.available_profit_ngn)} available profit</span><span>{r.active_api_keys||0} API keys</span><span>{r.settlement_status==="active" ? `${r.settlement_bank_name} · ${r.settlement_account_name} · ${r.settlement_account_number_masked}` : "No settlement account"}</span><span>{Number(r.pending_withdrawals||0)} pending withdrawals</span></div><div className={styles.accountBottom}><div><small>Store</small><b>{r.slug?`wickspend.com/store/${r.slug}`:"Not configured"}</b>{r.custom_domain&&<small>{r.custom_domain} · {r.domain_status}</small>}</div><button className={r.status==="active"?styles.danger:styles.primary} disabled={busy===`reseller-${r.reseller_id}`} onClick={()=>changeStatus(r)}>{busy===`reseller-${r.reseller_id}`?"Updating…":r.status==="active"?"Suspend":"Reactivate"}</button></div></article>)}{!accounts.length&&<div className={styles.empty}>No reseller accounts match this search.</div>}</section></>
}

function Domains({items,stats,filter,setFilter,activate,busy}:{items:any[];stats:any;filter:string;setFilter:(s:string)=>void;activate:(d:any,a:"activate"|"deactivate")=>void;busy:string}){
 return <><section className={styles.domainStats}><Metric label="Configured" value={stats.total_configured||0}/><Metric label="Ownership" value={stats.awaiting_ownership||0}/><Metric label="Routing" value={stats.awaiting_routing||0}/><Metric label="TLS" value={stats.awaiting_ssl||0}/><Metric label="Ready to activate" value={stats.ready_to_activate||0}/><Metric label="Live" value={stats.live||0}/></section><section className={styles.toolbar}><select value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">All domains</option><option value="pending">All pending</option><option value="ownership">Awaiting ownership</option><option value="routing">Awaiting routing</option><option value="ssl">Awaiting TLS</option><option value="activate">Ready to activate</option><option value="live">Live</option></select></section><section className={styles.list}>{items.map(d=><article className={styles.domain} key={`${d.reseller_id}-${d.domain}`}><div className={styles.accountTop}><div><b>{d.domain}</b><small>{d.store_name||d.email} · #{d.reseller_id}</small></div><span className={d.stage==="live"?styles.good:d.stage==="ready_to_activate"?styles.ready:styles.muted}>{String(d.stage).replaceAll("_"," ")}</span></div><div className={styles.domainFlow}><span className={d.ownership_status==="verified"?styles.stepDone:styles.step}>Ownership<br/><b>{d.ownership_status}</b></span><i>→</i><span className={d.routing_status==="ready"?styles.stepDone:styles.step}>Routing<br/><b>{d.routing_status}</b></span><i>→</i><span className={d.ssl_status==="ready"?styles.stepDone:styles.step}>TLS<br/><b>{d.ssl_status}</b></span><i>→</i><span className={d.domain_status==="verified"?styles.stepDone:styles.step}>Activation<br/><b>{d.domain_status}</b></span></div>{d.last_error&&<p className={styles.domainError}>{d.last_error}</p>}<div className={styles.accountBottom}><small>Last check: {date(d.last_checked_at||d.updated_at)}</small>{d.stage==="ready_to_activate"&&<button className={styles.primary} disabled={busy===`domain-${d.reseller_id}`} onClick={()=>activate(d,"activate")}>Activate domain</button>}{d.stage==="live"&&<button className={styles.danger} disabled={busy===`domain-${d.reseller_id}`} onClick={()=>activate(d,"deactivate")}>Take offline</button>}</div></article>)}{!items.length&&<div className={styles.empty}>No domains in this stage.</div>}</section><p className={styles.help}>Activation buttons appear only after ownership, VPS routing and TLS are already ready. This page does not create DNS records, Nginx routes or certificates.</p></>
}
