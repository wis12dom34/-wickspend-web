"use client";

import {useEffect,useState} from "react";
import Link from "next/link";
import {useRouter} from "next/navigation";
import {BottomNav} from "@/components/BottomNav";
import {api} from "@/lib/api";
import {getSessionToken} from "@/lib/session";
import s from "../temp-mail.module.css";

const payloadOf=(x:any)=>x?.order||x?.data?.order||x?.data||x;
const emailOf=(x:any)=>String(x?.email||x?.address||x?.email_address||x?.mail||x?.mailbox||x?.mailbox_address||x?.inbox_address||x?.data?.email||x?.data?.address||x?.data?.email_address||"");
const terminal=(status:string)=>/expired|complete|cancel|refunded|closed|failed/i.test(status);
const staleOf=(x:any)=>{const raw=x?.expires_at||x?.expiresAt||"",ms=raw?new Date(raw).getTime():NaN;return /processing|pending/i.test(String(x?.status||""))&&Number.isFinite(ms)&&ms<=Date.now()&&!emailOf(x)};

export default function MailCreated(){
  const router=useRouter();
  const[reference,setReference]=useState("");
  const[order,setOrder]=useState<any>(null),[message,setMessage]=useState("Loading your new mailbox…");
  useEffect(()=>{const r=new URLSearchParams(window.location.search).get("reference")||"";if(!r){router.replace("/temp-mail");return}setReference(r)},[router]);
  useEffect(()=>{if(!reference)return;let stopped=false;let cached:any=null;try{const raw=sessionStorage.getItem(`wickspend.tempMailOrder.${reference}`);if(raw)cached=JSON.parse(raw)}catch{}if(cached)setOrder(cached);const token=getSessionToken();if(!token){setMessage(cached?"":"Please sign in to open this mailbox.");return}const load=async()=>{try{const d:any=await api.tempMail.status(token,reference);if(stopped)return;const next=payloadOf(d);setOrder(next);sessionStorage.setItem(`wickspend.tempMailOrder.${reference}`,JSON.stringify(next));const email=emailOf(next),status=String(next?.status||"");setMessage(email?"":staleOf(next)?"This mailbox was not created before its expiry window.":terminal(status)?"Email address was not returned for this order.":"Preparing your email address…");return !!email||terminal(status)||staleOf(next)}catch(e){if(!stopped)setMessage(e instanceof Error?e.message:"Unable to load mailbox");return false}};let timer:number|undefined;(async()=>{const done=await load();if(done||stopped)return;timer=window.setInterval(async()=>{const finished=await load();if(finished&&timer)window.clearInterval(timer)},2500)})();return()=>{stopped=true;if(timer)window.clearInterval(timer)}},[reference]);
  const email=emailOf(order);const stale=staleOf(order);const status=String(order?.status||"Active");const expiry=String(order?.expires_in||order?.expires_at||order?.remaining||order?.ttl||"");const expiryLabel=(()=>{if(!expiry)return "";const d=new Date(expiry);return Number.isNaN(d.getTime())?expiry:d.toLocaleString([],{month:"short",day:"numeric",hour:"numeric",minute:"2-digit"})})();
  async function copy(){if(!email)return;try{await navigator.clipboard.writeText(email);setMessage("Email copied.")}catch{setMessage("Unable to copy email.")}}
  return <main className={s.page}><div className={s.topbar}><button className={s.back} onClick={()=>router.replace("/temp-mail")} aria-label="Back to Temp Mail">‹</button><div><h1>Mail Created</h1><div className={s.step}>Step 4 of 4</div></div><span/></div><section className={`${s.panel} ${s.success}`}><div className={s.successIcon}>✓</div><h1>{email?"Temp Mail ready":stale?"Mailbox unavailable":"Creating your email"}</h1><p>{email?"Your new email address is ready to receive messages.":stale?"This mailbox did not finish creating before its expiry window.":"WickSpend is preparing your temporary email address."}</p><div className={s.emailBox}><small>YOUR TEMP EMAIL</small><div className={s.emailAddress}>{email||(stale?"Mailbox was not created":"Preparing email address…")}</div><div className={s.inlineActions}><button onClick={copy} disabled={!email}>Copy email</button><span className={s.statusPill}>{stale?"Expired":status}</span></div></div><div className={s.spacer}/>{expiryLabel&&<div className={s.row}><span>Expiration</span><strong>{expiryLabel}</strong></div>}<div className={s.row}><span>Order status</span><strong>{status}</strong></div></section><div className={s.twoActions}><Link className={s.primary} href={`/temp-mail/inbox/${encodeURIComponent(reference)}`} style={{display:"grid",placeItems:"center",textDecoration:"none"}}>Open Inbox</Link><Link className={s.secondary} href="/temp-mail" style={{display:"grid",placeItems:"center",textDecoration:"none"}}>Back to Temp Mail</Link></div>{message&&<p className={s.screenMessage} role="status">{message}</p>}<BottomNav/></main>
}
