"use client";
import {ClipboardEvent,FormEvent,KeyboardEvent,useEffect,useRef,useState} from "react";
import {useRouter} from "next/navigation";
import {ApiError,api,wickspendApi} from "@/lib/api";
import {clearSessionToken,getSessionToken,saveSessionToken} from "@/lib/session";
import styles from "./login.module.css";

const digitsOnly=(value:string)=>/^\d+$/.test(value);
const validEmail=(value:string)=>/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value.trim());
const SUPABASE_URL=process.env.NEXT_PUBLIC_SUPABASE_URL||"https://npusfboqmolngjpsctqr.supabase.co";
const SUPABASE_ANON_KEY=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY||"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5wdXNmYm9xbW9sbmdqcHNjdHFyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU0MjM2NDAsImV4cCI6MjA2MDk5OTY0MH0.o4Fy7LhlfjknAz9be6cK8_As5-aJr0CVszJtAA7zbns";
type Step="email"|"emailOtp"|"telegram"|"telegramVerify";
type PasswordMode="login"|"register";
const blankOtp=()=>Array(6).fill("") as string[];
const safeNext=()=>{if(typeof window==="undefined")return"/";const value=new URLSearchParams(window.location.search).get("next")||"/";return value.startsWith("/")&&!value.startsWith("//")?value:"/"};
async function supabaseAuth(path:string,body:unknown){const response=await fetch(`${SUPABASE_URL}/auth/v1/${path}`,{method:"POST",headers:{"Content-Type":"application/json",apikey:SUPABASE_ANON_KEY,Authorization:`Bearer ${SUPABASE_ANON_KEY}`},body:JSON.stringify(body)});const payload=await response.json().catch(()=>null);if(!response.ok)throw new Error(payload?.msg||payload?.message||"Unable to send or verify the email code.");return payload}

const MailIcon=()=> <svg className={styles.providerIcon} viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="3" stroke="currentColor" strokeWidth="1.7"/><path d="m5 7 7 5 7-5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>;
const TelegramIcon=()=> <svg className={styles.providerIcon} viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M20.7 4.2 17.9 19c-.2 1-1 1.3-1.8.8l-4.3-3.2-2.1 2c-.2.2-.4.4-.9.4l.3-4.4 8-7.2c.4-.3-.1-.5-.5-.2l-9.9 6.2-4.2-1.3c-.9-.3-.9-.9.2-1.3l16.5-6.4c.8-.3 1.5.2 1.5.8Z" stroke="currentColor" strokeWidth="1.55" strokeLinejoin="round"/></svg>;

