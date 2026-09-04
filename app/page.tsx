"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BottomNav } from "@/components/BottomNav";
import { api } from "@/lib/api";
import { getSessionToken } from "@/lib/session";

const actions = [
  ["☎️", "Buy Number", "/buy-number"],
  ["📱", "Rent Number", "/rent-number"],
  ["🛍️", "Marketplace", "/marketplace"],
  ["📋", "Orders", "/orders"],
  ["💰", "Add Funds", "/add-funds"],
  ["📩", "Temp Mail", "/temp-mail"],
  ["📈", "Boostly", "/boostly"],
  ["💳", "Wallet", "/wallet"],
] as const;

function resolveBalance(payload: any): number | null {
  const candidates = [payload?.balance_ngn,payload?.wallet_balance_ngn,payload?.balance,payload?.wallet?.balance_ngn,payload?.wallet?.balance,payload?.data?.balance_ngn,payload?.data?.wallet_balance_ngn,payload?.data?.balance];
  for (const value of candidates) { const number = Number(value); if (Number.isFinite(number)) return number; }
  return null;
}

export default function Home() {
  const [balance, setBalance] = useState<number | null>(null);
  const [balanceState, setBalanceState] = useState<"loading" | "ready" | "signed-out" | "error">("loading");
  useEffect(() => { let cancelled=false; async function loadWallet(){const token=getSessionToken();if(!token){if(!cancelled)setBalanceState("signed-out");return}try{const data=await api.wallet.get(token);if(cancelled)return;setBalance(resolveBalance(data));setBalanceState("ready")}catch{if(!cancelled)setBalanceState("error")}}loadWallet();return()=>{cancelled=true}},[]);
  const balanceLabel=balanceState==="loading"?"Loading…":balance!==null?`₦${balance.toLocaleString()}`:"—";
  return <main className="shell"><header className="header"><div><p className="eyebrow">Good morning, Wisdom</p><h1>WickSpend</h1></div><div className="headerActions"><Link href="/notifications" className="circle">🔔</Link><Link href="/profile" className="avatar" aria-label="Profile">W</Link></div></header><section className="balanceCard"><p>Wallet balance</p><strong>{balanceLabel}</strong>{balanceState==="signed-out"&&<small className="statusText">Sign in to view your balance.</small>}{balanceState==="error"&&<small className="statusText">Balance unavailable right now.</small>}<Link href="/add-funds" className="primaryButton">Add funds</Link></section><section><div className="sectionTitle"><h2>Quick actions</h2></div><div className="actionGrid">{actions.map(([icon,label,href])=><Link href={href} className="glassCard" key={href}><span>{icon}</span><b>{label}</b></Link>)}</div></section><section><div className="sectionTitle"><h2>Popular countries</h2></div><div className="chips">{[["🇺🇸","USA"],["🇬🇧","UK"],["🇩🇪","Germany"],["🇳🇬","Nigeria"],["🇨🇦","Canada"],["🇵🇱","Poland"]].map(([flag,name])=><Link href={`/buy-number?country=${encodeURIComponent(name)}`} className="chip" key={name}>{flag} {name}</Link>)}</div></section><BottomNav /></main>;
}
