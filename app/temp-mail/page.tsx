"use client";

import {FormEvent,useEffect,useRef,useState} from "react";
import {BottomNav} from "@/components/BottomNav";
import {api} from "@/lib/api";
import {getSessionToken} from "@/lib/session";
import s from "./temp-mail.module.css";

const refOf=(x:any)=>String(x?.reference||x?.order?.reference||x?.data?.reference||"");
const payloadOf=(x:any)=>x?.order||x?.data||x;
const serviceId=(x:any)=>String(x?.service_code||x?.code||x?.id||"");
const senderOf=(m:any)=>String(m?.sender||m?.from||m?.service||m?.source||"Message");
const subjectOf=(m:any)=>String(m?.subject||m?.title||"Verification email");
const bodyOf=(m:any)=>String(m?.text||m?.message||m?.body||m?.content||"");
const codeOf=(m:any)=>String(m?.code||m?.otp||m?.verification_code||"");
const fmtCode=(v:string)=>v.length===6?`${v.slice(0,3)} ${v.slice(3)}`:v;

export default function TempMail(){
  const[search,setSearch]=useState("");
  const[services,setServices]=useState<any[]>([]);
  const[selected,setSelected]=useState<any>(null);
  const[price,setPrice]=useState<any>(null);
  const[order,setOrder]=useState<any>(null);
  const[selectedMail,setSelectedMail]=useState<any>(null);
  const[message,setMessage]=useState("Loading services…");
  const[busy,setBusy]=useState(false);
  const loadSeq=useRef(0),priceSeq=useRef(0),mounted=useRef(true);
  useEffect(()=>()=>{mounted.current=false},[]);

  async function copy(value:string,label:string){
    if(!value)return;
    try{await navigator.clipboard.writeText(value);setMessage(`${label} copied.`)}catch{setMessage(`Unable to copy ${label.toLowerCase()}.`)}
  }

  async function load(q=""){
    const seq=++loadSeq.current;priceSeq.current++;setMessage(q?"Searching services…":"Loading services…");
    try{
      const d:any=await api.tempMail.services(q.trim());
      if(!mounted.current||seq!==loadSeq.current)return;
      const list=Array.isArray(d)?d:(d?.services||d?.items||d?.data||[]),safe=Array.isArray(list)?list.filter((x:any)=>serviceId(x)):[];
      setServices(safe);setSelected(null);setPrice(null);setMessage(safe.length?"":"No services found.");
    }catch(e){if(!mounted.current||seq!==loadSeq.current)return;setServices([]);setSelected(null);setPrice(null);setMessage(e instanceof Error?e.message:"Unable to load services")}
  }
  useEffect(()=>{load()},[]);

  async function choose(x:any){
    if(busy)return;const c=serviceId(x);if(!c)return setMessage("This service is unavailable right now.");
    const seq=++priceSeq.current;setSelected(x);setPrice(null);setMessage("Loading price…");
    try{const next=await api.tempMail.price(c);if(!mounted.current||seq!==priceSeq.current)return;setPrice(next);setMessage("")}catch(e){if(!mounted.current||seq!==priceSeq.current)return;setPrice(null);setMessage(e instanceof Error?e.message:"Unable to load price")}
  }

  async function buy(e:FormEvent){
    e.preventDefault();if(busy)return;const t=getSessionToken(),code=serviceId(selected);if(!t)return setMessage("Please sign in first.");if(!selected||!code)return setMessage("Choose an available service first.");
    setBusy(true);setMessage("Creating temporary inbox…");
    try{const d:any=await api.tempMail.order(t,{service_code:code}),next=payloadOf(d);if(!mounted.current)return;setOrder(next&&typeof next==="object"?next:d);setSelectedMail(null);setMessage("")}catch(e){if(mounted.current)setMessage(e instanceof Error?e.message:"Unable to create inbox")}finally{if(mounted.current)setBusy(false)}
  }

  async function refresh(){
    if(busy)return;const t=getSessionToken(),r=refOf(order);if(!t)return setMessage("Please sign in to manage this inbox.");if(!r)return setMessage("Inbox reference is unavailable.");
    setBusy(true);setMessage("Refreshing inbox…");
    try{const d:any=await api.tempMail.status(t,r),next=payloadOf(d);if(!mounted.current)return;if(next&&typeof next==="object")setOrder(next);setMessage("")}catch(e){if(mounted.current)setMessage(e instanceof Error?e.message:"Unable to refresh inbox")}finally{if(mounted.current)setBusy(false)}
  }

  async function newEmail(){
    if(busy)return;const t=getSessionToken(),r=refOf(order);setBusy(true);setMessage("Preparing a new inbox…");
    try{if(t&&r){try{await api.tempMail.cancel(t,r)}catch{}}if(!mounted.current)return;setOrder(null);setSelectedMail(null);setSelected(null);setPrice(null);setMessage("");await load(search)}finally{if(mounted.current)setBusy(false)}
  }

  const reference=refOf(order),email=String(order?.email||order?.address||order?.email_address||"");
  const status=String(order?.status||"Active"),ended=/cancel|expired|complete|refunded/i.test(status);
  const raw=order?.messages||order?.emails||order?.inbox||[],mails=Array.isArray(raw)?raw:raw?[raw]:[];
  const rootOtp=String(order?.otp||order?.code||order?.verification_code||order?.data?.otp||"");
  const priceNgn=price?.price_ngn??price?.final_price_ngn??price?.data?.price_ngn??price?.data?.final_price_ngn??null;
  const expires=String(order?.expires_in||order?.expires_at||order?.remaining||order?.ttl||"");

  if(selectedMail){
    const sender=senderOf(selectedMail),subject=subjectOf(selectedMail),body=bodyOf(selectedMail),mailCode=codeOf(selectedMail)||rootOtp;
    return <main className={s.page}>
      <div className={s.backRow}><button className={s.back} onClick={()=>setSelectedMail(null)} aria-label="Back to inbox">‹</button><div className={s.detailTitle}><h1>Verification email</h1><p>{sender} • just now</p></div><span/></div>
      <section className={`${s.card} ${s.detailCard}`}><h2>{subject}</h2><p className={s.to}>To: {email||"Temporary inbox"}</p><p className={s.bodyLead}>{body||"Use this code to finish verifying your account."}</p>{mailCode&&<><div className={s.otpPanel}><small>VERIFICATION CODE</small><strong>{fmtCode(mailCode)}</strong><button className={s.copyCode} onClick={()=>copy(mailCode,"Code")}>Copy code</button></div></>}<p className={s.detailMeta}>This code expires in 10 minutes.</p><p className={s.detailMuted}>If you did not request it, you can ignore this email.</p><p className={s.signature}>— {sender} account team</p></section>
      <button className={`${s.wideBtn} ${s.wideDark}`} onClick={()=>setMessage(`${sender} link is not available in this message.`)}>Open {sender}</button>
      <button className={`${s.wideBtn} ${s.wideLight}`} onClick={()=>{setSelectedMail(null);setMessage("Email removed from this view.")}}>Delete email</button>
      <div className={s.security}><b>Keep codes private</b><p>Never share verification codes with anyone.</p></div>
      {message&&<p className={s.screenMessage} role="status">{message}</p>}<BottomNav/>
    </main>
  }

  if(order&&ended){
    return <main className={s.page}><h1 className={s.title}>Temp Mail</h1><p className={s.subtitle}>Private inbox for verification codes</p><section className={`${s.card} ${s.expiredCard}`}><div className={s.eyebrow}>EMAIL EXPIRED</div><div className={s.email}>{email||"Temporary email"}</div><p className={s.expiredText}>This temporary address is no longer active.</p><span className={s.expiredBadge}>EXPIRED</span></section><button className={s.newFull} disabled={busy} onClick={newEmail}>{busy?"Preparing…":"Create new temp email"}</button><div className={s.sectionHead}><h2>Inbox</h2></div><div className={`${s.card} ${s.empty}`}><div><div className={s.emptyIcon}>—</div><h3>No messages</h3><p>Create a new email to start receiving verification codes.</p></div></div><div className={s.tip}><b>Temporary by design</b><p>Expired addresses and messages are removed for privacy.</p></div>{message&&<p className={s.screenMessage} role="status">{message}</p>}<BottomNav/></main>
  }

  if(order){
    return <main className={`${s.page}${busy?` ${s.loading}`:""}`}><h1 className={s.title}>Temp Mail</h1><p className={s.subtitle}>Private inbox for verification codes</p><section className={`${s.card} ${s.emailCard}`}><div className={s.eyebrow}>YOUR TEMP EMAIL</div><div className={s.email}>{email||"Temporary inbox"}</div><button className={s.copy} onClick={()=>copy(email,"Email")}>Copy</button><div className={s.expiry}>{expires?`Expires in ${expires}`:`Status: ${status}`}{reference?` • ${reference}`:""}</div></section><div className={s.actionRow}><button className={s.action} disabled={busy} onClick={refresh}>Refresh inbox</button><button className={`${s.action} ${s.actionPrimary}`} disabled={busy} onClick={newEmail}>New email</button></div><div className={s.sectionHead}><h2>Inbox</h2><span className={s.badge}>{mails.length}</span></div><div className={s.messages}>{mails.length?mails.map((m:any,i)=><button className={s.message} key={m.id||i} onClick={()=>setSelectedMail(m)}><div className={s.messageTop}>{i===0&&<span className={s.dot}/>}<span>{senderOf(m)}</span><span className={s.time}>{i===0?"Now":`${i+2}m`}</span></div><strong>{subjectOf(m)}</strong><p>{bodyOf(m)||codeOf(m)||"Open message"}</p></button>):<div className={`${s.card} ${s.empty}`}><div><div className={s.emptyIcon}>—</div><h3>No messages yet</h3><p>Keep this inbox open and tap refresh.</p></div></div>}</div><div className={s.tip}><b>Waiting for a code?</b><p>Keep this inbox open and tap refresh.</p></div>{message&&<p className={s.screenMessage} role="status">{message}</p>}<BottomNav/></main>
  }

  return <main className={`${s.page} ${s.setup}`}><h1 className={s.title}>Temp Mail</h1><p className={s.subtitle}>Private inbox for verification codes</p><form className={s.setupSearch} onSubmit={e=>{e.preventDefault();load(search)}}><span>⌕</span><input aria-label="Search email services" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search email services"/></form><h2>Choose a service</h2><div className={s.serviceList}>{services.map((x:any)=><button type="button" key={serviceId(x)} className={s.service} disabled={busy} onClick={()=>choose(x)}><span className={s.serviceMark}>✉</span><span><b>{x.name||x.service_name||x.title||"Email service"}</b><small>{x.description||"Temporary inbox"}</small></span><i>›</i></button>)}</div>{selected&&<form className={s.checkout} onSubmit={buy}><div className={s.checkoutTop}><span><small>Selected service</small><b>{selected.name||selected.service_name||selected.title}</b></span><strong>{priceNgn!=null&&Number.isFinite(Number(priceNgn))?`₦${Number(priceNgn).toLocaleString()}`:"Price at checkout"}</strong></div><button disabled={busy||!serviceId(selected)}>{busy?"Creating…":"Create temp email"}</button></form>}{message&&<p className={s.screenMessage} role="status">{message}</p>}<BottomNav/></main>
}
