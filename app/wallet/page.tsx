"use client";
import { useEffect,useState } from "react";
import Link from "next/link";
import { PageShell } from "@/components/PageShell";
import { api } from "@/lib/api";
const session=()=>localStorage.getItem("wickspend_session_token")||localStorage.getItem("wickspend_token")||"";
const money=(value:any)=>{const n=Number(value);return Number.isFinite(n)?`₦${n.toLocaleString()}`:"—"};
export default function Wallet(){
 const[balance,setBalance]=useState("—");const[transactions,setTransactions]=useState<any[]>([]);const[message,setMessage]=useState("Loading wallet…");
 useEffect(()=>{let cancelled=false;async function load(){const t=session();if(!t){setMessage("Please sign in to view your wallet.");return}try{const[w,tx]:any[]=await Promise.all([api.wallet.get(t),api.wallet.transactions(t)]);if(cancelled)return;const b=w?.balance_ngn??w?.wallet_balance_ngn??w?.balance??w?.wallet?.balance_ngn??w?.data?.balance_ngn??w?.data?.balance;setBalance(money(b));const list=Array.isArray(tx)?tx:(tx?.transactions||tx?.items||tx?.data||[]);setTransactions(Array.isArray(list)?list:[]);setMessage("")}catch(e){if(!cancelled)setMessage(e instanceof Error?e.message:"Unable to load wallet")}}load();return()=>{cancelled=true}},[]);
 return <PageShell title="Wallet" subtitle="Balance and funding"><section className="balanceCard"><p>Available balance</p><strong>{balance}</strong><Link className="primaryButton" href="/add-funds">Add funds</Link></section><div className="panel"><h3>Transactions</h3>{transactions.length?<div className="list">{transactions.map((tx:any,i)=>{const amount=tx.amount_ngn??tx.amount??tx.final_amount_ngn;const type=tx.type||tx.kind||tx.category||tx.description||"Transaction";const status=tx.status||"";const date=tx.created_at||tx.date||tx.timestamp;return <div className="listItem" key={tx.id||tx.reference||i}><div><b>{type}</b>{status&&<><br/><small>{status}</small></>}{date&&<><br/><small>{new Date(date).toLocaleString()}</small></>}</div><strong>{money(amount)}</strong></div>})}</div>:<p>{message||"No wallet transactions yet."}</p>}</div>{message&&transactions.length>0&&<div className="panel"><p className="statusText">{message}</p></div>}</PageShell>
}