"use client";

import {FormEvent,useEffect,useRef,useState} from "react";
import Link from "next/link";
import {BottomNav} from "@/components/BottomNav";
import {api} from "@/lib/api";
import {getSessionToken} from "@/lib/session";
import s from "./wick-ai.module.css";

type Chat={role:"user"|"assistant";text:string};
const quick=[
  ["Buy a verification number","Choose country + service","/buy-number"],
  ["Boost social media","Find a Boostly service","/boostly"],
  ["Find a digital tool","Browse useful resources","/digital-tools"],
  ["Fund my wallet","Top up and continue checkout","/add-funds"],
] as const;

export default function WickAI(){
  const[chat,setChat]=useState(false),[text,setText]=useState(""),[messages,setMessages]=useState<Chat[]>([]),[busy,setBusy]=useState(false),[error,setError]=useState("");
  const mounted=useRef(true),seq=useRef(0);
  useEffect(()=>()=>{mounted.current=false;seq.current++},[]);
  async function send(e:FormEvent){e.preventDefault();const message=text.trim();if(!message||busy)return;const token=getSessionToken();if(!token){setError("Please sign in to use Wick AI.");return}const history=[...messages,{role:"user" as const,text:message}],id=++seq.current;setMessages(history);setText("");setError("");setBusy(true);try{const context=history.slice(-8).map(m=>`${m.role==="user"?"User":"Assistant"}: ${m.text}`).join("\n");const prompt=`You are Wick AI, WickSpend's shopping and support assistant. Help the user choose among verification numbers, rentals, Boostly, digital tools, wallet funding, marketplace and existing orders. Never claim a purchase succeeded unless the WickSpend backend confirms it. Continue this conversation and answer the latest user message directly.\n\n${context}`;const r:any=await api.support.chat(token,prompt);const reply=r?.reply||r?.message||r?.response||r?.answer||r?.data?.reply||r?.data?.message||r?.data?.response;if(!reply||!String(reply).trim())throw new Error("Wick AI did not return a reply.");if(!mounted.current||id!==seq.current)return;setMessages(m=>[...m,{role:"assistant",text:String(reply).trim()}])}catch(e){if(!mounted.current||id!==seq.current)return;setText(message);setError(e instanceof Error?e.message:"Wick AI is temporarily unavailable.")}finally{if(mounted.current&&id===seq.current)setBusy(false)}}
  return <main className={s.page}>
    {!chat?<>
      <header className={s.header}><h1>Wick AI</h1><p>Tell me what you need and I’ll help you choose.</p></header>
      <button className={s.askCard} type="button" onClick={()=>{setChat(true);setText("I need a US number for Telegram")}}><small>Ask Wick AI</small><strong>“I need a US number for Telegram”</strong></button>
      <h2 className={s.sectionTitle}>Quick actions</h2>
      <div className={s.quickList}>{quick.map(([title,sub,href])=><Link href={href} key={href}><span><b>{title}</b><small>{sub}</small></span><em>›</em></Link>)}</div>
      <button className={s.start} type="button" onClick={()=>setChat(true)}>Start chat</button>
    </>:<>
      <header className={s.chatHeader}><button type="button" onClick={()=>setChat(false)}>‹</button><div><h1>Wick AI</h1><p>Shopping and support assistant</p></div></header>
      <section className={s.chatStream} aria-live="polite" aria-busy={busy}>{messages.length===0?<div className={s.empty}><span>✦</span><h2>What do you need?</h2><p>Ask for a number, Boostly service, digital tool, rental, wallet help or an order update.</p></div>:messages.map((m,i)=><div className={`${s.bubble} ${m.role==="user"?s.user:s.assistant}`} key={`${m.role}-${i}`}><small>{m.role==="user"?"You":"Wick AI"}</small><p>{m.text}</p></div>)}{busy&&<div className={s.typing}><span/><span/><span/></div>}</section>
      {error&&<div className={s.error} role="alert">{error}</div>}
      <form className={s.composer} onSubmit={send}><input value={text} disabled={busy} onChange={e=>{setText(e.target.value);if(error)setError("")}} placeholder="Ask Wick AI…" aria-label="Ask Wick AI"/><button disabled={busy||!text.trim()} aria-label="Send">↑</button></form>
    </>}
    <BottomNav/>
  </main>
}
