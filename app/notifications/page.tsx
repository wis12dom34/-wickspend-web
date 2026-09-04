"use client";
import { useEffect,useState } from "react";
import { PageShell } from "@/components/PageShell";
import { api } from "@/lib/api";
import { getSessionToken } from "@/lib/session";
export default function Notifications(){
 const[items,setItems]=useState<any[]>([]);const[message,setMessage]=useState("Loading notifications…");const[busy,setBusy]=useState<string|number|"all"|null>(null);
 async function load(){const t=getSessionToken();if(!t){setMessage("Please sign in to view notifications.");return}try{const d:any=await api.notifications.list(t);const list=Array.isArray(d)?d:(d?.notifications||d?.items||d?.data||[]);setItems(Array.isArray(list)?list:[]);setMessage("")}catch(e){setMessage(e instanceof Error?e.message:"Unable to load notifications")}}
 useEffect(()=>{load()},[]);
 async function read(id:string|number){const t=getSessionToken();if(!t)return;setBusy(id);try{await api.notifications.markRead(t,id);setItems(current=>current.map(n=>String(n.id||n.notification_id)===String(id)?{...n,read:true,is_read:true}:n));setMessage("")}catch(e){setMessage(e instanceof Error?e.message:"Unable to mark notification as read")}finally{setBusy(null)}}
 async function readAll(){const t=getSessionToken();if(!t)return;setBusy("all");try{await api.notifications.markAllRead(t);setItems(current=>current.map(n=>({...n,read:true,is_read:true})));setMessage("")}catch(e){setMessage(e instanceof Error?e.message:"Unable to mark notifications as read")}finally{setBusy(null)}}
 const unread=items.filter(n=>!(n.read===true||n.is_read===true||n.read_at)).length;
 return <PageShell title="Notifications" subtitle="Updates from WickSpend">{items.length>0&&unread>0&&<div className="panel"><button className="secondaryButton" type="button" disabled={busy!==null} onClick={readAll}>{busy==="all"?"Updating…":`Mark all as read (${unread})`}</button></div>}{items.length?<div className="list">{items.map((n:any,i)=>{const id=n.id??n.notification_id??i;const isRead=n.read===true||n.is_read===true||Boolean(n.read_at);return <div className="panel" key={id}><div style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"flex-start"}}><div><h3>{n.title||"Update"}</h3><p>{n.message||n.body||""}</p>{n.created_at&&<small>{new Date(n.created_at).toLocaleString()}</small>}</div>{!isRead&&<button className="secondaryButton" type="button" disabled={busy!==null} onClick={()=>read(id)}>{busy===id?"Updating…":"Mark read"}</button>}</div></div>})}</div>:!message?<div className="panel"><h3>You’re all caught up</h3><p>New order, wallet and service updates will appear here.</p></div>:null}{message&&<div className="panel"><p className="statusText">{message}</p></div>}</PageShell>
}
