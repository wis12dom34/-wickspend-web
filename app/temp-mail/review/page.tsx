"use client";

import {useEffect,useRef,useState} from "react";
import {useRouter} from "next/navigation";
import {BottomNav} from "@/components/BottomNav";
import {api,newRequestKey} from "@/lib/api";
import {getSessionToken} from "@/lib/session";
import s from "../temp-mail.module.css";

const ngn=(v:any)=>Number.isFinite(Number(v))?`₦${Number(v).toLocaleString("en-NG")}`:"—";
const priceOf=(p:any)=>p?.price_ngn??p?.final_price_ngn??p?.data?.price_ngn??p?.data?.final_price_ngn;
const balanceOf=(w:any)=>w?.balance_ngn??w?.wallet_balance_ngn??w?.balance??w?.data?.balance_ngn??w?.data?.balance;
const refOf=(x:any)=>String(x?.reference||x?.order_reference||x?.ref||x?.id||x?.order?.reference||x?.order?.order_reference||x?.order?.ref||x?.order?.id||x?.data?.reference||x?.data?.order_reference||x?.data?.ref||x?.data?.id||"");
const listOf=(x:any)=>Array.isArray(x)?x:(x?.orders||x?.items||x?.data||[]);

export default function ReviewMail(){
  const router=useRouter();
  const[draft,setDraft]=useState<any>(null),[balance,setBalance]=useState<any>(null),[message,setMessage]=useState(""),[busy,setBusy]=useState(false);
  const requestKey=useRef("");
  useEffect(()=>{const raw=sessionStorage.getItem("wickspend.tempMailDraft");if(!raw){router.replace("/temp-mail");return}try{setDraft(JSON.parse(raw))}catch{router.replace("/temp-mail");return}const t=getSessionToken();if(t)api.wallet.get(t).then((w:any)=>setBalance(balanceOf(w))).catch(()=>{})},[router]);
  async function create(){if(busy||!draft?.service_code)return;const token=getSessionToken();if(!token){setMessage("Please sign in before creating a Temp Mail inbox.");return}if(!requestKey.current)requestKey.current=newRequestKey("mail");setBusy(true);setMessage("");try{const result:any=await api.tempMail.order(token,{service_code:draft.service_code,service_name:draft.service_name,request_key:requestKey.current});let reference=refOf(result),payload:any=result?.order||result?.data||result;if(!reference){setMessage("Confirming your new mailbox…");try{const recent:any=await api.tempMail.orders(token,1,20);const rows:any[]=listOf(recent);const match=rows.find((o:any)=>String(o?.request_key||o?.idempotency_key||"")===requestKey.current)||rows.find((o:any)=>String(o?.service_code||o?.code||"")===String(draft.service_code)&&!/failed|refunded|cancelled/i.test(String(o?.status||"")));if(match){reference=refOf(match);payload=match}}catch{}}if(!reference){setMessage("Your request is being confirmed. Do not tap Create Mail again yet.");return}sessionStorage.setItem(`wickspend.tempMailOrder.${reference}`,JSON.stringify(payload));sessionStorage.removeItem("wickspend.tempMailDraft");api.wallet.invalidate(token);router.replace(`/temp-mail/created?reference=${encodeURIComponent(reference)}`)}catch(e){setMessage(e instanceof Error?e.message:"Unable to create Temp Mail")}finally{setBusy(false)}}
  const amount=priceOf(draft?.price);
  return <main className={s.page}><div className={s.topbar}><button className={s.back} onClick={()=>router.back()} aria-label="Back">‹</button><div><h1>Review Order</h1><div className={s.step}>Step 3 of 4</div></div><span/></div><div className={s.stack}><section className={s.panel}><h2 className={s.summaryTitle}>Confirm your Temp Mail</h2><p className={s.summaryText}>Review the charge before WickSpend creates the inbox.</p><div className={s.row}><span>Service</span><strong>{draft?.service_name||"Temp Mail"}</strong></div><div className={s.row}><span>Price</span><strong>{ngn(amount)}</strong></div><div className={s.row}><span>Wallet balance</span><strong>{ngn(balance)}</strong></div><div className={s.row}><span>Amount to be charged</span><strong>{ngn(amount)}</strong></div></section><section className={s.notice}>Tapping Create Mail places the order and charges your WickSpend wallet. The button locks while the request is processing to prevent duplicate orders.</section></div><div className={s.stickyAction}><button className={s.primary} disabled={busy||!draft?.service_code} onClick={create}>{busy?"Creating Mail…":"Create Mail"}</button></div>{message&&<p className={s.screenMessage} role="status">{message}</p>}<BottomNav/></main>
}
