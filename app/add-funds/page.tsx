"use client";

import Link from "next/link";
import {FormEvent,useEffect,useMemo,useRef,useState,type ReactNode} from "react";
import {useRouter} from "next/navigation";
import {BottomNav} from "@/components/BottomNav";
import {api} from "@/lib/api";
import {getSessionToken} from "@/lib/session";
import styles from "./add-funds.module.css";

type CurrencyCode="NGN"|"GHS"|"KES"|"ZAR"|"XAF"|"XOF"|"USDT"|"USDC";
type Currency={code:CurrencyCode;symbol:string;name:string;fundingSupported:boolean};
const currencies:Currency[]=[
  {code:"NGN",symbol:"₦",name:"Nigerian Naira",fundingSupported:true},
  {code:"GHS",symbol:"GH₵",name:"Ghanaian Cedi",fundingSupported:false},
  {code:"KES",symbol:"KSh",name:"Kenyan Shilling",fundingSupported:false},
  {code:"ZAR",symbol:"R",name:"South African Rand",fundingSupported:false},
  {code:"XAF",symbol:"FCFA",name:"Central African CFA",fundingSupported:false},
  {code:"XOF",symbol:"CFA",name:"West African CFA",fundingSupported:false},
  {code:"USDT",symbol:"USDT",name:"Tether",fundingSupported:false},
  {code:"USDC",symbol:"USDC",name:"USD Coin",fundingSupported:false},
];
const supportedCodes=new Set<CurrencyCode>(currencies.map(c=>c.code));
const asCurrency=(value:unknown):CurrencyCode|null=>{const code=String(value||"").toUpperCase() as CurrencyCode;return supportedCodes.has(code)?code:null};
const balanceOf=(v:any)=>v?.balance_ngn??v?.wallet_balance_ngn??v?.balance??v?.wallet?.balance_ngn??v?.data?.balance_ngn??v?.data?.balance;
const preferenceOf=(v:any)=>asCurrency(v?.preferred_currency??v?.display_currency??v?.currency_code??v?.wallet?.preferred_currency??v?.data?.preferred_currency);
const moneyNgn=(v:unknown)=>{if(v===null||v===undefined||v==="")return"—";const n=Number(v);return Number.isFinite(n)?`₦${n.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}`:"—"};
function paymentUrl(payload:any){const raw=payload?.checkout_url||payload?.payment_url||payload?.authorization_url||payload?.data?.checkout_url||payload?.data?.payment_url||payload?.data?.authorization_url;if(!raw)return"";try{const url=new URL(String(raw),window.location.origin);return url.protocol==="https:"||url.protocol==="http:"?url.toString():""}catch{return""}}

