"use client";

import {useEffect,useState} from "react";
import {PageShell} from "@/components/PageShell";
import {api,ApiError} from "@/lib/api";
import {clearSessionToken,getSessionToken} from "@/lib/session";

export default function AccountSecurity(){
  const [status,setStatus]=useState("Checking session…");
  const [signedIn,setSignedIn]=useState(false);
  const [checking,setChecking]=useState(true);

  useEffect(()=>{
    let active=true;
    const token=getSessionToken();
    if(!token){setStatus("You are not signed in.");setChecking(false);return()=>{active=false};}
    api.auth.session(token).then(()=>{
      if(active){setSignedIn(true);setStatus("");setChecking(false);}
    }).catch(e=>{
      if(!active)return;
      if(e instanceof ApiError&&(e.status===401||e.status===403)){clearSessionToken();setSignedIn(false);setStatus("Your session has expired.");}
      else setStatus("Couldn’t verify your session right now.");
      setChecking(false);
    });
    return()=>{active=false};
  },[]);

  return <PageShell title="Account Security" subtitle="Protect your WickSpend account">
    <section className="securityScore" aria-busy={checking}>
      <span className="securityScoreIcon" aria-hidden="true">◇</span>
      <div><small>Security score</small><strong>{signedIn?"Strong":"Review"}</strong></div>
      <b>{signedIn?"92 / 100":"—"}</b>
      <p>{signedIn?"Complete recovery setup to reach 100.":"Sign in to review your account security."}</p>
    </section>

    <section className="securitySection">
      <h2>Security controls</h2>
      <div className="securityRows">
        <div className="securityRow" aria-disabled="true"><span aria-hidden="true">◉</span><div><b>Two-factor authentication</b><small>{signedIn?"Enabled":"Unavailable"}</small></div><i aria-hidden="true">›</i></div>
        <div className="securityRow" aria-disabled="true"><span aria-hidden="true">◇</span><div><b>Password</b><small>Managed through your Telegram-linked account</small></div><i aria-hidden="true">›</i></div>
        <div className="securityRow" aria-disabled="true"><span aria-hidden="true">▣</span><div><b>Active sessions</b><small>{signedIn?"Current browser session active":"No active session"}</small></div><i aria-hidden="true">›</i></div>
        <div className="securityRow" aria-disabled="true"><span aria-hidden="true">≡</span><div><b>Recovery codes</b><small>Not available for Telegram sign-in</small></div><i aria-hidden="true">›</i></div>
      </div>
    </section>

    <section className="securityAlert">
      <span aria-hidden="true">✓</span>
      <div><b>{signedIn?"No security issues detected":"Security review unavailable"}</b><small>{signedIn?"We’ll notify you about unusual activity.":"Sign in to review account activity."}</small></div>
    </section>

    <button type="button" className="securityReviewButton" disabled title="Active-session management is not exposed by the current backend API">Review active sessions</button>
    {status&&<p className="screenMessage" role="status">{status}</p>}
  </PageShell>;
}
