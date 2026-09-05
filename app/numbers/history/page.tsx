"use client";

import {useEffect,useMemo,useState} from "react";
import Link from "next/link";
import {BottomNav} from "@/components/BottomNav";
import {api} from "@/lib/api";
import {getSessionToken} from "@/lib/session";
import s from "./history.module.css";

const listOf=(p:any)=>Array.isArray(p)?p:Array.isArray(p?.orders)?p.orders:Array.isArray(p?.items)?p.items:Array.isArray(p?.data)?p.data:Array.isArray(p?.data?.orders)?p.data.orders:[];
const refOf=(o:any)=>String(o?.reference||o?.order_reference||o?.ref||o?.id||"");
const statusOf=(o:any)=>String(o?.status||o?.state||"").toLowerCase();
const isNumber=(o:any)=>/number|otp|sms|verification|telegram|whatsapp|instagram|tiktok|facebook|google/i.test([o?.type,o?.category,o?.service,o?.service_name,o?.title,o?.description].filter(Boolean).join(" "));
const serviceOf=(o:any)=>String(o?.service_name||o?.service||o?.title||"Verification number");
const countryOf=(o:any)=>String(o?.country_name||o?.country||o?.country_code||"");
const numberOf=(o:any)=>String(o?.phone_number||o?.number||o?.msisdn||o?.phone||"");
const masked=(v:string)=>{if(!v)return"Number unavailable";const x=v.replace(/\s+/g,"");if(x.length<7)return v;return `${x.slice(0,3)} ••• ••• ${x.slice(-4)}`};
const badge=(o:any)=>{const st=statusOf(o);if(/refund/.test(st)||o?.refunded===true)return"REFUNDED";if(/complete|success|delivered|received|done/.test(st))return"COMPLETED";if(/active|waiting|pending|processing/.test(st))return"ACTIVE";return st?st.toUpperCase():"UNKNOWN"};
const when=(o:any)=>{const st=badge(o);if(st==="REFUNDED")return"Refund completed";if(st==="COMPLETED")return"Completed";const exp=o?.expires_at||o?.expiry||o?.expiresAt;if(exp){const ms=new Date(exp).getTime()-Date.now();if(Number.isFinite(ms)&&ms>0){const m=Math.floor(ms/60000),sec=Math.floor((ms%60000)/1000);return `Expires in ${m}:${String(sec).padStart(2,"0")}`}}return String(o?.status||"Active");};

type Filter="All"|"Active"|"Completed"|"Refunded";
export default function NumbersHistory(){
 const[orders,setOrders]=useState<any[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState(""),[query,setQuery]=useState(""),[filter,setFilter]=useState<Filter>("All");
 useEffect(()=>{let cancel=false;const token=getSessionToken();if(!token){setError("Please sign in to view number history.");setLoading(false);return}api.orders(token).then((p:any)=>{if(cancel)return;setOrders(listOf(p).filter(isNumber));setError("")}).catch((e:any)=>{if(!cancel)setError(e instanceof Error?e.message:"Unable to load number history.")}).finally(()=>{if(!cancel)setLoading(false)});return()=>{cancel=true}},[]);
 const shown=useMemo(()=>orders.filter(o=>{const b=badge(o);if(filter!=="All"&&b!==filter.toUpperCase())return false;const q=query.trim().toLowerCase();if(!q)return true;return [serviceOf(o),countryOf(o),numberOf(o),refOf(o)].join(" ").toLowerCase().includes(q)}),[orders,filter,query]);
 return <main className={s.page}><header><h1>Number history</h1><p>Your recent verification orders.</p></header><label className={s.search}><span>⌕</span><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search country or service" aria-label="Search number history"/></label><div className={s.filters}>{(["All","Active","Completed","Refunded"] as Filter[]).map(x=><button key={x} type="button" className={filter===x?s.active:""} onClick={()=>setFilter(x)}>{x}</button>)}</div><section className={s.list} aria-busy={loading}>{loading?<div className={s.state}><b>Loading number history…</b><p>Fetching your recent verification orders.</p></div>:error?<div className={s.state}><b>History unavailable</b><p>{error}</p></div>:shown.length?shown.map((o:any,i)=>{const r=refOf(o),b=badge(o);return <Link className={s.card} href={r?`/numbers/history/${encodeURIComponent(r)}`:"/orders"} key={r||i}><div><h2>{serviceOf(o)}{countryOf(o)?` • ${countryOf(o)}`:""}</h2><strong>{masked(numberOf(o))}</strong><p>{when(o)}</p></div><span className={`${s.badge} ${b==="COMPLETED"?s.done:""}`}>{b}</span><em>›</em></Link>}):<div className={s.state}><b>No number orders found</b><p>Your verification number history will appear here after you purchase a number.</p></div>}</section><Link className={s.cta} href="/buy-number">Buy a new number</Link><BottomNav/></main>;
}
