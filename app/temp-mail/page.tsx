"use client";

import {useEffect,useMemo,useState} from "react";
import {useRouter} from "next/navigation";
import {BottomNav} from "@/components/BottomNav";
import {api} from "@/lib/api";
import s from "./temp-mail.module.css";

const serviceId=(x:any)=>String(x?.service_code||x?.code||x?.id||"");
const serviceName=(x:any)=>String(x?.name||x?.service_name||x?.title||"Email service");
const serviceIcon=(x:any)=>{const raw=String(x?.domain||x?.website||x?.url||"");if(!raw)return "";try{const domain=new URL(raw.startsWith("http")?raw:`https://${raw}`).hostname.replace(/^www\./,"");return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64`}catch{return ""}};
const money=(v:any)=>Number.isFinite(Number(v))?`₦${Number(v).toLocaleString("en-NG")}`:"Price shown next";

export default function TempMailHome(){
  const router=useRouter();
  const[services,setServices]=useState<any[]>([]);
  const[selected,setSelected]=useState<any>(null);
  const[prices,setPrices]=useState<Record<string,any>>({});
  const[query,setQuery]=useState("");
  const[message,setMessage]=useState("Loading Temp Mail options…");
  const[busy,setBusy]=useState(false);

  useEffect(()=>{let alive=true;(async()=>{try{const d:any=await api.tempMail.services("");const list=Array.isArray(d)?d:(d?.services||d?.items||d?.data||[]);if(!alive)return;const safe=(Array.isArray(list)?list:[]).filter((x:any)=>serviceId(x));setServices(safe);setMessage(safe.length?"":"No Temp Mail options are available right now.")}catch(e){if(alive)setMessage(e instanceof Error?e.message:"Unable to load Temp Mail options")}})();return()=>{alive=false}},[]);

  const filtered=useMemo(()=>{const q=query.trim().toLowerCase();return q?services.filter(x=>serviceName(x).toLowerCase().includes(q)):services},[services,query]);

  async function choose(x:any){if(busy)return;setSelected(x);const id=serviceId(x);if(prices[id])return;setBusy(true);try{const p:any=await api.tempMail.price(id);setPrices(v=>({...v,[id]:p}))}catch{}finally{setBusy(false)}}
  function start(){if(!selected)return setMessage("Choose a Temp Mail service first.");const id=serviceId(selected);sessionStorage.setItem("wickspend.tempMailDraft",JSON.stringify({service_code:id,service_name:serviceName(selected),price:prices[id]||null}));router.push("/temp-mail/configure")}

  return <main className={s.page}>
    <header className={s.hero}><span className={s.kicker}>TEMP MAIL</span><h1>Temporary email, step by step.</h1><p>Create a private inbox for verification emails without exposing your personal address.</p></header>
    <div className={s.topAction}><button className={s.primary} type="button" disabled={!selected||busy} onClick={start}>{busy?"Loading…":selected?"Create Temp Mail":"Select a service to continue"}</button></div>
    <section className={s.glass}><div className={s.sectionHead}><div><h2>Available services</h2><p>Choose what you need, then continue.</p></div></div><label className={s.search}><span>⌕</span><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search Temp Mail services" aria-label="Search Temp Mail services"/></label><div className={s.serviceList}>{filtered.map(x=>{const id=serviceId(x),icon=serviceIcon(x),p=prices[id],amount=p?.price_ngn??p?.final_price_ngn??p?.data?.price_ngn??p?.data?.final_price_ngn;return <button key={id} type="button" className={`${s.service} ${selected&&serviceId(selected)===id?s.selected:""}`} onClick={()=>choose(x)}><span className={s.serviceIcon}>{icon?<img src={icon} alt="" width="28" height="28"/>:<span>✉</span>}</span><span className={s.serviceCopy}><b>{serviceName(x)}</b><small>{x?.description||"Temporary verification inbox"}</small></span><strong>{p?money(amount):"Select"}</strong></button>})}</div></section>
    {message&&<p className={s.screenMessage} role="status">{message}</p>}
    <BottomNav/>
  </main>
}
