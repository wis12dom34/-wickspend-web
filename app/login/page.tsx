"use client";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { getSessionToken, saveSessionToken } from "@/lib/session";

export default function Login(){
 const router=useRouter();
 const[telegramId,setTelegramId]=useState("");
 const[code,setCode]=useState("");
 const[step,setStep]=useState<"request"|"verify">("request");
 const[busy,setBusy]=useState(false);
 const[message,setMessage]=useState("");
 useEffect(()=>{const token=getSessionToken();if(token)api.auth.session(token).then(()=>router.replace("/")).catch(()=>{})},[router]);
 async function requestCode(e:FormEvent){e.preventDefault();const id=telegramId.trim();if(!id)return setMessage("Enter your Telegram user ID.");setBusy(true);setMessage("Sending verification code…");try{await api.auth.telegramStart({telegram_user_id:id});setStep("verify");setMessage("Verification code sent. Enter the code to continue.")}catch(err){setMessage(err instanceof Error?err.message:"Unable to send verification code")}finally{setBusy(false)}}
 async function verify(e:FormEvent){e.preventDefault();const id=telegramId.trim(),otp=code.trim();if(!otp)return setMessage("Enter the verification code.");setBusy(true);setMessage("Verifying…");try{const result:any=await api.auth.telegramVerify({telegram_user_id:id,code:otp});const token=result?.session_token||result?.token||result?.data?.session_token||result?.data?.token;if(!token)throw new Error("Session token was not returned after verification.");saveSessionToken(String(token));await api.auth.session(String(token));router.replace("/")}catch(err){setMessage(err instanceof Error?err.message:"Verification failed")}finally{setBusy(false)}}
 return <main className="shell"><div style={{maxWidth:460,margin:"9vh auto 0"}}><div className="panel" style={{padding:24}}><p className="eyebrow">WickSpend</p><h1 style={{margin:"0 0 8px"}}>Sign in with Telegram</h1><p style={{marginBottom:20}}>Verify your Telegram-linked WickSpend account to access your wallet and purchases.</p>{step==="request"?<form className="formGrid" onSubmit={requestCode}><div className="field"><label>Telegram user ID</label><input inputMode="numeric" autoComplete="off" value={telegramId} onChange={e=>setTelegramId(e.target.value)} placeholder="Enter your Telegram ID"/></div><button className="secondaryButton" disabled={busy}>{busy?"Sending…":"Send verification code"}</button></form>:<form className="formGrid" onSubmit={verify}><div className="field"><label>Verification code</label><input inputMode="numeric" autoComplete="one-time-code" value={code} onChange={e=>setCode(e.target.value)} placeholder="Enter code"/></div><button className="secondaryButton" disabled={busy}>{busy?"Verifying…":"Verify & sign in"}</button><button type="button" className="primaryButton" onClick={()=>{setStep("request");setCode("");setMessage("")}}>Change Telegram ID</button></form>}{message&&<p className="statusText" style={{marginTop:14}}>{message}</p>}</div></div></main>
}