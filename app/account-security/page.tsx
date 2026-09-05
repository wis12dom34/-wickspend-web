"use client";

import {useEffect,useMemo,useState} from "react";
import {PageShell} from "@/components/PageShell";
import {api,ApiError} from "@/lib/api";
import {clearSessionToken,getSessionToken} from "@/lib/session";

function firstValue(source:any,keys:string[]){for(const key of keys){const value=source?.[key];if(value!==undefined&&value!==null&&value!=="")return value}return undefined}
function boolValue(value:any){if(typeof value==="boolean")return value;if(typeof value==="number")return value===1;if(typeof value==="string"){const v=value.toLowerCase();if(["true","1","yes","enabled","active","verified"].includes(v))return true;if(["false","0","no","disabled","inactive"].includes(v))return false}return undefined}
function numberValue(value:any){const n=Number(value);return Number.isFinite(n)?n:undefined}
function dateLabel(value:any){if(!value)return "";const d=new Date(value);if(Number.isNaN(d.getTime()))return "";const days=Math.max(0,Math.floor((Date.now()-d.getTime())/86400000));if(days===0)return "Updated today";if(days===1)return "Updated yesterday";return `Updated ${days} days ago`}

export default function AccountSecurity(){
  const [status,setStatus]=useState("Checking session…");
  const [signedIn,setSignedIn]=useState(false);
  const [checking,setChecking]=useState(true);
  const [session,setSession]=useState<any>(null);

  useEffect(()=>{
    let active=true;
    const token=getSessionToken();
    if(!token){setStatus("You are not signed in.");setChecking(false);return()=>{active=false};}
    api.auth.session(token).then((payload:any)=>{
      if(!active)return;
      const data=payload?.user||payload?.session?.user||payload?.data?.user||payload?.data||payload;
      setSession(data&&typeof data==="object"?data:null);
      setSignedIn(true);setStatus("");setChecking(false);
    }).catch(e=>{
      if(!active)return;
      if(e instanceof ApiError&&(e.status===401||e.status===403)){clearSessionToken();setSignedIn(false);setStatus("Your session has expired.");}
      else setStatus("Couldn’t verify your session right now.");
      setChecking(false);
    });
    return()=>{active=false};
  },[]);

  const details=useMemo(()=>{
    const score=numberValue(firstValue(session,["security_score","securityScore","account_security_score"]));
    const twoFactor=boolValue(firstValue(session,["two_factor_enabled","twoFactorEnabled","mfa_enabled","mfaEnabled","two_factor_authentication"]));
    const trustedSessions=numberValue(firstValue(session,["trusted_sessions_count","trusted_devices","active_sessions_count","session_count"]));
    const recoveryCodes=numberValue(firstValue(session,["recovery_codes_remaining","recoveryCodesRemaining"]));
    const passwordUpdated=dateLabel(firstValue(session,["password_updated_at","passwordUpdatedAt","password_changed_at"]));
    return{score,twoFactor,trustedSessions,recoveryCodes,passwordUpdated};
  },[session]);

  const scoreTitle=checking?"Checking":details.score!==undefined?(details.score>=85?"Strong":details.score>=60?"Good":"Review"):signedIn?"Protected":"Review";
  const scoreText=details.score!==undefined?`${Math.round(details.score)} / 100`:"—";
  const scoreNote=details.score!==undefined&&details.score<100?"Review the available security controls below.":signedIn?"Your WickSpend session is authenticated.":"Sign in to review your account security.";
  const twoFactorText=details.twoFactor===true?"Enabled":details.twoFactor===false?"Disabled":signedIn?"Managed by Telegram sign-in":"Unavailable";
  const sessionText=details.trustedSessions!==undefined?`${details.trustedSessions} trusted ${details.trustedSessions===1?"device":"devices"}`:signedIn?"Current browser session active":"No active session";
  const recoveryText=details.recoveryCodes!==undefined?`${details.recoveryCodes} codes remaining`:"Not exposed by current sign-in API";

  return <PageShell title="Account Security" subtitle="Protect your WickSpend account" back="/profile">
    <section className="securityScore" aria-busy={checking}>
      <span className="securityScoreIcon" aria-hidden="true">◇</span>
      <div><small>Security score</small><strong>{scoreTitle}</strong></div>
      <b>{scoreText}</b>
      <p>{scoreNote}</p>
    </section>

    <section className="securitySection">
      <h2>Security controls</h2>
      <div className="securityRows">
        <div className="securityRow" aria-disabled="true"><span aria-hidden="true">◉</span><div><b>Two-factor authentication</b><small>{twoFactorText}</small></div><i aria-hidden="true">›</i></div>
        <div className="securityRow" aria-disabled="true"><span aria-hidden="true">◇</span><div><b>Password</b><small>{details.passwordUpdated||"Managed through your Telegram-linked account"}</small></div><i aria-hidden="true">›</i></div>
        <div className="securityRow" aria-disabled="true"><span aria-hidden="true">▣</span><div><b>Active sessions</b><small>{sessionText}</small></div><i aria-hidden="true">›</i></div>
        <div className="securityRow" aria-disabled="true"><span aria-hidden="true">≡</span><div><b>Recovery codes</b><small>{recoveryText}</small></div><i aria-hidden="true">›</i></div>
      </div>
    </section>

    <section className="securityAlert">
      <span aria-hidden="true">✓</span>
      <div><b>{signedIn?"Session protection active":"Security review unavailable"}</b><small>{signedIn?"WickSpend will continue to validate your authenticated session.":"Sign in to review account activity."}</small></div>
    </section>

    <button type="button" className="securityReviewButton" disabled title="Active-session management is not exposed by the current backend API">Review active sessions</button>
    {status&&<p className="screenMessage" role="status">{status}</p>}
  </PageShell>;
}
