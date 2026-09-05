"use client";
import Link from "next/link";
import {KeyboardEvent,useEffect,useRef,useState} from "react";
import {BottomNav} from "@/components/BottomNav";
import {api} from "@/lib/api";
import {getSessionToken} from "@/lib/session";

function relativeTime(value:any){
  if(!value)return"";
  const d=new Date(value);
  if(Number.isNaN(d.getTime()))return"";
  const diff=Math.max(0,Date.now()-d.getTime());
  const sec=Math.floor(diff/1000);
  if(sec<60)return`${Math.max(1,sec)} sec ago`;
  const min=Math.floor(sec/60);
  if(min<60)return`${min} min ago`;
  const hr=Math.floor(min/60);
  if(hr<24)return`${hr} hr ago`;
  if(hr<48)return"Yesterday";
  const days=Math.floor(hr/24);
  if(days<7)return`${days} days ago`;
  return d.toLocaleDateString(undefined,{month:"short",day:"numeric"});
}
function notificationId(n:any){const id=n?.id??n?.notification_id??n?.notificationId;return id===undefined||id===null||String(id).trim()===""?null:id}
function isNotificationRead(n:any){return n?.read===true||n?.is_read===true||Boolean(n?.read_at)}
function notificationAction(n:any){const text=`${n?.title||""} ${n?.message||n?.body||""}`.toLowerCase();if(text.includes("otp"))return["View OTP","/buy-number"] as const;if(text.includes("order")&&text.includes("deliver"))return["Open Order","/orders"] as const;if(text.includes("wallet")&&text.includes("fund"))return["View Wallet","/wallet"] as const;if(text.includes("refund"))return["View","/wallet"] as const;if(text.includes("rental")||text.includes("rent"))return["Extend","/rent-number"] as const;if(text.includes("security")||text.includes("sign-in")||text.includes("sign in"))return["Review","/account-security"] as const;if(text.includes("purchase")&&text.includes("fail"))return["Review","/orders"] as const;return null}