function CurrencyIcon({code}:{code:CurrencyCode}){
  const flag=(children:ReactNode)=><svg viewBox="0 0 18 14" aria-hidden="true" focusable="false">{children}</svg>;
  if(code==="NGN")return flag(<><rect width="18" height="14" rx="1.5" fill="#fff"/><rect width="6" height="14" rx="1.5" fill="#008751"/><rect x="12" width="6" height="14" rx="1.5" fill="#008751"/></>);
  if(code==="GHS")return flag(<><rect width="18" height="4.67" rx="1.5" fill="#CE1126"/><rect y="4.67" width="18" height="4.67" fill="#FCD116"/><rect y="9.34" width="18" height="4.66" rx="1.5" fill="#006B3F"/><path d="m9 5.6.54 1.08 1.2.18-.87.84.2 1.2L9 8.34 7.93 8.9l.2-1.2-.87-.84 1.2-.18L9 5.6Z" fill="#111"/></>);
  if(code==="KES")return flag(<><rect width="18" height="4.1" rx="1.4" fill="#111"/><rect y="4.1" width="18" height="1" fill="#fff"/><rect y="5.1" width="18" height="3.8" fill="#BB0000"/><rect y="8.9" width="18" height="1" fill="#fff"/><rect y="9.9" width="18" height="4.1" rx="1.4" fill="#006600"/><ellipse cx="9" cy="7" rx="1.7" ry="4.1" fill="#BB0000" stroke="#fff" strokeWidth=".6"/><path d="M7.9 4.1 10.1 9.9M10.1 4.1 7.9 9.9" stroke="#111" strokeWidth=".65"/></>);
  if(code==="ZAR")return flag(<><rect width="18" height="7" rx="1.4" fill="#DE3831"/><rect y="7" width="18" height="7" rx="1.4" fill="#002395"/><path d="M0 1.3 7.4 7 0 12.7V9.4L3.1 7 0 4.6V1.3Z" fill="#111"/><path d="m0 0 9 7-9 7V11l5.2-4L0 3V0Z" fill="#fff"/><path d="m0 .9 7.8 6.1L0 13.1v-2.2L5 7 0 3.1V.9Z" fill="#007A4D"/><path d="M6 5.5h12v3H6" fill="#fff"/><path d="M7.7 6.15H18v1.7H7.7" fill="#007A4D"/></>);
  if(code==="XAF"||code==="XOF")return <svg viewBox="0 0 18 18" aria-hidden="true" focusable="false"><circle cx="9" cy="9" r="8" fill="#EEF5FF"/><circle cx="9" cy="9" r="5.8" fill="#0866F5"/><path d="M9 5.2v7.6M5.2 9h7.6M6.3 6.3c1.8 1.7 3.6 1.7 5.4 0M6.3 11.7c1.8-1.7 3.6-1.7 5.4 0" stroke="#fff" strokeWidth=".8" strokeLinecap="round"/></svg>;
  if(code==="USDT")return <svg viewBox="0 0 18 18" aria-hidden="true" focusable="false"><circle cx="9" cy="9" r="8" fill="#26A17B"/><path d="M5 5.1h8v1.7h-3v1c2.15.1 3.7.45 3.7.9 0 .48-2.1.9-4.7.9s-4.7-.42-4.7-.9c0-.45 1.55-.8 3.7-.9v-1H5V5.1Zm3 4.1v3.7h2V9.2c-.32.02-.66.03-1 .03s-.68-.01-1-.03Z" fill="#fff"/></svg>;
  return <svg viewBox="0 0 18 18" aria-hidden="true" focusable="false"><circle cx="9" cy="9" r="8" fill="#2775CA"/><path d="M10.8 6.5c-.45-.48-1.02-.72-1.73-.72-.9 0-1.52.4-1.52.98 0 .55.43.8 1.7 1.08 1.8.4 2.62 1.12 2.62 2.35 0 1.35-1.02 2.27-2.55 2.42v1.1H8.3v-1.1a4.2 4.2 0 0 1-2.4-.98l.78-1.12c.7.57 1.46.86 2.25.86.95 0 1.58-.38 1.58-1 0-.55-.42-.84-1.74-1.14-1.75-.4-2.56-1.08-2.56-2.28 0-1.28.93-2.17 2.34-2.36V3.5h1.02v1.05c.82.1 1.5.42 2.08.93l-.85 1.02Z" fill="#fff"/></svg>;
}

