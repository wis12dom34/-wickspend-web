"use client";

import {useEffect,useState} from "react";
import Link from "next/link";
import {useParams} from "next/navigation";
import {BottomNav} from "@/components/BottomNav";
import {api} from "@/lib/api";
import {getSessionToken} from "@/lib/session";
import s from "./details.module.css";

const listOf=(p:any)=>Array.isArray(p)?p:Array.isArray(p?.orders)?p.orders:Array.isArray(p?.items)?p.items:Array.isArray(p?.data)?p.data:Array.isArray(p?.data?.orders)?p.data.orders:[];
const refOf=(o:any)=>String(o?.reference||o?.order_reference||o?.ref||o?.id||"");
const statusOf=(o:any)=>String(o?.status||o?.state||"").toLowerCase();
const badge=(o:any)=>{const st=statusOf(o);if(/refund/.test(st)||o?.refunded===true)return"REFUNDED";if(/complete|success|delivered|received|done/.test(st))return"COMPLETED";if(/active|waiting|pending|processing/.test(st))return"ACTIVE";return st?st.toUpperCase():"UNKNOWN"};
const money=(v:any)=>{const n=Number(v);return Number.isFinite(n)?`₦${n.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}`:"—"};
const serviceOf=(o:any)=>String(o?.service_name||o?.service||o?.title||"Verification number");
const countryOf=(o:any)=>String(o?.country_name||o?.country||o?.country_code||"");
const numberOf=(o:any)=>String(o?.phone_number||o?.number||o?.msisdn||o?.phone||"");
const codeOf=(o:any)=>String(o?.otp||o?.code||o?.sms_code||o?.verification_code||"");
const amountOf=(o:any)=>o?.amount_ngn??o?.final_amount_ngn??o?.price_ngn??o?.total_ngn??o?.amount;

export default function NumberHistoryDetails(){
 const params=useParams<{reference:string}>();const reference=decodeURIComponent(String(params?.reference||""));const[data,setData]=useState<any>(null),[loading,setLoading]=useState(true),[error,setError]=useState(""),[copied,setCopied]=useState("");
 useEffect(()=>{let cancel=false;const token=getSessionToken();if(!token){setError("Please sign in to view number details.");setLoading(false);return}api.orders(token).then(async(payload:any)=>{if(cancel)return;const match=listOf(payload).find((o:any)=>refOf(o)===reference)||null;let merged=match;if(reference){try{const live:any=await api.numbers.status(token,reference);merged={...(match||{}),...(live?.data||live||{})}}catch{merged=match}}if(!cancel){setData(merged);if(!merged)setError("This number order could not be found.")}}).catch((e:any)=>{if(!cancel)setError(e instanceof Error?e.message:"Unable to load number details.")}).finally(()=>{if(!cancel)setLoading(false)});return()=>{cancel=true}},[reference]);
 async function copy(value:string,label:string){if(!value)return;try{await navigator.clipboard.writeText(value);setCopied(label);setTimeout(()=>setCopied(""),1400)}catch{}}
 if(loading)return <main className={s.page}><section className={s.state}><b>Loading number details…</b></section><BottomNav/></main>;
 if(error||!data)return <main className={s.page}><header className={s.header}><Link href="/numbers/history">‹</Link><div><h1>Number details</h1><p>Verification order.</p></div></header><section className={s.state}><b>Details unavailable</b><p>{error||"Order not found."}</p><Link href="/numbers/history">Back to number history</Link></section><BottomNav/></main>;
 const b=badge(data),number=numberOf(data),code=codeOf(data),amount=amountOf(data),service=serviceOf(data),country=countryOf(data);
 return <main className={s.page}><header className={s.header}><Link href="/numbers/history">‹</Link><div><h1>Number details</h1><p>{b==="COMPLETED"?"Completed verification order.":b==="REFUNDED"?"Refunded verification order.":"Verification order."}</p></div></header><span className={`${s.status} ${b==="COMPLETED"?s.dark:""}`}>{b}</span><section className={s.card}><small>ORDER ID</small><strong>{reference||"—"}</strong><small>SERVICE</small><strong>{service}{country?` • ${country}`:""}</strong><small>NUMBER</small><b>{number||"Not returned by provider"}</b><small>RECEIVED CODE</small><b>{code||"No code received"}</b></section><div className={s.copyRow}><button type="button" disabled={!number} onClick={()=>copy(number,"number")}>{copied==="number"?"Copied":"Copy number"}</button><button type="button" className={s.primary} disabled={!code} onClick={()=>copy(code,"code")}>{copied==="code"?"Copied":"Copy code"}</button></div><section className={s.receipt}><b>Payment receipt</b><p>{amount!==undefined&&amount!==null?`Paid ${money(amount)} • Wallet • ${b==="COMPLETED"?"Successful":String(data?.status||b)}`:"Payment amount unavailable"}</p><small>Reference {reference||"—"}</small></section><Link className={s.done} href="/numbers/history">Done</Link><BottomNav/></main>;
}
