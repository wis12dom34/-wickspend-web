"use client";
import {FormEvent,useEffect,useMemo,useState} from "react";
import Link from "next/link";
import {api} from "@/lib/api";
import {getSessionToken} from "@/lib/session";

type Rental={id:number|string;reference:string;order_reference:string;item_index?:number;quantity_requested?:number;user_id:number|string;user?:string;email?:string;service?:string;service_code?:string;country?:string;country_code?:string;provider?:string;provider_key?:string;provider_rental_id?:string;phone_number?:string;duration_minutes?:number;amount_charged_ngn?:number;provider_cost_ngn?:number;profit_ngn?:number;status?:string;renewable?:boolean;carrier?:string;area_code?:string;refunded?:boolean;created_at?:string;active_from?:string;expires_at?:string;updated_at?:string};
const money=(v:unknown)=>`₦${Number(v||0).toLocaleString("en-NG",{maximumFractionDigits:2})}`;
const when=(v?:string)=>v?new Date(v).toLocaleString("en-NG",{dateStyle:"medium",timeStyle:"short"}):"—";
const duration=(v?:number)=>{const m=Number(v||0);if(m>=525600&&m%525600===0)return `${m/525600}y`;if(m>=43200&&m%43200===0)return `${m/43200}mo`;if(m>=1440&&m%1440===0)return `${m/1440}d`;if(m>=60&&m%60===0)return `${m/60}h`;return `${m}m`};

export default function AdminRentals(){
 const[query,setQuery]=useState("");const[status,setStatus]=useState("all");const[rows,setRows]=useState<Rental[]>([]);const[total,setTotal]=useState(0);const[loading,setLoading]=useState(true);const[message,setMessage]=useState("");
 async function load(search=query,nextStatus=status){const token=getSessionToken();if(!token){setMessage("Admin session required.");setLoading(false);return}setLoading(true);setMessage("");try{const r:any=await api.admin.rentals(token,{search,status:nextStatus,limit:100,page:1});setRows(Array.isArray(r?.rentals)?r.rentals:[]);setTotal(Number(r?.total||0))}catch(e){setMessage(e instanceof Error?e.message:"Unable to load rental orders.")}finally{setLoading(false)}}
 useEffect(()=>{void load("","all")},[]);
 const active=useMemo(()=>rows.filter(r=>String(r.status).toLowerCase()==="active").length,[rows]);const gotSms=useMemo(()=>rows.filter(r=>r.provider_key==="gotsms").length,[rows]);
 function search(e:FormEvent){e.preventDefault();void load(query,status)}
 return <main className="ws-admin-users-page"><section className="ws-admin-users-shell"><header className="ws-admin-users-head"><Link href="/admin/menu" aria-label="Back">‹</Link><div><h1>Rental Orders</h1><p>Inspect GotSMS and GetaText rental activity</p></div></header>
  <section className="ws-admin-user-stats"><article><strong>{total.toLocaleString()}</strong><span>Matching rentals</span></article><article><strong>{active}</strong><span>Active loaded</span></article><article><strong>{gotSms}</strong><span>GotSMS loaded</span></article></section>
  <form className="ws-admin-user-search" onSubmit={search}><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search phone, user, service, order or provider ID"/><select aria-label="Rental status" value={status} onChange={e=>{setStatus(e.target.value);void load(query,e.target.value)}} style={{height:48,border:"1px solid #e3ebf5",borderRadius:18,background:"#fff",padding:"0 12px"}}><option value="all">All statuses</option><option value="active">Active</option><option value="processing">Processing</option><option value="expired">Expired</option><option value="cancelled">Cancelled</option><option value="failed">Failed</option></select><button disabled={loading}>{loading?"Loading…":"Search"}</button></form>
  {message&&<div className="ws-admin-user-message" role="status">{message}</div>}
  <section className="ws-admin-user-list">{rows.map(r=><article className="ws-admin-user-row" key={String(r.id)} style={{cursor:"default"}}><span className="ws-admin-user-avatar">{String(r.service||"R").charAt(0).toUpperCase()}</span><span className="ws-admin-user-copy"><strong>{r.service||r.service_code||"Rental"} · {r.phone_number||"Processing"}</strong><small>{r.provider||r.provider_key||"Provider"} · {r.country||r.country_code||"—"} · {duration(r.duration_minutes)} · {String(r.status||"processing")}</small><em>{r.user||r.email||`User #${r.user_id}`} · Order {r.order_reference||r.reference} · Provider ID {r.provider_rental_id||"—"}</em><em>Created {when(r.created_at)} · Expires {when(r.expires_at)}{r.carrier?` · ${r.carrier}`:""}{r.area_code?` · Area ${r.area_code}`:""}</em></span><span className="ws-admin-user-balance"><strong>{money(r.amount_charged_ngn)}</strong><small>Cost {money(r.provider_cost_ngn)}</small><b>Profit {money(r.profit_ngn)}</b></span></article>)}{!loading&&!rows.length&&<div className="ws-admin-user-empty">No rental orders found.</div>}</section>
 </section></main>;
}
