"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import ResellerNav from "../ResellerNav";
import { api } from "@/lib/api";
import { getSessionToken } from "@/lib/session";

function notificationId(n:any){const id=n?.notification_id??n?.id??n?.notificationId;return id===undefined||id===null||String(id).trim()===""?null:id}
function isRead(n:any){return n?.read===true||n?.is_read===true||Boolean(n?.read_at)}
function date(value:any){if(!value)return"—";const d=new Date(value);return Number.isNaN(d.getTime())?"—":d.toLocaleString()}

export default function ResellerNotifications(){
 const router=useRouter();
 const[items,setItems]=useState<any[]>([]),[loading,setLoading]=useState(true),[message,setMessage]=useState(""),[busy,setBusy]=useState<string|number|"all"|null>(null);
 const load=useCallback(async()=>{const token=getSessionToken();if(!token){router.replace("/login");return}setLoading(true);setMessage("");try{const r:any=await api.notifications.list(token);const list=Array.isArray(r)?r:(r?.notifications||r?.items||r?.data||[]);setItems(Array.isArray(list)?list:[])}catch(e){setMessage(e instanceof Error?e.message:"Unable to load notifications.")}finally{setLoading(false)}},[router]);
 useEffect(()=>{void load()},[load]);
 const unread=useMemo(()=>items.filter(n=>!isRead(n)).length,[items]);
 async function markRead(id:string|number){if(busy!==null)return;const token=getSessionToken();if(!token)return router.replace("/login");setBusy(id);setMessage("");try{await api.notifications.markRead(token,id);const now=new Date().toISOString();setItems(current=>current.map(n=>String(notificationId(n))===String(id)?{...n,read:true,is_read:true,read_at:n.read_at||now}:n))}catch(e){setMessage(e instanceof Error?e.message:"Unable to mark notification as read.")}finally{setBusy(null)}}
 async function markAll(){if(busy!==null||unread===0)return;const token=getSessionToken();if(!token)return router.replace("/login");setBusy("all");setMessage("");try{await api.notifications.markAllRead(token);const now=new Date().toISOString();setItems(current=>current.map(n=>({...n,read:true,is_read:true,read_at:n.read_at||now})))}catch(e){setMessage(e instanceof Error?e.message:"Unable to mark notifications as read.")}finally{setBusy(null)}}
 return <main className="resellerShell"><ResellerNav/><header className="resellerTopbar"><div><span className="eyebrow">Updates</span><h1>Notifications</h1><p>Reseller, billing, store and order alerts in one place.</p></div><div className="topbarActions"><button className="secondaryButton" onClick={()=>void load()} disabled={loading}>Refresh</button><button className="primaryButton" onClick={()=>void markAll()} disabled={busy!==null||unread===0}>{busy==="all"?"Updating…":"Mark all read"}</button></div></header>{message&&<div className="resellerMessage error">{message}</div>}<section className="resellerStats"><article className="metricCard"><span>Total notifications</span><strong>{items.length}</strong></article><article className="metricCard"><span>Unread</span><strong>{unread}</strong></article></section>{loading?<div className="resellerLoading">Loading notifications…</div>:items.length?<section>{items.map((n:any,i)=>{const id=notificationId(n),read=isRead(n);return <article className="resellerCard" key={id!==null?String(id):`notification-${i}`}><div className="cardHead"><div><span className="eyebrow">{n.type||"Notification"}</span><h2>{n.title||"Update"}</h2></div><span className={`status ${read?"muted":"good"}`}>{read?"Read":"Unread"}</span></div><p className="subtle" style={{marginTop:10,whiteSpace:"pre-wrap"}}>{n.message||n.body||""}</p><dl className="detailList"><div><dt>Received</dt><dd>{date(n.created_at||n.createdAt||n.timestamp)}</dd></div>{n.read_at&&<div><dt>Read</dt><dd>{date(n.read_at)}</dd></div>}</dl>{!read&&id!==null&&<button className="secondaryButton" disabled={busy!==null} onClick={()=>void markRead(id)}>{busy===id?"Updating…":"Mark as read"}</button>}</article>})}</section>:<div className="emptyState">No reseller notifications yet.</div>}</main>
}
