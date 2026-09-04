"use client";
import { useEffect,useState } from "react";
import Link from "next/link";
import { PageShell } from "@/components/PageShell";
import { api } from "@/lib/api";
export default function Wallet(){const [balance,setBalance]=useState("—");useEffect(()=>{const t=localStorage.getItem("wickspend_token");if(!t)return;api.wallet.get(t).then((d:any)=>setBalance(`₦${Number(d?.balance_ngn??d?.balance??0).toLocaleString()}`)).catch(()=>{})},[]);return <PageShell title="Wallet" subtitle="Balance and funding"><section className="balanceCard"><p>Available balance</p><strong>{balance}</strong><Link className="primaryButton" href="/add-funds">Add funds</Link></section><div className="panel"><h3>Transactions</h3><p>Your recent wallet activity will appear here after authentication.</p></div></PageShell>}
