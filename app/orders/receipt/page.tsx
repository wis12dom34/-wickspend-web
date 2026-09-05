"use client";
import {useEffect,useState} from "react";
import {useRouter} from "next/navigation";
import {BottomNav} from "@/components/BottomNav";
import {api} from "@/lib/api";
import {getSessionToken} from "@/lib/session";
import s from "./receipt.module.css";

const refOf=(o:any)=>String(o?.reference||o?.order_reference||o?.ref||o?.id||"");
const serviceOf=(o:any)=>String(o?.service||o?.product||o?.title||o?.service_name||"WickSpend order");
const amountRaw=(o:any)=>{const ngn=o?.amount_ngn??o?.final_amount_ngn??o?.price_ngn;if(ngn!=null&&Number.isFinite(Number(ngn)))return {value:Number(ngn),currency:"NGN"};const usd=o?.amount_usd??o?.price_usd??o?.amount??o?.price;if(usd!=null&&Number.isFinite(Number(usd)))return {value:Number(usd),currency:"USD"};return null};
const money=(v:number,c:string)=>c==="NGN"?`₦${v.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}`:`$${v.toFixed(2)}`;
const statusOf=(o:any)=>String(o?.status||o?.payment_status||o?.state||"").toLowerCase();
const paidStatus=(o:any)=>/paid|success|successful|completed|delivered/.test(statusOf(o));
const dateOf=(o:any)=>{const raw=o?.paid_at||o?.completed_at||o?.created_at||o?.createdAt;if(!raw)return "—";const d=new Date(raw);return Number.isNaN(d.getTime())?String(raw):d.toLocaleString("en-US",{month:"short",day:"numeric",year:"numeric",hour:"numeric",minute:"2-digit"}).replace(", "," • ")};

export default function Receipt(){
  const router=useRouter();
  const[order,setOrder]=useState<any>(null),[message,setMessage]=useState("Loading receipt…"),[toast,setToast]=useState("");

  useEffect(()=>{
    let live=true;
    const reference=new URLSearchParams(window.location.search).get("reference")||"";
    const token=getSessionToken();
    if(!reference){setMessage("Receipt reference is missing.");return}
    if(!token){setMessage("Please sign in to view this receipt.");return}
    api.orders(token).then((d:any)=>{
      if(!live)return;
      const list=Array.isArray(d)?d:(d?.orders||d?.items||d?.data||[]);
      const hit=(Array.isArray(list)?list:[]).find((x:any)=>refOf(x)===reference);
      if(!hit){setMessage("Receipt not found.");return}
      if(!paidStatus(hit)){setMessage("Receipt is available after payment or delivery is confirmed.");return}
      setOrder(hit);setMessage("");
    }).catch(e=>live&&setMessage(e instanceof Error?e.message:"Unable to load receipt"));
    return()=>{live=false};
  },[]);

  if(!order)return <main className={s.page}><button className={s.back} onClick={()=>router.back()}>‹</button><div className={s.empty}><h1>Receipt</h1><p>{message}</p></div><BottomNav/></main>;

  const ref=refOf(order),amount=amountRaw(order),total=amount?money(amount.value,amount.currency):"—";
  const feeCandidate=amount?.currency==="NGN"?(order?.fee_ngn??order?.fees_ngn??order?.fee??order?.fees):(order?.fee_usd??order?.fees_usd??order?.fee??order?.fees);
  const fees=feeCandidate!=null&&Number.isFinite(Number(feeCandidate))&&amount?money(Number(feeCandidate),amount.currency):"—";
  const qtyRaw=order?.quantity??order?.qty;
  const qty=qtyRaw!=null&&Number.isFinite(Number(qtyRaw))?Number(qtyRaw):null;
  const rateCandidate=amount?.currency==="NGN"?(order?.rate_ngn??order?.rate):(order?.rate_usd??order?.rate);
  const rate=rateCandidate!=null&&Number.isFinite(Number(rateCandidate))&&Number(rateCandidate)>0&&amount?`${money(Number(rateCandidate),amount.currency)} / 1K`:"—";
  const tx=String(order?.transaction_reference||order?.payment_reference||order?.tx_reference||ref);
  const text=`WickSpend Receipt\nOrder: ${ref}\nService: ${serviceOf(order)}\nQuantity: ${qty?.toLocaleString()||"—"}\nRate: ${rate}\nFees: ${fees}\nTotal: ${total}\nPaid from: ${order?.payment_method||"WickSpend Wallet"}\nDate: ${dateOf(order)}\nReference: ${tx}`;

  function download(){
    const blob=new Blob([text],{type:"text/plain;charset=utf-8"}),url=URL.createObjectURL(blob),a=document.createElement("a");
    a.href=url;a.download=`wickspend-receipt-${ref}.txt`;a.click();URL.revokeObjectURL(url);
  }
  async function share(){
    try{if(navigator.share)await navigator.share({title:`WickSpend receipt ${ref}`,text});else{await navigator.clipboard.writeText(text);setToast("Receipt copied")}}catch{}
  }

  return <main className={s.page}>
    <button className={s.back} onClick={()=>router.back()}>‹</button>
    <header><h1>Receipt</h1><p>#{ref}</p></header>
    <section className={s.card}>
      <div className={s.brand}><div><h2>WickSpend</h2><small>PAYMENT RECEIPT</small></div><span>PAID</span></div>
      <div className={s.rows}>
        <div><small>Order ID</small><b>#{ref}</b></div>
        <div><small>Service</small><b>{serviceOf(order)}</b></div>
        <div><small>Quantity</small><b>{qty!=null?qty.toLocaleString():"—"}</b></div>
        <div><small>Rate</small><b>{rate}</b></div>
        <div><small>Subtotal</small><b>{total}</b></div>
        <div><small>Fees</small><b>{fees}</b></div>
        <div><small>Total</small><b>{total}</b></div>
        <div><small>Paid from</small><b>{order?.payment_method||"WickSpend Wallet"}</b></div>
        <div><small>Date</small><b>{dateOf(order)}</b></div>
      </div>
    </section>
    <section className={s.reference}><b>Transaction reference</b><p>{tx}</p></section>
    <button className={s.primary} onClick={download}>Download receipt</button>
    <button className={s.secondary} onClick={share}>Share receipt</button>
    {toast&&<div className={s.toast}>{toast}</div>}
    <BottomNav/>
  </main>
}
