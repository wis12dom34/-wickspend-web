"use client";

import Link from "next/link";
import {useEffect,useMemo,useState} from "react";
import {PageShell} from "@/components/PageShell";
import {api} from "@/lib/api";
import {getSessionToken} from "@/lib/session";
import styles from "./payment.module.css";

type PaymentState="processing"|"success"|"pending"|"failed";
const money=(v:any)=>{const n=Number(v);return Number.isFinite(n)?`₦${n.toLocaleString()}`:"—"};
const refOf=(o:any)=>String(o?.reference||o?.transaction_reference||o?.payment_reference||o?.ref||o?.id||"");
const statusOf=(o:any)=>String(o?.status||o?.payment_status||o?.state||"").toLowerCase();

export default function WalletPayment(){
  const[state,setState]=useState<PaymentState>("processing");
  const[amount,setAmount]=useState("");
  const[reference,setReference]=useState("");
  const[newBalance,setNewBalance]=useState("");
  const[busy,setBusy]=useState(false);
  const[message,setMessage]=useState("");

  useEffect(()=>{
    const q=new URLSearchParams(window.location.search);
    const raw=String(q.get("status")||q.get("state")||"processing").toLowerCase();
    setState(/success|successful|paid|completed/.test(raw)?"success":/fail|failed|cancel/.test(raw)?"failed":/pending|processing/.test(raw)?(raw.includes("pending")?"pending":"processing"):"processing");
    setAmount(q.get("amount_ngn")||q.get("amount")||"");
    setReference(q.get("reference")||q.get("ref")||"");
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
    if(!token){setMessage("Please sign in to refresh payment status.");return;}
    if(!reference){setMessage("Payment reference is missing. Return to Wallet and check your recent transactions.");return;}
    setBusy(true);setMessage("Checking payment status…");
    try{
      const r:any=await api.wallet.transactions(token);
      const list=Array.isArray(r)?r:(r?.transactions||r?.items||r?.data||[]);
      const match=Array.isArray(list)?list.find((tx:any)=>refOf(tx)===reference):null;
      if(!match){setMessage("Payment is still awaiting confirmation.");return;}
      const status=statusOf(match);
      if(/success|successful|paid|completed/.test(status)){setAmount(String(match?.amount_ngn??match?.amount??amount));setState("success");setMessage("");}
      else if(/fail|failed|cancel|reversed/.test(status)){setState("failed");setMessage("");}
      else setMessage("Payment is still awaiting confirmation.");
    }catch(e){setMessage(e instanceof Error?e.message:"Unable to refresh payment status");}
    finally{setBusy(false);}
  }

  return <PageShell title="" subtitle="">
    <div className={styles.screen}>
      <header className={styles.hero}><h1>Wallet</h1><p>Manage your balance and transactions.</p></header>

      {state==="processing"&&<>
        <section className={styles.card}>
          <h2>Processing Payment</h2>
          <p className={styles.lead}>Please keep this screen open while we confirm your payment.</p>
          <div className={styles.pulse}>•••</div>
          <div className={styles.rows}><div className={styles.row}><span>Amount</span><strong>{displayAmount}</strong></div><div className={styles.row}><span>Status</span><strong>Processing</strong></div></div>
        </section>
        <p className={styles.note}>Duplicate payment attempts are blocked.</p>
      </>}

      {state==="success"&&<section className={`${styles.card} ${styles.successCard}`}>
        <h2>Funds Added</h2><div className={styles.amount}>{displayAmount}</div>
        <div className={styles.rows}><div className={styles.row}><span>New Balance</span><strong>{newBalance||"Updated"}</strong></div><div className={styles.row}><span>Transaction Reference</span><strong>{reference||"—"}</strong></div><div className={styles.row}><span>Status</span><strong>Successful</strong></div></div>
        <Link href="/wallet" className={styles.button}>Back to Wallet</Link>
      </section>}

      {state==="pending"&&<section className={`${styles.card} ${styles.pendingCard}`}>
        <h2>Payment Pending</h2><p className={styles.lead}>We are waiting for final confirmation. Your balance will update automatically once confirmed.</p>
        <div className={styles.rows}><div className={styles.row}><span>Amount</span><strong>{displayAmount}</strong></div><div className={styles.row}><span>Reference</span><strong>{reference||"—"}</strong></div></div>
        <button type="button" className={`${styles.button} ${styles.refresh}`} onClick={refreshPending} disabled={busy}>{busy?"Checking…":"Refresh Status"}</button>
      </section>}

      {state==="failed"&&<section className={`${styles.card} ${styles.failedCard}`}>
        <h2>Payment Failed</h2><p className={styles.lead}>The payment could not be completed. No funds were added to your wallet.</p>
        <div className={styles.rows}><div className={styles.row}><span>Amount</span><strong>{displayAmount}</strong></div><div className={styles.row}><span>Reference</span><strong>{reference||"—"}</strong></div></div>
        <div className={styles.actions}><Link href="/add-funds" className={styles.button}>Try Again</Link><Link href="/add-funds" className={`${styles.button} ${styles.secondary}`}>Change Method</Link></div>
      </section>}

      {message&&<p className={styles.message} role="status">{message}</p>}
    </div>
  </PageShell>;
}
