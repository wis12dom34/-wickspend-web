"use client";
import Link from "next/link";
import {useEffect,useState} from "react";
import {useRouter} from "next/navigation";
import {PageShell} from "@/components/PageShell";
import {api} from "@/lib/api";
import {clearSessionToken,getSessionToken} from "@/lib/session";

export default function Settings(){
  const router=useRouter(),[showSignOut,setShowSignOut]=useState(false),[busy,setBusy]=useState(false);
  useEffect(()=>{const q=new URLSearchParams(window.location.search);if(q.get("signout")==="1")setShowSignOut(true)},[]);
  useEffect(()=>{if(!showSignOut)return;const onKey=(event:KeyboardEvent)=>{if(event.key==="Escape"&&!busy)setShowSignOut(false)};window.addEventListener("keydown",onKey);return()=>window.removeEventListener("keydown",onKey)},[showSignOut,busy]);
  async function signOut(){
    if(busy)return;
    const token=getSessionToken();
    setBusy(true);
    try{if(token)await api.auth.logout(token)}catch{}finally{clearSessionToken();setBusy(false);router.replace("/login")}
  }
  return <PageShell title="Settings" subtitle="Preferences, connections and privacy">
    <section className="profileGroup">
      <p>Preferences</p>
      <div className="profileRows">
        <Link className="profileRow settingsRow" href="/notification-preferences"><span aria-hidden="true">🔔</span><span><b>Notifications</b><small>Choose what WickSpend sends</small></span><i aria-hidden="true">›</i></Link>
        <div className="profileRow settingsRow" aria-disabled="true"><span aria-hidden="true">◎</span><span><b>Language</b><small>English</small></span><em>English</em><i aria-hidden="true">›</i></div>
        <div className="profileRow settingsRow" aria-disabled="true"><span aria-hidden="true">◐</span><span><b>Appearance</b><small>Light</small></span><em>Light</em><i aria-hidden="true">›</i></div>
        <Link className="profileRow settingsRow" href="/wallet"><span aria-hidden="true">$</span><span><b>Currency</b><small>NGN</small></span><em>NGN</em><i aria-hidden="true">›</i></Link>
      </div>
    </section>
    <section className="profileGroup settingsSupportGroup">
      <p>Connections &amp; support</p>
      <div className="profileRows">
        <Link className="profileRow settingsRow" href="/telegram-connection"><span aria-hidden="true">▣</span><span><b>Telegram</b><small>Not connected</small></span><i aria-hidden="true">›</i></Link>
        <Link className="profileRow settingsRow" href="/help-support"><span aria-hidden="true">?</span><span><b>Help &amp; Support</b><small>Get assistance</small></span><i aria-hidden="true">›</i></Link>
        <div className="profileRow settingsRow" aria-disabled="true"><span aria-hidden="true">≡</span><span><b>Privacy &amp; Terms</b><small>Review our policies</small></span><i aria-hidden="true">›</i></div>
      </div>
    </section>
    <button type="button" className="settingsSignOut" onClick={()=>setShowSignOut(true)} aria-haspopup="dialog"><span aria-hidden="true">↗</span><b>Sign out</b><i aria-hidden="true">›</i></button>
    {showSignOut&&<div role="presentation" onMouseDown={event=>{if(event.target===event.currentTarget&&!busy)setShowSignOut(false)}} style={{position:"fixed",inset:0,zIndex:180,background:"rgba(0,0,0,.42)",display:"flex",alignItems:"flex-end",justifyContent:"center"}}>
      <section role="dialog" aria-modal="true" aria-labelledby="sign-out-title" style={{width:"min(calc(100% - 16px),374px)",borderRadius:"30px",border:"1px solid rgba(255,255,255,.75)",background:"rgba(251,251,251,.97)",backdropFilter:"blur(12px)",boxShadow:"0 -8px 30px rgba(0,0,0,.16)",padding:"12px 18px calc(18px + env(safe-area-inset-bottom))",marginBottom:8}}>
        <div aria-hidden="true" style={{width:52,height:5,borderRadius:3,background:"#b8b8bd",margin:"0 auto 31px"}}/>
        <h2 id="sign-out-title" style={{margin:"0 0 10px",fontSize:22,textAlign:"center"}}>Sign out of WickSpend?</h2>
        <p style={{margin:"0 auto 32px",maxWidth:274,fontSize:11,lineHeight:1.35,color:"#616169",textAlign:"center"}}>You’ll need to sign in again to access your wallet, orders and active services.</p>
        <button type="button" onClick={signOut} disabled={busy} style={{width:"100%",height:48,border:0,borderRadius:24,background:"#050505",color:"#fff",fontSize:13,fontWeight:600}}>{busy?"Signing out…":"Sign out"}</button>
        <button type="button" onClick={()=>setShowSignOut(false)} disabled={busy} style={{width:"100%",height:48,border:"1px solid #d6d6db",borderRadius:24,background:"#fff",color:"#050505",fontSize:13,fontWeight:600,marginTop:12}}>Cancel</button>
      </section>
    </div>}
  </PageShell>
}
