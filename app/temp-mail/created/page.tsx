"use client";

import {useEffect,useState} from "react";
import Link from "next/link";
import {useRouter,useSearchParams} from "next/navigation";
import {BottomNav} from "@/components/BottomNav";
import {api} from "@/lib/api";
import {getSessionToken} from "@/lib/session";
import s from "../temp-mail.module.css";

const payloadOf=(x:any)=>x?.order||x?.data||x;

export default function MailCreated(){
  const router=useRouter(),params=useSearchParams(),reference=params.get("reference")||"";
  const[order,setOrder]=useState<any>(null),[message,setMessage]=useState("Loading your new mailbox…");
  useEffect(()=>{if(!reference){router.replace("/temp-mail");return}let cached:any=null;try{const raw=sessionStorage.getItem(`wickspend.tempMailOrder.${reference}`);if(raw)cached=JSON.parse(raw)}catch{}if(cached)setOrder(cached);const token=getSessionToken();if(!token){setMessage(cached?"":"Please sign in to open this mailbox.");return}api.tempMail.status(token,reference).then((d:any)=>{const next=payloadOf(d);setOrder(next);sessionStorage.setItem(`wickspend.tempMailOrder.${reference}`,JSON.stringify(next));setMessage("")}).catch(e=>setMessage(e instanceof Error?e.message:"Unable to load mailbox"))},[reference,router]);
  const email=String(order?.email||order?.address||order?.email_address||"");const status=String(order?.status||"Active");const expiry=String(order?.expires_in||order?.expires_at||order?.remaining||order?.ttl||"");
  async function copy(){if(!email)return;try{await navigator.clipboard.writeText(email);setMessage("Email copied.")}catch{setMessage("Unable to copy email.")}}
  return <main className={s.page}><div className={s.topbar}><button className={s.back} onClick={()=>router.replace("/temp-mail")} aria-label="Back to Temp Mail">‹</button><div><h1>Mail Created</h1><div className={s.step}>Step 4 of 4</div></div><span/></div><section className={`${s.panel} ${s.success}`}><div className={s.successIcon}>✓</div><h1>Temp Mail ready</h1><p>Your new email address is ready to receive messages.</p><div className={s.emailBox}><small>YOUR TEMP EMAIL</small><div className={s.emailAddress}>{email||"Preparing email address…"}</div><div className={s.inlineActions}><button onClick={copy} disabled={!email}>Copy email</button><span className={s.statusPill}>{status}</span></div></div><div className={s.spacer}/>{expiry&&<div className={s.row}><span>Expiration</span><strong>{expiry}</strong></div>}<div className={s.row}><span>Order status</span><strong>{status}</strong></div></section><div className={s.twoActions}><Link className={s.primary} href={`/temp-mail/inbox/${encodeURIComponent(reference)}`} style={{display:"grid",placeItems:"center",textDecoration:"none"}}>Open Inbox</Link><Link className={s.secondary} href="/temp-mail" style={{display:"grid",placeItems:"center",textDecoration:"none"}}>Back to Temp Mail</Link></div>{message&&<p className={s.screenMessage} role="status">{message}</p>}<BottomNav/></main>
}
