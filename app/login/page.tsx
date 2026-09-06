"use client";
import {FormEvent,KeyboardEvent,ClipboardEvent,useEffect,useRef,useState} from "react";
import {useRouter} from "next/navigation";
import {api} from "@/lib/api";
import {clearSessionToken,getSessionToken,saveSessionToken} from "@/lib/session";
import styles from "./login.module.css";

const digitsOnly=(value:string)=>/^\d+$/.test(value);
const validEmail=(value:string)=>/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value.trim());
type Step="email"|"telegram"|"telegramVerify";
const blankOtp=()=>Array(6).fill("") as string[];

const MailIcon=()=> <svg className={styles.providerIcon} viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="3" stroke="currentColor" strokeWidth="1.7"/><path d="m5 7 7 5 7-5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>;
const TelegramIcon=()=> <svg className={styles.providerIcon} viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M20.7 4.2 17.9 19c-.2 1-1 1.3-1.8.8l-4.3-3.2-2.1 2c-.2.2-.4.4-.9.4l.3-4.4 8-7.2c.4-.3-.1-.5-.5-.2l-9.9 6.2-4.2-1.3c-.9-.3-.9-.9.2-1.3l16.5-6.4c.8-.3 1.5.2 1.5.8Z" stroke="currentColor" strokeWidth="1.55" strokeLinejoin="round"/></svg>;