export default function AddFunds(){
  const router=useRouter();
  const[selectedCode,setSelectedCode]=useState<CurrencyCode>("NGN");
  const[displayCurrency,setDisplayCurrency]=useState<CurrencyCode>("NGN");
  const[amount,setAmount]=useState("5000");
  const[balance,setBalance]=useState<unknown>(null);
  const[walletState,setWalletState]=useState<"loading"|"ready"|"error"|"signed-out">("loading");
  const[hydrated,setHydrated]=useState(false);
  const[hidden,setHidden]=useState(false);
  const[busy,setBusy]=useState(false);
  const[message,setMessage]=useState("");
  const requestSeq=useRef(0);

  useEffect(()=>{let cancelled=false;const saved=asCurrency(localStorage.getItem("wickspend_display_currency"));if(saved){setDisplayCurrency(saved)}setHydrated(true);const token=getSessionToken();if(!token){setWalletState("signed-out");return()=>{cancelled=true}}api.wallet.get(token).then((wallet:any)=>{if(cancelled)return;setBalance(balanceOf(wallet));const accountPreference=preferenceOf(wallet);if(accountPreference){setDisplayCurrency(accountPreference)}setWalletState("ready")}).catch(()=>{if(!cancelled)setWalletState("error")});return()=>{cancelled=true}},[]);

  const selected=useMemo(()=>currencies.find(c=>c.code===selectedCode)||currencies[0],[selectedCode]);
  const value=Number(amount);
  const validAmount=selected.code==="NGN"&&amount.trim()!==""&&Number.isFinite(value)&&Number.isInteger(value)&&value>=500;
  const amountIssue=selected.code!=="NGN"||amount.trim()===""?"":!Number.isFinite(value)?"Enter a valid NGN amount.":!Number.isInteger(value)?"Enter a whole NGN amount.":value<500?"Minimum for NGN: ₦500":"";
  const canContinue=hydrated&&selected.fundingSupported&&validAmount&&!busy;
  const methodValue=!hydrated?"loading":selected.fundingSupported?"korapay":"unavailable";
  const methodText=methodValue==="loading"?"Loading funding methods…":methodValue==="korapay"?"KoraPay secure checkout":"Funding method not available yet";
  const walletValue=walletState==="loading"?"Loading…":hidden?"••••••":moneyNgn(balance);

  function selectCurrency(code:CurrencyCode){requestSeq.current++;const next=currencies.find(c=>c.code===code);if(!next?.fundingSupported){setMessage(`${code} funding is coming soon. Use NGN to continue to KoraPay.`);return}setSelectedCode(code);setMessage("")}
  async function submit(e:FormEvent){e.preventDefault();if(!canContinue)return;const token=getSessionToken();if(!token){setMessage("Secure sign in is required before funding your wallet. Redirecting to login…");window.setTimeout(()=>router.push("/login?next=%2Fadd-funds&secure=1"),350);return}const seq=++requestSeq.current;setBusy(true);setMessage("Creating secure payment…");try{const r:any=await api.wallet.initializeFunding(token,value);if(seq!==requestSeq.current)return;const url=paymentUrl(r);if(!url)throw new Error("A valid payment link was not returned by the funding service.");setMessage("Redirecting to secure payment…");window.location.assign(url)}catch(err){if(seq===requestSeq.current)setMessage(err instanceof Error?err.message:"Unable to initialize funding")}finally{if(seq===requestSeq.current)setBusy(false)}}

  return <main className={styles.page}><div className={styles.screen}>
    <header className={styles.header}><h1>Add Funds</h1><p>Fund your WickSpend wallet securely.</p></header>

    <section className={styles.balanceCard} aria-busy={walletState==="loading"}>
      <div className={styles.balanceTop}><span>Wallet Balance</span><button type="button" className={styles.balanceToggle} onClick={()=>setHidden(v=>!v)} aria-pressed={hidden}>◉ {hidden?"Show":"Show / Hide"}</button></div>
      <div className={styles.balanceValue}>{walletValue}</div>
      <p className={styles.displayCurrency}>Display Currency&nbsp; • &nbsp;{displayCurrency}</p>
      <Link className={styles.overviewButton} href="/wallet">Overview</Link>
    </section>

    <section className={styles.fundingSection}>
      <h2>Fund your wallet</h2><p className={styles.helper}>Fund with NGN now. More currencies are coming soon.</p>
      <div className={styles.currencyHeading}><span>Funding Currency</span><b>NGN available</b></div>
      <div className={styles.currencyGrid} role="group" aria-label="Funding currency">
        {currencies.map(currency=><button key={currency.code} type="button" className={`${styles.currencyChip} ${selected.code===currency.code?styles.selected:""}`} aria-pressed={selected.code===currency.code} aria-label={`${currency.name}, ${currency.code}${currency.fundingSupported?"":", coming soon"}`} title={currency.fundingSupported?`${currency.code} funding`:`${currency.code} funding coming soon`} onClick={()=>selectCurrency(currency.code)} disabled={busy||!currency.fundingSupported}><span className={styles.currencyIcon}><CurrencyIcon code={currency.code}/></span><span>{currency.code}</span></button>)}
      </div>
    </section>

    <form onSubmit={submit} aria-busy={busy} className={styles.form}>
      <label className={styles.fieldLabel} htmlFor="fundingAmount">Amount</label>
      <div className={`${styles.amountBox} ${selected.fundingSupported?"":styles.unavailableField}`}><span className={styles.amountSymbol}>{selected.symbol}</span><input id="fundingAmount" type="number" inputMode="decimal" step="1" min={selected.code==="NGN"?500:undefined} value={amount} disabled={busy} aria-invalid={Boolean(amountIssue)} aria-describedby="fundingMinimum" onChange={e=>{requestSeq.current++;setAmount(e.target.value);setMessage("")}}/></div>

      <label className={styles.fieldLabel} htmlFor="fundingMethod">Funding Method</label>
      <div className={`${styles.methodBox} ${selected.fundingSupported?"":styles.unavailableField}`}><select id="fundingMethod" value={methodValue} disabled={methodValue!=="korapay"||busy} aria-label={`Funding method for ${selected.code}`} onChange={()=>{}}>{methodValue==="loading"?<option value="loading">Loading funding methods…</option>:methodValue==="korapay"?<option value="korapay">KoraPay secure checkout</option>:<option value="unavailable">Funding method not available yet</option>}</select><span aria-hidden="true">⌄</span></div>

      <p className={`${styles.minimum} ${amountIssue?styles.minimumError:""}`} id="fundingMinimum">{selected.code==="NGN"?(amountIssue||"Minimum for NGN: ₦500"):methodText}</p>
      {selected.code!=="NGN"&&<p className={styles.availabilityNote}>Direct {selected.code} funding is not enabled by the current wallet backend. No conversion or deposit address will be created.</p>}
      {selected.code==="NGN"&&walletState==="error"&&<p className={styles.availabilityNote}>Wallet balance is temporarily unavailable, but you can still start a secure NGN funding payment.</p>}
      <button className={styles.cta} type="submit" disabled={!canContinue}>{busy?"Preparing payment…":"Continue"}</button>
      {message&&<p className={styles.message} role="status">{message}</p>}
    </form>
  </div><BottomNav activeHref="/wallet"/></main>;
}
