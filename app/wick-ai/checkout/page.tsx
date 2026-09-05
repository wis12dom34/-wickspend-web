"use client";

import {useEffect,useState} from "react";
import Link from "next/link";
import {BottomNav} from "@/components/BottomNav";
import {api} from "@/lib/api";
import {getSessionToken} from "@/lib/session";
import s from "./checkout.module.css";

const priceNgn=(p:any)=>p?.price_ngn??p?.final_price_ngn??p?.amount_ngn??null;
const balanceNgn=(p:any)=>p?.balance_ngn??p?.wallet_balance_ngn??p?.wallet?.balance_ngn??p?.data?.balance_ngn??p?.data?.wallet_balance_ngn??p?.balance??null;
const money=(value:any)=>{const n=Number(value);return Number.isFinite(n)?`₦${n.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}`:"—"};

export default function WickAICheckout(){
  const[price,setPrice]=useState<number|null>(null),[balance,setBalance]=useState<number|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState("");
  useEffect(()=>{let cancelled=false;(async()=>{try{const token=getSessionToken();const [catalog,wallet]:any[]=await Promise.all([api.numbers.prices("","US","telegram"),token?api.wallet.get(token):Promise.resolve(null)]);if(cancelled)return;const list=Array.isArray(catalog)?catalog:(catalog?.prices||catalog?.items||catalog?.data||[]),values=(Array.isArray(list)?list:[]).map((x:any)=>Number(priceNgn(x))).filter((n:number)=>Number.isFinite(n)&&n>0);setPrice(values.length?Math.min(...values):null);const raw=balanceNgn(wallet),n=Number(raw);setBalance(raw!==null&&raw!==undefined&&Number.isFinite(n)?n:null)}catch(e){if(!cancelled)setError(e instanceof Error?e.message:"Unable to prepare checkout.")}finally{if(!cancelled)setLoading(false)}})();return()=>{cancelled=true}},[]);
  const after=price!==null&&balance!==null?balance-price:null;
  return <main className={s.page}>
    <header className={s.header}><Link href="/wick-ai" aria-label="Back">‹</Link><h1>Wick AI</h1></header>
    <h2>Review your order</h2><p className={s.subtitle}>Confirm the details before continuing to checkout.</p>
    <section className={s.card}><h3>USA Telegram Number</h3><p>United States • Telegram</p><dl><div><dt>Price</dt><dd>{loading?"Checking…":money(price)}</dd></div><div><dt>Wallet balance</dt><dd>{loading?"Checking…":money(balance)}</dd></div><div><dt>After purchase</dt><dd>{after===null?"—":after>=0?money(after):"Insufficient balance"}</dd></div></dl></section>
    <section className={s.note}><b>Current live price shown for this checkout.</b><p>The wallet is only charged by the verified Buy Number purchase flow after you confirm there.</p></section>
    {error&&<p className={s.error} role="alert">{error}</p>}
    <Link className={s.primary} href="/buy-number?country=USA&service=Telegram">{price?`Continue to checkout ${money(price).replace(".00","")}`:"Continue to Buy Number"}</Link>
    <Link className={s.secondary} href="/wick-ai">Change order</Link>
    <BottomNav/>
  </main>
}
