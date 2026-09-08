"use client";

import {useEffect,useState} from "react";
import {useRouter} from "next/navigation";
import {BottomNav} from "@/components/BottomNav";
import {api} from "@/lib/api";
import {getSessionToken} from "@/lib/session";
import s from "../temp-mail.module.css";

const ngn=(v:any)=>Number.isFinite(Number(v))?`₦${Number(v).toLocaleString("en-NG")}`:"—";
const priceOf=(p:any)=>p?.price_ngn??p?.final_price_ngn??p?.data?.price_ngn??p?.data?.final_price_ngn;
const balanceOf=(w:any)=>w?.balance_ngn??w?.wallet_balance_ngn??w?.balance??w?.data?.balance_ngn??w?.data?.balance;

export default function ConfigureMail(){
  const router=useRouter();
  const[draft,setDraft]=useState<any>(null),[price,setPrice]=useState<any>(null),[balance,setBalance]=useState<any>(null),[message,setMessage]=useState("Loading your options…");
  useEffect(()=>{let alive=true;const raw=sessionStorage.getItem("wickspend.tempMailDraft");if(!raw){router.replace("/temp-mail");return}let d:any;try{d=JSON.parse(raw)}catch{router.replace("/temp-mail");return}setDraft(d);(async()=>{try{const token=getSessionToken();const [p,w]:any[]=await Promise.all([api.tempMail.price(d.service_code),token?api.wallet.get(token):Promise.resolve(null)]);if(!alive)return;setPrice(p);setBalance(balanceOf(w));setMessage("")}catch(e){if(alive)setMessage(e instanceof Error?e.message:"Unable to load this Temp Mail option")}})();return()=>{alive=false}},[router]);
  function next(){if(!draft||priceOf(price)==null)return;sessionStorage.setItem("wickspend.tempMailDraft",JSON.stringify({...draft,price}));router.push("/temp-mail/review")}
  return <main className={s.page}><div className={s.topbar}><button className={s.back} onClick={()=>router.back()} aria-label="Back">‹</button><div><h1>Configure Mail</h1><div className={s.step}>Step 2 of 4</div></div><span/></div><div className={s.stack}><section className={s.panel}><h2 className={s.summaryTitle}>Your Temp Mail</h2><p className={s.summaryText}>This service only needs the option already supported by the existing Temp Mail backend.</p><div className={s.row}><span>Service</span><strong>{draft?.service_name||"Temp Mail"}</strong></div><div className={s.row}><span>Price</span><strong>{ngn(priceOf(price))}</strong></div><div className={s.row}><span>Wallet balance</span><strong>{ngn(balance)}</strong></div></section><section className={s.notice}>No extra duration or provider options are being invented here. WickSpend will use the configuration exposed by the current Temp Mail service.</section></div><div className={s.stickyAction}><button className={s.primary} disabled={!draft||priceOf(price)==null} onClick={next}>Continue</button></div>{message&&<p className={s.screenMessage}>{message}</p>}<BottomNav/></main>
}