export default function Notifications(){
  const[items,setItems]=useState<any[]>([]),[message,setMessage]=useState("Loading notifications…"),[busy,setBusy]=useState<string|number|"all"|null>(null),loadSeq=useRef(0),actionSeq=useRef(0),mounted=useRef(true);
  useEffect(()=>()=>{mounted.current=false},[]);
  async function load(){const seq=++loadSeq.current,t=getSessionToken();if(!t){if(mounted.current&&seq===loadSeq.current){setItems([]);setMessage("Please sign in to view notifications.")}return}setMessage("Loading notifications…");try{const d:any=await api.notifications.list(t);if(!mounted.current||seq!==loadSeq.current)return;const list=Array.isArray(d)?d:(d?.notifications||d?.items||d?.data||[]);setItems(Array.isArray(list)?list:[]);setMessage("")}catch(e){if(!mounted.current||seq!==loadSeq.current)return;setItems([]);setMessage(e instanceof Error?e.message:"Unable to load notifications")}}
  useEffect(()=>{load()},[]);
  async function read(id:string|number){if(busy!==null)return;const t=getSessionToken();if(!t){setMessage("Please sign in to update notifications.");return}const seq=++actionSeq.current;setBusy(id);try{await api.notifications.markRead(t,id);if(!mounted.current||seq!==actionSeq.current)return;setItems(c=>c.map(n=>String(notificationId(n))===String(id)?{...n,read:true,is_read:true,read_at:n.read_at||new Date().toISOString()}:n));setMessage("")}catch(e){if(mounted.current&&seq===actionSeq.current)setMessage(e instanceof Error?e.message:"Unable to mark notification as read")}finally{if(mounted.current&&seq===actionSeq.current)setBusy(null)}}
  async function readAll(){if(busy!==null)return;const t=getSessionToken();if(!t){setMessage("Please sign in to update notifications.");return}const seq=++actionSeq.current;setBusy("all");try{await api.notifications.markAllRead(t);if(!mounted.current||seq!==actionSeq.current)return;const now=new Date().toISOString();setItems(c=>c.map(n=>({...n,read:true,is_read:true,read_at:n.read_at||now})));setMessage("")}catch(e){if(mounted.current&&seq===actionSeq.current)setMessage(e instanceof Error?e.message:"Unable to mark notifications as read")}finally{if(mounted.current&&seq===actionSeq.current)setBusy(null)}}
  function keyRead(e:KeyboardEvent<HTMLElement>,id:string|number|null,isRead:boolean){if(isRead||busy!==null||id===null)return;if(e.key==="Enter"||e.key===" "){e.preventDefault();read(id)}}
  const unread=items.filter(n=>!isNotificationRead(n)).length;
  return <main style={{width:"min(100%,390px)",minHeight:"100dvh",margin:"0 auto",background:"#fff",color:"#050505",padding:"48px 18px calc(92px + env(safe-area-inset-bottom))",position:"relative",fontFamily:"Inter,-apple-system,BlinkMacSystemFont,\"Segoe UI\",sans-serif"}}>
    <header style={{position:"relative",minHeight:52,marginBottom:18}}>
      <h1 style={{margin:0,fontSize:23,lineHeight:"28px",fontWeight:800}}>Notifications</h1>
      <p style={{margin:"3px 0 0",fontSize:10,color:"#6e6e73"}}>Account and order updates in one place.</p>
      {unread>0&&<button type="button" disabled={busy!==null} onClick={readAll} style={{position:"absolute",right:0,top:-2,width:128,height:38,borderRadius:19,border:"1px solid rgba(0,0,0,.07)",background:"rgba(255,255,255,.95)",boxShadow:"0 6px 18px rgba(0,0,0,.08)",fontSize:11,fontWeight:600}}>{busy==="all"?"Updating…":"Mark All Read"}</button>}
    </header>
    {items.length?<div className="notificationList" aria-busy={busy!==null}>{items.map((n:any,i)=>{const id=notificationId(n),isRead=isNotificationRead(n),canRead=!isRead&&id!==null,created=relativeTime(n.created_at||n.createdAt||n.timestamp),action=notificationAction(n);return <article className={isRead?"notificationItem read":"notificationItem"} key={id!==null?String(id):`notification-${i}`} onClick={()=>canRead&&busy===null&&read(id)} onKeyDown={e=>keyRead(e,id,isRead)} role={canRead?"button":undefined} tabIndex={canRead?0:undefined} aria-disabled={canRead&&busy!==null?true:undefined} aria-label={canRead?`Mark ${n.title||"notification"} as read`:undefined}>{!isRead&&<span className="notificationDot" aria-hidden="true"/>}<div><div className="notificationTitleRow"><h3>{n.title||"Update"}</h3></div><p>{n.message||n.body||""}</p><div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12}}>{created&&<small>{created}</small>}{action&&<Link href={action[1]} onClick={e=>e.stopPropagation()} style={{fontSize:8,fontWeight:600,whiteSpace:"nowrap"}}>{action[0]}</Link>}</div></div></article>})}</div>:!message?<div className="notificationEmpty"><span aria-hidden="true">🔔</span><h3>You’re all caught up</h3><p>New order, wallet and service updates will appear here.</p></div>:null}
    {message&&<p className="screenMessage" role="status">{message}</p>}
    <Link href="/notification-preferences" aria-label="Open notification preferences" style={{marginTop:18,height:42,borderRadius:21,border:"1px solid rgba(0,0,0,.07)",background:"rgba(255,255,255,.95)",boxShadow:"0 6px 18px rgba(0,0,0,.08)",display:"grid",placeItems:"center",fontSize:11,fontWeight:600,color:"#050505",textDecoration:"none"}}>Notification Preferences</Link>
    <BottomNav/>
  </main>;
}
