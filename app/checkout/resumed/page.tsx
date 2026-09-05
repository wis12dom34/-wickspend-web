"use client";

import Link from "next/link";
import {useEffect,useMemo,useState} from "react";
import {BottomNav} from "@/components/BottomNav";
import {api} from "@/lib/api";
import {getSessionToken} from "@/lib/session";

const money=(v:any)=>{const n=Number(v);return Number.isFinite(n)?`₦${n.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}`:"—"};
const safeReturn=(v:string)=>v.startsWith("/")&&!v.startsWith("//")?v:"/buy-number?country=US&service=telegram";

export default function CheckoutResumed(){
  const[balance,setBalance]=useState<any>(null);
  const[funded,setFunded]=useState<any>(null);
  const[total,setTotal]=useState<any>(null);
  const[returnTo,setReturnTo]=useState("/buy-number?country=US&service=telegram");
  const[country,setCountry]=useState("United States"),[service,setService]=useState("Telegram");
  useEffect(()=>{const q=new URLSearchParams(window.location.search);setFunded(q.get("funded_amount")||q.get("amount"));setTotal(q.get("order_total")||q.get("total"));setReturnTo(safeReturn(q.get("return_to")||"/buy-number?country=US&service=telegram"));setCountry(q.get("country_name")||"United States");setService(q.get("service_name")||"Telegram");const token=getSessionToken();if(token)api.wallet.get(token).then((w:any)=>setBalance(w?.balance_ngn??w?.wallet_balance_ngn??w?.balance??w?.wallet?.balance_ngn??w?.data?.balance_ngn??w?.data?.balance)).catch(()=>{});},[]);
  const product=useMemo(()=>`${country==="United States"?"USA":country} ${service} Number`,[country,service]);
  const canPay=Number.isFinite(Number(total))&&Number.isFinite(Number(balance))&&Number(balance)>=Number(total);
  return <main className="shell appShell"><div className="cr"><header><Link href={returnTo} className="back" aria-label="Back">‹</Link><div><h1>Checkout resumed</h1><p>Your wallet has enough balance now.</p></div></header><section className="notice"><b>Funding applied</b><span>{funded?`${money(funded)} was added to your wallet.`:"Your latest wallet funding is available."}</span></section><h2>Order summary</h2><section className="order"><small>PRODUCT</small><h3>{product}</h3><p>{country} • {service}</p><div className="row"><span>Total</span><strong>{total?money(total):"Confirm in checkout"}</strong></div><div className="row small"><span>Wallet balance</span><strong>{balance!==null?money(balance):"Loading…"}</strong></div></section><Link className={`primary${total&&!canPay?" disabled":""}`} href={returnTo}>{total?`Confirm & pay ${money(total).replace(".00","")}`:"Continue to checkout"}</Link><Link className="secondary" href="/buy-number">Change order</Link><section className="note"><b>Final price locked for checkout</b><p>Your wallet is charged only after you confirm the order in the verified Buy Number flow.</p></section></div><BottomNav/><style>{`body{background:#fbfbfb}.cr{padding:48px 18px 110px;max-width:430px;margin:auto}.cr header{display:flex;gap:32px;align-items:center;margin-bottom:36px}.back{width:42px;height:42px;border:1px solid #e0e0e5;background:#fff;border-radius:50%;display:grid;place-items:center;font-size:30px;line-height:1;text-decoration:none;color:#050505}.cr h1{font-size:24px;margin:0 0 5px}.cr header p,.order p,.notice span,.note p{font-size:10px;color:#6b6b73;margin:0}.notice,.note{background:#f6f7f9;border:1px solid #e0e0e5;border-radius:20px;padding:18px;margin-bottom:36px}.notice{display:grid;gap:10px}.notice b,.note b{font-size:11px}.cr h2{font-size:15px;margin:0 0 14px}.order{background:#fff;border:1px solid #e0e0e5;border-radius:24px;padding:20px 18px;margin-bottom:54px}.order small{font-size:9px;color:#6b6b73;font-weight:600}.order h3{font-size:16px;margin:14px 0 8px}.row{display:flex;justify-content:space-between;align-items:center;margin-top:30px;font-size:10px;color:#6b6b73}.row strong{font-size:18px;color:#050505}.row.small{margin-top:18px}.row.small strong{font-size:11px}.primary,.secondary{height:58px;border-radius:29px;display:flex;align-items:center;justify-content:center;text-decoration:none;font-size:13px;font-weight:600}.primary{background:#050505;color:#fff;margin-bottom:14px}.secondary{height:50px;background:#fff;color:#050505;border:1px solid #e0e0e5;margin-bottom:20px}.primary.disabled{opacity:.55}.note{margin:0}.note p{margin-top:12px;line-height:1.5}@media(min-width:700px){.cr{padding-top:72px}}`}</style></main>;
}
