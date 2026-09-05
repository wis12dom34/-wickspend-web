"use client";

import {useEffect,useState} from "react";
import Link from "next/link";
import {BottomNav} from "@/components/BottomNav";
import {api} from "@/lib/api";
import {getSessionToken} from "@/lib/session";
import s from "./success.module.css";

const refOf=(o:any)=>String(o?.reference||o?.order_reference||o?.ref||o?.id||"");
const statusOf=(o:any)=>String(o?.status||o?.state||"");
const money=(value:any)=>{const n=Number(value);return Number.isFinite(n)?`₦${n.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}`:"—"};
const paidOf=(o:any)=>o?.final_amount_ngn??o?.amount_ngn??o?.price_ngn??o?.total_ngn??o?.amount??null;

export default function WickAISuccess(){
  const[order,setOrder]=useState<any>(null),[loading,setLoading]=useState(true),[message,setMessage]=useState("Checking order…");
  useEffect(()=>{let cancelled=false;(async()=>{const reference=new URLSearchParams(window.location.search).get("reference")||"";if(!reference){setMessage("A confirmed order reference is required.");setLoading(false);return}const token=getSessionToken();if(!token){setMessage("Please sign in to verify this order.");setLoading(false);return}try{const payload:any=await api.orders(token),list=Array.isArray(payload)?payload:(payload?.orders||payload?.items||payload?.data||[]),found=(Array.isArray(list)?list:[]).find((x:any)=>refOf(x)===reference);if(cancelled)return;if(!found){setMessage("This order could not be confirmed yet.");return}const status=statusOf(found);if(/failed|cancel|refund|error/i.test(status)){setMessage(`This order is currently ${status||"not completed"}.`);return}setOrder(found);setMessage("")}catch(e){if(!cancelled)setMessage(e instanceof Error?e.message:"Unable to verify this order.")}finally{if(!cancelled)setLoading(false)}})();return()=>{cancelled=true}},[]);
  const reference=refOf(order),paid=paidOf(order),service=order?.service_name||order?.service||order?.title||"WickSpend order",country=order?.country_name||order?.country||order?.country_code||"United States";
  return <main className={s.page}>
    {loading||!order?<section className={s.pending}><div className={s.icon}>!</div><h1>{loading?"Verifying purchase":"Order not confirmed"}</h1><p>{message}</p><Link className={s.primary} href="/orders">Check Orders</Link><Link className={s.secondary} href="/wick-ai">Back to Wick AI</Link></section>:<><div className={s.check}>✓</div><h1>Purchase complete</h1><p className={s.subtitle}>Your order was confirmed by WickSpend.</p><section className={s.card}><small>ORDER</small><h2>{service}</h2><p>{[country,order?.service_name||order?.service].filter(Boolean).join(" • ")}</p><dl><div><dt>Order ID</dt><dd>#{reference}</dd></div><div><dt>Paid</dt><dd>{money(paid)}</dd></div></dl></section><div className={s.note}>Next: open the order progress for the latest provider status.</div><Link className={s.primary} href={reference?`/orders?reference=${encodeURIComponent(reference)}`:"/orders"}>View order progress</Link><Link className={s.secondary} href="/wick-ai">Back to Wick AI</Link></>}
    <BottomNav/>
  </main>
}
