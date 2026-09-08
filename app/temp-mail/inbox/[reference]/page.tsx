"use client";

import {useCallback,useEffect,useMemo,useState} from "react";
import Link from "next/link";
import {useParams,useRouter} from "next/navigation";
import {BottomNav} from "@/components/BottomNav";
import {api} from "@/lib/api";
import {getSessionToken} from "@/lib/session";
import s from "../../temp-mail.module.css";

const payloadOf=(x:any)=>x?.order||x?.data||x;
const senderOf=(m:any)=>String(m?.sender||m?.from||m?.service||m?.source||"Message");
const subjectOf=(m:any)=>String(m?.subject||m?.title||"Verification email");
const bodyOf=(m:any)=>String(m?.text||m?.message||m?.body||m?.content||"");
const receivedAt=(m:any)=>{const raw=m?.received_at||m?.created_at||m?.createdAt||m?.date||m?.timestamp;if(!raw)return "Received";const d=new Date(raw);return Number.isNaN(d.getTime())?String(raw):d.toLocaleTimeString([],{hour:"numeric",minute:"2-digit"})};

export default function TempMailInbox(){
  const params=useParams<{reference:string}>(),router=useRouter(),reference=decodeURIComponent(String(params.reference||""));
  const[order,setOrder]=useState<any>(null),[message,setMessage]=useState("Loading inbox…"),[refreshing,setRefreshing]=useState(false);
  const load=useCallback(async(silent=false)=>{const token=getSessionToken();if(!token){setMessage("Please sign in to open this inbox.");return}if(!silent)setRefreshing(true);try{const d:any=await api.tempMail.status(token,reference);const next=payloadOf(d);setOrder(next);sessionStorage.setItem(`wickspend.tempMailOrder.${reference}`,JSON.stringify(next));setMessage("")}catch(e){setMessage(e instanceof Error?e.message:"Unable to refresh inbox")}finally{if(!silent)setRefreshing(false)}},[reference]);
  useEffect(()=>{let cached:any=null;try{const raw=sessionStorage.getItem(`wickspend.tempMailOrder.${reference}`);if(raw)cached=JSON.parse(raw)}catch{}if(cached)setOrder(cached);load();},[load,reference]);
  const status=String(order?.status||"Active"),expired=/expired|complete|cancel|refunded|closed/i.test(status);
  useEffect(()=>{if(expired)return;const id=window.setInterval(()=>load(true),8000);return()=>window.clearInterval(id)},[expired,load]);
  const email=String(order?.email||order?.address||order?.email_address||"");const expiry=String(order?.expires_in||order?.expires_at||order?.remaining||order?.ttl||"");
  const mails=useMemo(()=>{const raw=order?.messages||order?.emails||order?.inbox||[];return Array.isArray(raw)?raw:raw?[raw]:[]},[order]);
  async function copy(){if(!email)return;try{await navigator.clipboard.writeText(email);setMessage("Email copied.")}catch{setMessage("Unable to copy email.")}}
  return <main className={s.page}><div className={s.topbar}><button className={s.back} onClick={()=>router.push("/temp-mail")} aria-label="Back">‹</button><div><h1>Temp Mail Inbox</h1><div className={s.step}>{expired?"Mailbox expired":"Checking for new mail"}</div></div><span/></div><section className={s.panel}><div className={s.inboxHead}><div><div className={s.emailTop}>{email||"Temporary inbox"}</div><div className={s.muted}>{expiry?`Expires: ${expiry}`:"Temporary mailbox"}</div></div><span className={`${s.statusPill} ${expired?s.expired:""}`}>{expired?"Expired":status}</span></div><div className={s.inlineActions} style={{marginTop:14}}><button onClick={copy} disabled={!email}>Copy email</button><button onClick={()=>load()} disabled={refreshing||expired}>{refreshing?"Refreshing…":"Refresh inbox"}</button></div></section><section className={s.panel} style={{marginTop:14}}><div className={s.sectionHead}><div><h2>Inbox</h2><p>{mails.length?`${mails.length} message${mails.length===1?"":"s"}`:"Incoming messages appear here."}</p></div></div>{mails.length?<div className={s.messageList}>{mails.map((m:any,i:number)=><Link key={m?.id||i} href={`/temp-mail/inbox/${encodeURIComponent(reference)}/message/${i}`} className={s.messageCard} style={{textDecoration:"none"}}><b>{senderOf(m)}</b><small>{subjectOf(m)} · {receivedAt(m)}</small><p>{bodyOf(m)||"Open message"}</p></Link>)}</div>:<div className={s.waiting}>{expired?<div><h3>No new messages</h3><p>This mailbox is expired, so WickSpend has stopped polling it.</p></div>:<div><div className={s.waitingPulse}/><h3>Waiting for messages…</h3><p>WickSpend is checking this inbox without reloading the full page.</p></div>}</div>}</section>{message&&<p className={s.screenMessage} role="status">{message}</p>}<BottomNav/></main>
}
