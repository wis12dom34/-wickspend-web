"use client";
import {useEffect,useState} from "react";
import {PageShell} from "@/components/PageShell";
import {api} from "@/lib/api";
import {getSessionToken} from "@/lib/session";

function telegramIdentity(payload:any){
  const user=payload?.user||payload?.session?.user||payload?.data?.user||payload?.data||payload;
  const username=user?.telegram_username||user?.username;
  const id=user?.telegram_user_id||user?.telegram_id||user?.telegramId;
  return {username,id,active:Boolean(username||id)};
}

export default function TelegramConnection(){
  const[state,setState]=useState<"checking"|"signed-in"|"unknown">("checking"),[identity,setIdentity]=useState("");
  useEffect(()=>{let alive=true;const token=getSessionToken();if(!token){setState("unknown");return()=>{alive=false}}api.auth.session(token).then((payload:any)=>{if(!alive)return;const t=telegramIdentity(payload);setState(t.active?"signed-in":"unknown");if(t.username)setIdentity(`@${String(t.username).replace(/^@/,"")}`);else if(t.id)setIdentity(`Telegram ID ${t.id}`)}).catch(()=>{if(alive)setState("unknown")});return()=>{alive=false}},[]);
  const signedIn=state==="signed-in";
  return <PageShell title="Connect Telegram" subtitle="Connect Telegram to access WickSpend purchases and receive important account/order notifications through Telegram." back="/settings">
    <section style={{marginTop:40,background:"#f9f9fa",border:"1px solid rgba(0,0,0,.07)",borderRadius:28,boxShadow:"0 6px 18px rgba(0,0,0,.08)",padding:"34px 36px 20px",textAlign:"center"}}>
      <div aria-hidden="true" style={{width:100,height:100,borderRadius:50,background:"#000",color:"#fff",display:"grid",placeItems:"center",fontSize:34,margin:"0 auto 28px",boxShadow:"0 6px 18px rgba(0,0,0,.08)"}}>↗</div>
      <h2 style={{fontSize:18,margin:"0 0 10px"}}>{state==="checking"?"Checking Telegram…":signedIn?"Telegram sign-in active":"Telegram notification link unavailable"}</h2>
      <p style={{fontSize:10,lineHeight:1.35,color:"#6e6e73",margin:"0 auto 28px",maxWidth:268}}>{signedIn?`Your WickSpend session is authenticated with Telegram${identity?` (${identity})`:""}. The separate bot-notification link is not enabled by the current backend yet.`:"WickSpend cannot verify a separate Telegram bot-notification link from the current backend. Sign-in and notification linking are treated as separate states."}</p>
      <button type="button" disabled title="Telegram notification-link backend is not verified yet" style={{width:"100%",height:46,border:0,borderRadius:23,background:"#000",color:"#fff",fontSize:11,fontWeight:600,opacity:.55}}>Notification link unavailable</button>
    </section>
    <section className="glassCard" style={{marginTop:28,padding:"18px 16px 20px"}}>
      <h3 style={{fontSize:12,margin:"0 0 12px"}}>Why connect?</h3>
      <div style={{fontSize:9,lineHeight:1.45,color:"#6e6e73"}}>
        <div>• Receive important account notifications</div>
        <div>• Open WickSpend purchases from Telegram</div>
        <div>• Get OTP/order updates faster</div>
        <div>• Keep sensitive delivery tied to your account</div>
      </div>
    </section>
    <section className="glassCard" style={{marginTop:26,background:"#f9f9fa",boxShadow:"none"}}>
      <b style={{fontSize:10}}>Secure connection</b>
      <p style={{fontSize:9,color:"#6e6e73",margin:"9px 0 0"}}>Telegram sign-in status is read from your WickSpend session. Bot notifications will only be shown as connected when a verified link contract exists.</p>
    </section>
    <p className="screenMessage">No connection is claimed until the backend confirms the Telegram notification link.</p>
  </PageShell>
}
