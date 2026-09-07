"use client";

import {FormEvent,useEffect,useMemo,useRef,useState} from "react";
import {usePathname,useSearchParams} from "next/navigation";
import {api} from "@/lib/api";
import {getSessionToken} from "@/lib/session";

type Message={id?:string|number;role:"user"|"assistant"|"admin"|"system";text:string;created_at?:string};
type SupportContext={page:string;module:string;reference?:string;product?:string};

const QUICK=["I have a payment issue","My order is not delivered","Buy Number issue","Boostly order problem","Marketplace order problem","Wallet problem","Login problem","Refund request","Talk to human support"];
const HIDE_ON=["/login","/admin"];

function clean(value:string|null,max=120){return String(value||"").replace(/[\r\n\t]/g," ").trim().slice(0,max)}
function moduleFor(path:string){if(path.startsWith("/buy-number")||path.startsWith("/numbers")||path.startsWith("/otp"))return "Buy Number";if(path.startsWith("/rent-number"))return "Rent Number";if(path.startsWith("/marketplace")||path.startsWith("/checkout"))return "Marketplace";if(path.startsWith("/boostly"))return "Boostly";if(path.startsWith("/temp-mail"))return "Temp Mail";if(path.startsWith("/wallet")||path.startsWith("/add-funds"))return "Wallet";if(path.startsWith("/orders"))return "Orders";if(path.startsWith("/notifications"))return "Notifications";if(path.startsWith("/profile"))return "Profile";if(path.startsWith("/settings"))return "Settings";return "Home"}
function starter(module:string){if(module==="Buy Number")return "Need help with your number purchase?";if(module==="Marketplace")return "Need help with your Marketplace order?";if(module==="Boostly")return "Need help with your Boostly order?";if(module==="Wallet")return "Need help with a payment or your wallet?";if(module==="Temp Mail")return "Need help with Temp Mail?";return "How can we help?"}

export function openSmartSupport(detail:Record<string,unknown>={}){if(typeof window!=="undefined")window.dispatchEvent(new CustomEvent("wickspend:smart-support",{detail}))}

export function SmartSupportQuickAction(){return <button type="button" className="quickActionCard smartSupportQuick" onClick={()=>openSmartSupport()}><span aria-hidden="true">💬</span><b>Smart Support</b></button>}

export function SmartSupportHelpButton({label="Get help",reference,product,module}:{label?:string;reference?:string;product?:string;module?:string}){return <button type="button" className="smartSupportHelpButton" onClick={()=>openSmartSupport({reference,product,module})}>{label}</button>}

