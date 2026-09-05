"use client";

import {useEffect,useState} from "react";
import Link from "next/link";
import {BottomNav} from "@/components/BottomNav";
import {api} from "@/lib/api";
import {getSessionToken} from "@/lib/session";
import styles from "./currency-balance.module.css";

type Currency={code:string;name:string;symbol:string};
const currencies:Currency[]=[
  {code:"NGN",name:"Nigerian Naira",symbol:"₦"},
  {code:"GHS",name:"Ghanaian Cedi",symbol:"GH₵"},
  {code:"KES",name:"Kenyan Shilling",symbol:"KSh"},
  {code:"ZAR",name:"South African Rand",symbol:"R"},
  {code:"XAF",name:"Central African CFA",symbol:"FCFA"},
  {code:"XOF",name:"West African CFA",symbol:"CFA"},
  {code:"USDT",name:"Tether",symbol:"₮"},
  {code:"USDC",name:"USD Coin",symbol:"$"},
];
const balanceOf=(v:any)=>v?.balance_ngn??v?.wallet_balance_ngn??v?.balance??v?.wallet?.balance_ngn??v?.data?.balance_ngn??v?.data?.balance;
const moneyNgn=(v:any)=>{const n=Number(v);return Number.isFinite(n)?`₦${n.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}`:"—"};

export default function CurrencyBalance(){
  const[view,setView]=useState<"overview"|"select">("overview");
  const[currency,setCurrency]=useState("NGN");
  const[balance,setBalance]=useState<any>(null);
  const[saved,setSaved]=useState(false);
  useEffect(()=>{const stored=localStorage.getItem("wickspend_display_currency");if(stored&&currencies.some(c=>c.code===stored))setCurrency(stored);const token=getSessionToken();if(token)api.wallet.get(token).then((v:any)=>setBalance(balanceOf(v))).catch(()=>setBalance(null))},[]);
  function choose(code:string){localStorage.setItem("wickspend_display_currency",code);setCurrency(code);setSaved(true);setTimeout(()=>setSaved(false),1800);setView("overview")}
  const selected=currencies.find(c=>c.code===currency)||currencies[0];
  if(view==="select")return <main className={styles.page}><header className={styles.selectHeader}><button className={styles.back} type="button" aria-label="Back" onClick={()=>setView("overview")}>‹</button><div><h1>Select currency</h1><p>Choose how prices and balance appear</p></div></header><section className={styles.choices}>{currencies.map(c=><button key={c.code} type="button" className={`${styles.choice} ${currency===c.code?styles.active:""}`} onClick={()=>choose(c.code)}><div><b>{c.code}</b><small>{c.name}</small></div><strong>{c.symbol}</strong></button>)}</section><div className={styles.note}>Your selection updates display preference only. Checkout totals remain controlled by WickSpend backend pricing.</div><BottomNav/></main>;
  return <main className={styles.page}><header className={styles.header}><h1>Currency &amp; Balance</h1><p>Manage how prices and wallet values are shown.</p></header><section className={styles.balanceCard}><span className={styles.eyebrow}>AVAILABLE BALANCE</span><div className={styles.balance}>{moneyNgn(balance)}</div><p className={styles.preferred}>Preferred currency • {selected.code}</p><div className={styles.balanceActions}><Link className={styles.fund} href="/add-funds">Add funds</Link><button className={styles.change} type="button" onClick={()=>setView("select")}>Change currency</button></div></section><h2 className={styles.sectionTitle}>Display currency</h2><button className={styles.displayCard} type="button" onClick={()=>setView("select")}><span><strong>{selected.name}</strong><small>{selected.code} • {selected.symbol}</small></span><em>›</em></button><h2 className={styles.sectionTitle}>Supported currencies</h2><section className={styles.supported}>{currencies.map(c=><div className={styles.currencyRow} key={c.code}><b>{c.code}</b><span>{c.name}</span></div>)}</section>{saved&&<div className={styles.saved} role="status">Display currency updated to {selected.code}.</div>}<BottomNav/></main>;
}