export default function Login(){
  const router=useRouter();
  const [step,setStep]=useState<Step>("email"),[email,setEmail]=useState(""),[telegramId,setTelegramId]=useState(""),[otp,setOtp]=useState<string[]>(blankOtp),[busy,setBusy]=useState(false),[message,setMessage]=useState("");
  const actionSeq=useRef(0),mounted=useRef(true),otpRefs=useRef<Array<HTMLInputElement|null>>([]);
  const code=otp.join("");

  useEffect(()=>{mounted.current=true;let active=true;const t=getSessionToken();if(t)api.auth.session(t).then(()=>{if(active&&mounted.current)router.replace("/")}).catch(()=>{if(active&&mounted.current){clearSessionToken();setMessage("")}});return()=>{active=false;mounted.current=false;actionSeq.current++}},[router]);
  useEffect(()=>{if(step==="telegramVerify")window.setTimeout(()=>otpRefs.current[0]?.focus(),0)},[step]);

  function clearOtp(){setOtp(blankOtp())}
  function updateOtp(index:number,value:string){const digit=value.replace(/\D/g,"").slice(-1);setOtp(current=>{const next=[...current];next[index]=digit;return next});if(digit&&index<5)otpRefs.current[index+1]?.focus();if(message)setMessage("")}
  function handleOtpKeyDown(index:number,e:KeyboardEvent<HTMLInputElement>){if(e.key==="Backspace"&&!otp[index]&&index>0)otpRefs.current[index-1]?.focus();if(e.key==="ArrowLeft"&&index>0){e.preventDefault();otpRefs.current[index-1]?.focus()}if(e.key==="ArrowRight"&&index<5){e.preventDefault();otpRefs.current[index+1]?.focus()}}
  function handleOtpPaste(e:ClipboardEvent<HTMLDivElement>){const pasted=e.clipboardData.getData("text").replace(/\D/g,"").slice(0,6);if(!pasted)return;e.preventDefault();setOtp(Array.from({length:6},(_,i)=>pasted[i]||""));otpRefs.current[Math.min(pasted.length,6)-1]?.focus();if(message)setMessage("")}

  function continueWithEmail(e:FormEvent){
    e.preventDefault();
    if(busy)return;
    const mail=email.trim().toLowerCase();
    if(!mail)return setMessage("Enter your email address.");
    if(!validEmail(mail))return setMessage("Enter a valid email address.");
    setBusy(true);
    setMessage("");
    try{
      clearSessionToken();
      window.localStorage.setItem("wickspend_preview_email",mail);
      window.localStorage.setItem("wickspend_preview_login","1");
      router.replace("/");
    }finally{
      if(mounted.current)setBusy(false);
    }
  }

  async function requestTelegramCode(e:FormEvent){e.preventDefault();if(busy)return;const id=telegramId.trim();if(!id)return setMessage("Enter your Telegram user ID.");if(!digitsOnly(id))return setMessage("Telegram user ID must contain numbers only.");const seq=++actionSeq.current;setBusy(true);setMessage("");try{await api.auth.telegramStart({telegram_user_id:id});if(!mounted.current||seq!==actionSeq.current)return;setTelegramId(id);clearOtp();setStep("telegramVerify")}catch(error){if(mounted.current&&seq===actionSeq.current)setMessage(error instanceof Error?error.message:"Unable to send verification code")}finally{if(mounted.current&&seq===actionSeq.current)setBusy(false)}}
  async function verifyTelegram(e:FormEvent){e.preventDefault();if(busy)return;const id=telegramId.trim();if(!id){setStep("telegram");return setMessage("Enter your Telegram user ID again.")}if(!digitsOnly(id)){setStep("telegram");return setMessage("Telegram user ID must contain numbers only.")}if(code.length!==6||!digitsOnly(code))return setMessage("Enter the complete 6-digit verification code.");const seq=++actionSeq.current;setBusy(true);setMessage("");try{const r:any=await api.auth.telegramVerify({telegram_user_id:id,code}),t=r?.session_token||r?.token||r?.data?.session_token||r?.data?.token;if(!t)throw new Error("Unable to complete sign in right now. Please try again.");saveSessionToken(String(t));try{await api.auth.session(String(t))}catch(error){clearSessionToken();throw error}if(!mounted.current||seq!==actionSeq.current)return;router.replace("/")}catch(error){clearSessionToken();if(mounted.current&&seq===actionSeq.current)setMessage(error instanceof Error?error.message:"Verification failed")}finally{if(mounted.current&&seq===actionSeq.current)setBusy(false)}}

  function reset(next:Step="email"){actionSeq.current++;setBusy(false);clearOtp();setStep(next);setMessage("")}
  const title=step==="telegramVerify"?"Verify your account":"Welcome back";
  const lead=step==="email"?"Enter your email to continue to WickSpend.":step==="telegram"?"Sign in securely with your Telegram-linked WickSpend account.":`Enter the verification code sent for Telegram ID ${telegramId}.`;
  const otpInputs=<div className={styles.otpGroup} onPaste={handleOtpPaste} aria-label="6-digit verification code">{otp.map((digit,index)=><input key={index} ref={el=>{otpRefs.current[index]=el}} className={styles.otpBox} inputMode="numeric" autoComplete={index===0?"one-time-code":"off"} pattern="[0-9]*" maxLength={1} value={digit} onChange={e=>updateOtp(index,e.target.value)} onKeyDown={e=>handleOtpKeyDown(index,e)} aria-label={`Digit ${index+1}`} disabled={busy}/>)}</div>;

  return <main className={styles.screen}><p className={styles.brand}>WickSpend</p><section className={styles.content} aria-busy={busy}><h1 className={styles.title}>{title}</h1><p className={`${styles.lead} ${step==="telegramVerify"?styles.verifyLead:""}`}>{lead}</p>{step==="email"?<><form className={styles.form} onSubmit={continueWithEmail}><div className={styles.authHint}><span className={styles.iconCircle}><MailIcon/></span><span>Email access</span></div><label className={styles.label} htmlFor="email">Email address</label><input id="email" className={styles.field} type="email" inputMode="email" autoComplete="email" value={email} onChange={e=>{setEmail(e.target.value);if(message)setMessage("")}} placeholder="Enter your email" disabled={busy}/><button className={styles.primary} type="submit" disabled={busy||!email.trim()}>{busy?"Opening…":"Continue with Email"}</button></form><div className={styles.divider}>or</div><button className={styles.providerButton} type="button" disabled={busy} onClick={()=>reset("telegram")}><TelegramIcon/>Continue with Telegram</button><button className={styles.secondary} type="button" onClick={()=>router.push("/")}>Back to WickSpend</button></>:step==="telegram"?<><form className={styles.form} onSubmit={requestTelegramCode}><div className={styles.authHint}><span className={styles.iconCircle}><TelegramIcon/></span><span>Telegram secure verification</span></div><label className={styles.label} htmlFor="telegram-id">Telegram user ID</label><input id="telegram-id" className={styles.field} inputMode="numeric" autoComplete="off" value={telegramId} onChange={e=>{setTelegramId(e.target.value);if(message)setMessage("")}} placeholder="Enter your Telegram ID" disabled={busy}/><button className={styles.primary} type="submit" disabled={busy||!telegramId.trim()}>{busy?"Sending…":"Continue with Telegram"}</button></form><div className={styles.divider}>or</div><button className={styles.providerButton} type="button" disabled={busy} onClick={()=>reset("email")}><MailIcon/>Continue with Email</button><button className={styles.secondary} type="button" onClick={()=>router.push("/")}>Back to WickSpend</button></>:<form className={styles.form} onSubmit={verifyTelegram}>{otpInputs}<div className={styles.emailSummary}>Telegram ID {telegramId}</div><button className={styles.primary} type="submit" disabled={busy||code.length!==6}>{busy?"Verifying…":"Verify & Sign In"}</button><div className={styles.verifyActions}><button className={styles.helperButton} type="button" disabled={busy} onClick={()=>reset("telegram")}>Change Telegram ID</button></div></form>}{message&&<p className={styles.message} role="status" aria-live="polite">{message}</p>}<p className={styles.secure}>{step==="email"?"Email preview access is enabled while WickSpend email verification is being updated.":"Secure access to your wallet, purchases and WickSpend services."}</p></section></main>}
