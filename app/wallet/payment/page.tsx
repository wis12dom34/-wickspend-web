"use client";

import Link from "next/link";
import {useEffect,useMemo,useState} from "react";
import {BottomNav} from "@/components/BottomNav";
import {api} from "@/lib/api";
import {getSessionToken} from "@/lib/session";
import styles from "./payment.module.css";

type PaymentState="processing"|"success"|"pending"|"failed";
const money=(v:any)=>{const n=Number(v);return Number.isFinite(n)?`₦${n.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}`:"—"};
const refOf=(o:any)=>String(o?.reference||o?.transaction_reference||o?.payment_reference||o?.ref||o?.id||"");
const statusOf=(o:any)=>String(o?.status||o?.payment_status||o?.state||"").toLowerCase();

export default function WalletPayment(){
  const[state,setState]=useState<PaymentState>("processing");
  const[amount,setAmount]=useState("");
  const[reference,setReference]=useState("");
  const[newBalance,setNewBalance]=useState("");
  const[returnTo,setReturnTo]=useState("/wallet");
  const[busy,setBusy]=useState(false);
  const[message,setMessage]=useState("");

  useEffect(()=>{
    const q=new URLSearchParams(window.location.search);
    const raw=String(q.get("status")||q.get("state")||"processing").toLowerCase();
    setState(/success|successful|paid|completed/.test(raw)?"success":/fail|failed|cancel/.test(raw)?"failed":/pending/.test(raw)?"pending":"processing");
    setAmount(q.get("amount_ngn")||q.get("amount")||"");
    setReference(q.get("reference")||q.get("ref")||"");
    const requested=q.get("return_to")||q.get("returnTo")||"";
    if(requested&&requested.startsWith("/")&&!requested.startsWith("//"))setReturnTo(requested);
  },[]);

  useEffect(()=>{
    if(state!=="success")return;
    const token=getSessionToken();
    if(!token)return;
    api.wallet.get(token).then((w:any)=>{
      const raw=w?.balance_ngn??w?.wallet_balance_ngn??w?.balance??w?.wallet?.balance_ngn??w?.data?.balance_ngn??w?.data?.balance;
      if(raw!==undefined&&raw!==null)setNewBalance(money(raw));
    }).catch(()=>{});
  },[state]);

  const displayAmount=useMemo(()=>amount?money(amount):"—",[amount]);

  async function refreshPending(){
    if(busy)return;
    const token=getSessionToken();
    if(!token){setMessage("Please sign in to check payment status.");return;}
    if(!reference){setMessage("Payment reference is missing. Check Wallet → Transactions for the latest status.");return;}
    setBusy(true);setMessage("Checking payment status…");
    try{
      const r:any=await api.wallet.transactions(token);
      const list=Array.isArray(r)?r:(r?.transactions||r?.items||r?.data||[]);
      const match=Array.isArray(list)?list.find((tx:any)=>refOf(tx)===reference):null;
      if(!match){setState("pending");setMessage("Payment is still awaiting confirmation.");return;}
      const status=statusOf(match);
      if(/success|successful|paid|completed/.test(status)){setAmount(String(match?.amount_ngn??match?.amount??amount));setState("success");setMessage("");}
      else if(/fail|failed|cancel|reversed/.test(status)){setState("failed");setMessage("");}
      else{setState("pending");setMessage("Payment is still awaiting confirmation.");}
    }catch(e){setMessage(e instanceof Error?e.message:"Unable to refresh payment status");}
    finally{setBusy(false);}
  }

  const checking=state==="processing"||state==="pending";
  return <main className="shell appShell">
    <div className={styles.screen}>
      {checking&&<>
        <div className={styles.statusIcon}>•••</div>
        <header className={styles.centerHeader}><h1>Verifying payment</h1><p>We’re checking your transfer status.</p></header>
        <section className={styles.paymentCard}>
          <div className={styles.paymentTop}><small>PAYMENT</small><span>{state==="pending"?"PENDING":"CHECKING"}</span></div>
          <strong className={styles.paymentAmount}>{displayAmount}</strong>
          <b className={styles.method}>Bank transfer</b>
          <p>Reference • {reference||"Awaiting reference"}</p>
        </section>
        <section className={styles.infoCard}><b>No need to pay again</b><p>Keep this screen open while the transfer is verified.</p><p>Your wallet updates automatically after confirmation.</p></section>
        <button className={styles.outlineButton} type="button" onClick={refreshPending} disabled={busy}>{busy?"Checking…":"Check payment status"}</button>
        <p className={styles.safeNote}>You can safely return later from Wallet → Transactions.</p>
      </>}

      {state==="success"&&<>
        <div className={`${styles.statusIcon} ${styles.successIcon}`}>✓</div>
        <header className={styles.centerHeader}><h1>Wallet funded</h1><p>{displayAmount} was added successfully.</p></header>
        <section className={styles.balanceCard}><small>NEW BALANCE</small><strong>{newBalance||"Updated"}</strong><p>Added today • {displayAmount}</p><p>Reference • {reference||"—"}</p></section>
        <Link href={returnTo} className={styles.primaryButton}>Return to checkout</Link>
        <Link href="/wallet" className={styles.outlineLink}>View wallet</Link>
        <section className={styles.receiptCard}><b>Payment receipt saved</b><p>This funding transaction is available in your wallet history.</p></section>
      </>}

      {state==="failed"&&<div className={styles.failedScreen}>
        <header className={styles.walletHeader}><h1>Wallet</h1><p>Manage your balance and transactions.</p></header>
        <section className={styles.failedCard}>
          <h2>Payment Failed</h2>
          <p className={styles.failedCopy}>The payment could not be completed.<br/>No funds were added to your wallet.</p>
          <div className={styles.failedDetails}><div><small>Amount</small><strong>{displayAmount}</strong></div><div><small>Reference</small><strong>{reference||"—"}</strong></div></div>
          <div className={styles.failedActions}><Link href="/add-funds" className={styles.failedPrimary}>Try Again</Link><Link href="/payment-methods" className={styles.failedSecondary}>Change Method</Link></div>
        </section>
      </div>}

      {message&&<p className={styles.message} role="status">{message}</p>}
    </div>
    <BottomNav/>
  </main>;
}