export default function SmartSupport(){
 const pathname=usePathname()||"/",search=useSearchParams();
 const [open,setOpen]=useState(false),[minimized,setMinimized]=useState(false),[loaded,setLoaded]=useState(false),[messages,setMessages]=useState<Message[]>([]),[text,setText]=useState(""),[busy,setBusy]=useState(false),[error,setError]=useState(""),[unread,setUnread]=useState(0),[handoff,setHandoff]=useState(false),[override,setOverride]=useState<Partial<SupportContext>>({});
 const bottomRef=useRef<HTMLDivElement>(null);
 const token=typeof window!=="undefined"?getSessionToken():null;
 const context=useMemo<SupportContext>(()=>{const ref=clean(override.reference||search.get("reference")||search.get("ref")||search.get("order")||search.get("transaction"));const product=clean(override.product||search.get("product")||search.get("service"));return {page:clean(pathname,180),module:clean(override.module||moduleFor(pathname),60),...(ref?{reference:ref}:{}),...(product?{product}:{}),}},[pathname,search,override]);
 const hidden=HIDE_ON.some(p=>pathname===p||pathname.startsWith(`${p}/`));
 useEffect(()=>{const handler=(event:Event)=>{const detail=(event as CustomEvent).detail||{};setOverride(detail);setOpen(true);setMinimized(false)};window.addEventListener("wickspend:smart-support",handler);return()=>window.removeEventListener("wickspend:smart-support",handler)},[]);
 useEffect(()=>{if(!open||loaded||!token)return;let cancelled=false;(async()=>{try{setError("");const r:any=await api.support.history(token,context);if(cancelled)return;const list=Array.isArray(r?.messages)?r.messages:[];setMessages(list.map((m:any)=>({id:m.id,role:m.sender==="customer"?"user":m.sender==="admin"?"admin":"assistant",text:String(m.message_text||m.text||""),created_at:m.created_at})).filter((m:Message)=>m.text));setUnread(Number(r?.unread_count||0));setHandoff(r?.status==="waiting_human");setLoaded(true)}catch(e){if(!cancelled){setLoaded(true);setError(e instanceof Error?e.message:"Unable to load support history")}}})();return()=>{cancelled=true}},[open,loaded,token,context]);
 useEffect(()=>{if(open&&!minimized){setUnread(0);bottomRef.current?.scrollIntoView({behavior:"smooth"})}},[open,minimized,messages.length]);
 async function send(e?:FormEvent,messageOverride?:string){e?.preventDefault();const message=clean(messageOverride||text,4000);if(!message||busy)return;if(!token){setError("Please sign in to use Smart Support.");return}setText("");setError("");setMessages(m=>[...m,{role:"user",text:message,created_at:new Date().toISOString()}]);setBusy(true);try{if(message.toLowerCase().includes("talk to human support")){const r:any=await api.support.handoff(token,{message,context});setHandoff(true);if(r?.message)setMessages(m=>[...m,{role:"assistant",text:String(r.message)}]);return}const r:any=await api.support.chat(token,{message,context});const reply=String(r?.reply||r?.message||"").trim();if(!reply)throw new Error("Support did not return a reply.");setMessages(m=>[...m,{role:"assistant",text:reply,created_at:new Date().toISOString()}]);setHandoff(r?.status==="waiting_human")}catch(e){setText(message);setError(e instanceof Error?e.message:"Unable to contact support")}finally{setBusy(false)}}
 if(hidden||!token)return null;
 return <div className="smartSupportRoot">
   {open&&!minimized&&<section className="smartSupportPanel" role="dialog" aria-label="WickSpend Smart Support">
    <header className="smartSupportHeader"><div className="smartSupportAvatar">W</div><div><strong>WickSpend Support</strong><span><i/> {handoff?"Support team notified":"Typically replies instantly"}</span></div><button type="button" aria-label="Minimize support" onClick={()=>setMinimized(true)}>—</button><button type="button" aria-label="Close support" onClick={()=>setOpen(false)}>×</button></header>
    <div className="smartSupportContext">{starter(context.module)}</div>
    <div className="smartSupportMessages" aria-live="polite">{!loaded?<div className="smartSupportLoading">Loading conversation…</div>:messages.length===0?<div className="smartSupportEmpty"><strong>WickSpend Smart Support</strong><p>Ask about orders, payments, numbers, Marketplace, Boostly, Temp Mail or your wallet.</p></div>:messages.map((m,i)=><div key={String(m.id||i)} className={`smartSupportBubble ${m.role==="user"?"isUser":"isSupport"}`}><p>{m.text}</p>{m.created_at&&<time>{new Date(m.created_at).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}</time>}</div>)}{busy&&<div className="smartSupportTyping" aria-label="Support is typing"><span/><span/><span/></div>}<div ref={bottomRef}/></div>
    {messages.length<2&&<div className="smartSupportSuggestions">{QUICK.slice(0,5).map(q=><button type="button" key={q} disabled={busy} onClick={()=>send(undefined,q)}>{q}</button>)}</div>}
    {error&&<div className="smartSupportError" role="alert">{error}<button type="button" onClick={()=>setError("")}>Dismiss</button></div>}
    <form className="smartSupportComposer" onSubmit={send}><textarea value={text} onChange={e=>setText(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey&&window.matchMedia("(min-width: 700px)").matches){e.preventDefault();send()}}} maxLength={4000} rows={1} placeholder="Type your message…" disabled={busy}/><button type="submit" disabled={busy||!text.trim()} aria-label="Send message">↑</button></form>
    {!handoff&&<button type="button" className="smartSupportHuman" disabled={busy} onClick={()=>send(undefined,"Talk to human support")}>Talk to support</button>}
   </section>}
   <button type="button" className={`smartSupportLauncher ${open?"isOpen":""}`} aria-label={open?"Open WickSpend Support":"Open Smart Support"} onClick={()=>{setOpen(true);setMinimized(false)}}><span aria-hidden="true">✦</span>{unread>0&&<b>{unread>9?"9+":unread}</b>}</button>
  </div>
}
