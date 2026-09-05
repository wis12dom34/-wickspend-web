"use client";

import {FormEvent,useRef,useState} from "react";
import {useRouter} from "next/navigation";
import {BottomNav} from "@/components/BottomNav";
import {api} from "@/lib/api";
import {getSessionToken} from "@/lib/session";
import styles from "./add-funds.module.css";

const presets=[1000,2500,5000,10000];
function paymentUrl(payload:any){const raw=payload?.checkout_url||payload?.payment_url||payload?.authorization_url||payload?.data?.checkout_url||payload?.data?.payment_url||payload?.data?.authorization_url;if(!raw)return"";try{const url=new URL(String(raw),window.location.origin);return url.protocol==="https:"||url.protocol==="http:"?url.toString():""}catch{return""}}
const money=(n:number)=>`₦${n.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}`;

export default function AddFunds(){
  const router=useRouter();
  const[amount,setAmount]=useState("3500"),[busy,setBusy]=useState(false),[message,setMessage]=useState("");
  const requestSeq=useRef(0);
  const value=Number(amount),valid=Number.isFinite(value)&&Number.isInteger(value)&&value>=500;
  async function submit(e:FormEvent){e.preventDefault();if(busy)return;const token=getSessionToken();if(!token){setMessage("Please sign in first.");return}if(!valid){setMessage("Enter a whole amount of at least ₦500.");return}const seq=++requestSeq.current;setBusy(true);setMessage("Creating secure payment…");try{const r:any=await api.wallet.initializeFunding(token,value);if(seq!==requestSeq.current)return;const url=paymentUrl(r);if(!url)throw new Error("A valid payment link was not returned by the funding service.");setMessage("Redirecting to secure payment…");window.location.assign(url)}catch(err){if(seq===requestSeq.current)setMessage(err instanceof Error?err.message:"Unable to initialize funding")}finally{if(seq===requestSeq.current)setBusy(false)}}
  return <main className="shell appShell"><div className={styles.screen}>
    <header className={styles.header}><button type="button" onClick={()=>router.back()} aria-label="Back">‹</button><div><h1>Add funds</h1><p>Enter how much you want to add</p></div></header>
    <form onSubmit={submit} aria-busy={busy}>
      <label className={styles.eyebrow} htmlFor="fundingAmount">AMOUNT</label>
      <div className={styles.amountBox}><span>₦</span><input id="fundingAmount" aria-label="Amount in NGN" type="number" min="500" step="1" inputMode="numeric" value={amount} disabled={busy} onChange={e=>{requestSeq.current++;setAmount(e.target.value);setMessage("")}}/></div>
      <p className={styles.minimum}>Minimum funding • ₦500 equivalent</p>
      <h2>Quick amounts</h2>
      <div className={styles.presets}>{presets.map(v=><button type="button" key={v} className={Number(amount)===v?styles.active:""} aria-pressed={Number(amount)===v} disabled={busy} onClick={()=>{requestSeq.current++;setAmount(String(v));setMessage("")}}>₦{v.toLocaleString()}</button>)}</div>
      <section className={styles.summary}><h3>Funding summary</h3><div><span>You add</span><b>{valid?money(value):"—"}</b></div><div><span>Fee</span><span>Shown before payment</span></div></section>
      <button className={styles.cta} type="submit" disabled={busy||!valid}>{busy?"Preparing payment…":"Continue to payment"}</button>
      <button className={styles.cancel} type="button" disabled={busy} onClick={()=>router.back()}>Cancel</button>
      {message&&<p className={styles.message} role="status">{message}</p>}
    </form>
  </div><BottomNav/></main>
}
