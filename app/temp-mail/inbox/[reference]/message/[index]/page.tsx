"use client";

import {useEffect,useState} from "react";
import {useParams,useRouter} from "next/navigation";
import {BottomNav} from "@/components/BottomNav";
import {api} from "@/lib/api";
import {getSessionToken} from "@/lib/session";
import s from "../../../../temp-mail.module.css";

const payloadOf=(x:any)=>x?.order||x?.data||x;
const senderOf=(m:any)=>String(m?.sender||m?.from||m?.service||m?.source||"Message");
const subjectOf=(m:any)=>String(m?.subject||m?.title||"Verification email");
const bodyOf=(m:any)=>String(m?.text||m?.message||m?.body||m?.content||"");
const codeOf=(m:any,root:any)=>String(m?.code||m?.otp||m?.verification_code||root?.otp||root?.code||root?.verification_code||"");
const receivedAt=(m:any)=>{const raw=m?.received_at||m?.created_at||m?.createdAt||m?.date||m?.timestamp;if(!raw)return "Received";const d=new Date(raw);return Number.isNaN(d.getTime())?String(raw):d.toLocaleString([], {month:"short",day:"numeric",hour:"numeric",minute:"2-digit"})};

export default function TempMailMessage(){
  const params=useParams<{reference:string;index:string}>(),router=useRouter();const reference=decodeURIComponent(String(params.reference||"")),index=Math.max(0,Number(params.index)||0);
  const[order,setOrder]=useState<any>(null),[message,setMessage]=useState("Loading message…");
  useEffect(()=>{const token=getSessionToken();if(!token){setMessage("Please sign in to read this message.");return}api.tempMail.status(token,reference).then((d:any)=>{setOrder(payloadOf(d));setMessage("")}).catch(e=>setMessage(e instanceof Error?e.message:"Unable to load message"))},[reference]);
  const raw=order?.messages||order?.emails||order?.inbox||[],mails=Array.isArray(raw)?raw:raw?[raw]:[],mail=mails[index];const body=bodyOf(mail),detected=codeOf(mail,order)||((body.match(/\b\d{4,8}\b/)||[])[0]||"");
  async function copy(v:string,label:string){if(!v)return;try{await navigator.clipboard.writeText(v);setMessage(`${label} copied.`)}catch{setMessage(`Unable to copy ${label.toLowerCase()}.`)}}
  return <main className={s.page}><div className={s.topbar}><button className={s.back} onClick={()=>router.back()} aria-label="Back to inbox">‹</button><div><h1>Message</h1><div className={s.step}>{mail?receivedAt(mail):"Temp Mail"}</div></div><span/></div>{mail?<section className={s.panel}><h2 className={s.summaryTitle}>{subjectOf(mail)}</h2><p className={s.summaryText}>From {senderOf(mail)}</p>{detected&&<div className={s.otpBox}><small>VERIFICATION CODE</small><strong>{detected}</strong><button className={s.primary} style={{height:42}} onClick={()=>copy(detected,"Code")}>Copy Code</button></div>}<div className={s.messageBody}>{body||"No readable message content was returned."}</div><div className={s.twoActions}><button className={s.secondary} onClick={()=>copy(body,"Message")} disabled={!body}>Copy Message</button><button className={s.primary} onClick={()=>router.back()}>Back to Inbox</button></div></section>:<section className={`${s.panel} ${s.waiting}`}><div><h3>Message unavailable</h3><p>The inbox may have changed. Return to the inbox and refresh.</p></div></section>}{message&&<p className={s.screenMessage} role="status">{message}</p>}<BottomNav/></main>
}