export default function Login(){
  const router=useRouter();
  const [step,setStep]=useState<Step>("email"),[mode,setMode]=useState<PasswordMode>("login"),[email,setEmail]=useState(""),[password,setPassword]=useState(""),[confirmPassword,setConfirmPassword]=useState(""),[telegramId,setTelegramId]=useState(""),[otp,setOtp]=useState<string[]>(blankOtp),[busy,setBusy]=useState(false),[message,setMessage]=useState("");
  const actionSeq=useRef(0),mounted=useRef(true),otpRefs=useRef<Array<HTMLInputElement|null>>([]);
  const code=otp.join("");

  useEffect(()=>{mounted.current=true;let active=true;const t=getSessionToken();if(t)api.auth.session(t).then(()=>{if(active&&mounted.current)router.replace(safeNext())}).catch(()=>{if(active&&mounted.current)clearSessionToken()});return()=>{active=false;mounted.current=false;actionSeq.current++}},[router]);
  useEffect(()=>{if(step==="telegramVerify"||step==="emailOtp")window.setTimeout(()=>otpRefs.current[0]?.focus(),0)},[step]);

  function clearOtp(){setOtp(blankOtp())}
  function updateOtp(index:number,value:string){const digit=value.replace(/\D/g,"").slice(-1);setOtp(current=>{const next=[...current];next[index]=digit;return next});if(digit&&index<5)otpRefs.current[index+1]?.focus();if(message)setMessage("")}
  function handleOtpKeyDown(index:number,e:KeyboardEvent<HTMLInputElement>){if(e.key==="Backspace"&&!otp[index]&&index>0)otpRefs.current[index-1]?.focus();if(e.key==="ArrowLeft"&&index>0){e.preventDefault();otpRefs.current[index-1]?.focus()}if(e.key==="ArrowRight"&&index<5){e.preventDefault();otpRefs.current[index+1]?.focus()}}
  function handleOtpPaste(e:ClipboardEvent<HTMLDivElement>){const pasted=e.clipboardData.getData("text").replace(/\D/g,"").slice(0,6);if(!pasted)return;e.preventDefault();setOtp(Array.from({length:6},(_,i)=>pasted[i]||""));otpRefs.current[Math.min(pasted.length,6)-1]?.focus();if(message)setMessage("")}

  async function completePasswordAuth(e:FormEvent){
    e.preventDefault();if(busy)return;
    const mail=email.trim().toLowerCase();
    if(!mail)return setMessage("Enter your email address.");
    if(!validEmail(mail))return setMessage("Enter a valid email address.");
    if(!password)return setMessage("Enter your password.");
    if(password.length<8)return setMessage("Password must be at least 8 characters.");
    if(mode==="register"&&password!==confirmPassword)return setMessage("Passwords do not match.");
    const seq=++actionSeq.current;setBusy(true);setMessage("");
    try{
      const path=mode==="login"?"wickspend/backend/auth/password/login":"wickspend/backend/auth/password/register";
      const r:any=await wickspendApi(path,{method:"POST",body:JSON.stringify({email:mail,password})});
      const t=r?.session_token||r?.token||r?.data?.session_token||r?.data?.token;
      if(!t)throw new Error("Unable to complete sign in right now. Please try again.");
      saveSessionToken(String(t));
      try{await api.auth.session(String(t))}catch(error){clearSessionToken();throw error}
      if(!mounted.current||seq!==actionSeq.current)return;
      router.replace(safeNext());
    }catch(error){
      clearSessionToken();
      if(!mounted.current||seq!==actionSeq.current)return;
      if(error instanceof ApiError&&error.code?.toUpperCase()==="PASSWORD_NOT_SET"){
        try{await supabaseAuth("otp",{email:mail,create_user:false});clearOtp();setStep("emailOtp");setMessage("We sent a 6-digit verification code to your email.")}
        catch(otpError){setStep("telegram");setMessage(otpError instanceof Error?otpError.message:"Email verification is unavailable. Continue with Telegram.")}
      }else setMessage(error instanceof Error?error.message:(mode==="login"?"Sign in failed":"Registration failed"));
    }finally{if(mounted.current&&seq===actionSeq.current)setBusy(false)}
  }

  async function requestTelegramCode(e:FormEvent){e.preventDefault();if(busy)return;const id=telegramId.trim();if(!id)return setMessage("Enter your Telegram user ID.");if(!digitsOnly(id))return setMessage("Telegram user ID must contain numbers only.");const seq=++actionSeq.current;setBusy(true);setMessage("");try{await api.auth.telegramStart({telegram_user_id:id});if(!mounted.current||seq!==actionSeq.current)return;setTelegramId(id);clearOtp();setStep("telegramVerify")}catch(error){if(mounted.current&&seq===actionSeq.current)setMessage(error instanceof Error?error.message:"Unable to send verification code")}finally{if(mounted.current&&seq===actionSeq.current)setBusy(false)}}
  async function verifyEmailOtp(e:FormEvent){e.preventDefault();if(busy)return;if(code.length!==6||!digitsOnly(code))return setMessage("Enter the complete 6-digit verification code.");const mail=email.trim().toLowerCase(),seq=++actionSeq.current;setBusy(true);setMessage("");try{const verified:any=await supabaseAuth("verify",{email:mail,token:code,type:"email"});if(!verified?.access_token)throw new Error("The verification code is invalid or expired.");const exchange:any=await wickspendApi("wickspend/backend/auth/supabase/exchange",{method:"POST",body:JSON.stringify({access_token:verified.access_token})});const token=exchange?.session_token;if(!token)throw new Error("Unable to link your migrated account.");await wickspendApi("wickspend/backend/auth/password/set",{method:"POST",token,body:JSON.stringify({password})});saveSessionToken(token);await api.auth.session(token);if(!mounted.current||seq!==actionSeq.current)return;router.replace(safeNext())}catch(error){clearSessionToken();if(mounted.current&&seq===actionSeq.current)setMessage(error instanceof Error?error.message:"Verification failed")}finally{if(mounted.current&&seq===actionSeq.current)setBusy(false)}}

  async function verifyTelegram(e:FormEvent){e.preventDefault();if(busy)return;const id=telegramId.trim();if(!id){setStep("telegram");return setMessage("Enter your Telegram user ID again.")}if(!digitsOnly(id)){setStep("telegram");return setMessage("Telegram user ID must contain numbers only.")}if(code.length!==6||!digitsOnly(code))return setMessage("Enter the complete 6-digit verification code.");const seq=++actionSeq.current;setBusy(true);setMessage("");try{const r:any=await api.auth.telegramVerify({telegram_user_id:id,code}),t=r?.session_token||r?.token||r?.data?.session_token||r?.data?.token;if(!t)throw new Error("Unable to complete sign in right now. Please try again.");saveSessionToken(String(t));try{await api.auth.session(String(t))}catch(error){clearSessionToken();throw error}if(!mounted.current||seq!==actionSeq.current)return;router.replace(safeNext())}catch(error){clearSessionToken();if(mounted.current&&seq===actionSeq.current)setMessage(error instanceof Error?error.message:"Verification failed")}finally{if(mounted.current&&seq===actionSeq.current)setBusy(false)}}

  function reset(next:Step="email"){actionSeq.current++;setBusy(false);clearOtp();setStep(next);setMessage("")}
  function switchMode(next:PasswordMode){setMode(next);setPassword("");setConfirmPassword("");setMessage("")}
  const lead=step==="email"?(mode==="login"?"Enter your email and password to continue to WickSpend.":"Create your WickSpend account with email and password."):step==="emailOtp"?`Enter the verification code sent to ${email.trim().toLowerCase()}.`:step==="telegram"?"Sign in securely with your Telegram-linked WickSpend account.":`Enter the verification code sent for Telegram ID ${telegramId}.`;
  const otpInputs=<div className={styles.otpGroup} onPaste={handleOtpPaste} aria-label="6-digit verification code">{otp.map((digit,index)=><input key={index} ref={el=>{otpRefs.current[index]=el}} className={styles.otpBox} inputMode="numeric" autoComplete={index===0?"one-time-code":"off"} pattern="[0-9]*" maxLength={1} value={digit} onChange={e=>updateOtp(index,e.target.value)} onKeyDown={e=>handleOtpKeyDown(index,e)} aria-label={`Digit ${index+1}`} disabled={busy}/>)}</div>;

  if(step==="telegramVerify"||step==="emailOtp"){const isEmailOtp=step==="emailOtp";return <main className={styles.screen}><p className={styles.brand}>WickSpend</p><section className={styles.content} aria-busy={busy}><h1 className={styles.title}>Verify your account</h1><p className={`${styles.lead} ${styles.verifyLead}`}>{lead}</p><form className={styles.form} onSubmit={isEmailOtp?verifyEmailOtp:verifyTelegram}>{otpInputs}<div className={styles.emailSummary}>{isEmailOtp?email.trim().toLowerCase():`Telegram ID ${telegramId}`}</div><button className={styles.primary} type="submit" disabled={busy||code.length!==6}>{busy?"Verifying…":isEmailOtp?"Verify & Set Password":"Verify & Sign In"}</button><div className={styles.verifyActions}><button className={styles.helperButton} type="button" disabled={busy} onClick={()=>reset(isEmailOtp?"email":"telegram")}>{isEmailOtp?"Change email":"Change Telegram ID"}</button></div></form>{message&&<p className={styles.message} role="status" aria-live="polite">{message}</p>}<p className={styles.secure}>Secure access to your wallet, purchases and WickSpend services.</p></section></main>}

  return <main className={styles.screen}><p className={styles.brand}>WickSpend</p><section className={styles.content} aria-busy={busy}><h1 className={styles.title}>{step==="email"&&mode==="register"?"Create account":"Welcome back"}</h1><p className={styles.lead}>{lead}</p>{step==="email"?<><form className={styles.form} onSubmit={completePasswordAuth}><div className={styles.authHint}><span className={styles.iconCircle}><MailIcon/></span><span>{mode==="login"?"Email & password":"Create WickSpend account"}</span></div><label className={styles.label} htmlFor="email">Email address</label><input id="email" className={styles.field} type="email" inputMode="email" autoComplete="email" value={email} onChange={e=>{setEmail(e.target.value);if(message)setMessage("")}} placeholder="Enter your email" disabled={busy}/><label className={styles.label} htmlFor="password">Password</label><input id="password" className={styles.field} type="password" autoComplete={mode==="login"?"current-password":"new-password"} value={password} onChange={e=>{setPassword(e.target.value);if(message)setMessage("")}} placeholder="Enter your password" disabled={busy}/>{mode==="register"&&<><label className={styles.label} htmlFor="confirm-password">Confirm password</label><input id="confirm-password" className={styles.field} type="password" autoComplete="new-password" value={confirmPassword} onChange={e=>{setConfirmPassword(e.target.value);if(message)setMessage("")}} placeholder="Confirm your password" disabled={busy}/></>}<button className={styles.primary} type="submit" disabled={busy||!email.trim()||!password}>{busy?(mode==="login"?"Signing in…":"Creating account…"):(mode==="login"?"Sign In":"Create Account")}</button></form><button className={styles.helperButton} type="button" disabled={busy} onClick={()=>switchMode(mode==="login"?"register":"login")}>{mode==="login"?"New to WickSpend? Create account":"Already have an account? Sign in"}</button><div className={styles.divider}>or</div><button className={styles.providerButton} type="button" disabled={busy} onClick={()=>reset("telegram")}><TelegramIcon/>Continue with Telegram</button></>:<><form className={styles.form} onSubmit={requestTelegramCode}><div className={styles.authHint}><span className={styles.iconCircle}><TelegramIcon/></span><span>Telegram secure verification</span></div><label className={styles.label} htmlFor="telegram-id">Telegram user ID</label><input id="telegram-id" className={styles.field} inputMode="numeric" autoComplete="off" value={telegramId} onChange={e=>{setTelegramId(e.target.value);if(message)setMessage("")}} placeholder="Enter your Telegram ID" disabled={busy}/><button className={styles.primary} type="submit" disabled={busy||!telegramId.trim()}>{busy?"Sending…":"Continue with Telegram"}</button></form><div className={styles.divider}>or</div><button className={styles.providerButton} type="button" disabled={busy} onClick={()=>reset("email")}><MailIcon/>Continue with Email & Password</button></>}<button className={styles.secondary} type="button" onClick={()=>router.push("/")}>Back to WickSpend</button>{message&&<p className={styles.message} role="status" aria-live="polite">{message}</p>}<p className={styles.secure}>Secure sign in with your WickSpend account.</p></section></main>;
}
