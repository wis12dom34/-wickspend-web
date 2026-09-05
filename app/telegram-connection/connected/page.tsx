"use client";
import Link from "next/link";
import {useEffect,useState} from "react";
import {PageShell} from "@/components/PageShell";
import {api} from "@/lib/api";
import {getSessionToken} from "@/lib/session";

function formatConnectedDate(value:any){
  if(!value)return "Not available";
  const date=new Date(value);
  if(Number.isNaN(date.getTime()))return "Not available";
  return date.toLocaleString(undefined,{year:"numeric",month:"short",day:"numeric",hour:"numeric",minute:"2-digit"});
}

export default function TelegramConnected(){
  const[username,setUsername]=useState("Not available"),[connectedDate,setConnectedDate]=useState("Not available"),[loading,setLoading]=useState(true);
  useEffect(()=>{
    let active=true;
    const token=getSessionToken();
    if(!token){setLoading(false);return()=>{active=false}}
    api.auth.session(token).then((data:any)=>{
      if(!active)return;
      const user=data?.user||data?.session?.user||data?.data?.user||data?.data||data||{};
      const rawUsername=user?.telegram_username||user?.telegramUsername||user?.username||"";
      const rawDate=user?.telegram_connected_at||user?.telegramConnectedAt||user?.telegram_linked_at||user?.telegramLinkedAt||"";
      setUsername(rawUsername?`@${String(rawUsername).replace(/^@/,"")}`:"Not available");
      setConnectedDate(formatConnectedDate(rawDate));
      setLoading(false);
    }).catch(()=>{if(active)setLoading(false)});
    return()=>{active=false};
  },[]);

  return <PageShell title="Telegram Connected" subtitle="Your WickSpend account is connected to Telegram." back="/settings">
    <section aria-busy={loading} style={{marginTop:32,background:"#f9f9fa",border:"1px solid rgba(0,0,0,.07)",borderRadius:28,boxShadow:"0 6px 18px rgba(0,0,0,.08)",padding:"32px 16px 28px",textAlign:"center"}}>
      <div aria-hidden="true" style={{width:100,height:100,borderRadius:50,background:"#000",color:"#fff",display:"grid",placeItems:"center",fontSize:34,fontWeight:700,margin:"0 auto 20px",boxShadow:"0 6px 18px rgba(0,0,0,.08)"}}>✓</div>
      <h2 style={{fontSize:18,margin:"0 0 20px"}}>Connected</h2>
      <div style={{display:"grid",gap:22,textAlign:"left"}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1.2fr",alignItems:"center"}}><span style={{fontSize:9,color:"#6e6e73"}}>Telegram Username</span><strong style={{fontSize:10}}>{loading?"Checking…":username}</strong></div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1.2fr",alignItems:"center"}}><span style={{fontSize:9,color:"#6e6e73"}}>Connection Status</span><strong style={{fontSize:10}}>Connected</strong></div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1.2fr",alignItems:"center"}}><span style={{fontSize:9,color:"#6e6e73"}}>Connected Date</span><strong style={{fontSize:10}}>{loading?"Checking…":connectedDate}</strong></div>
      </div>
    </section>
    <section className="glassCard" style={{marginTop:34,padding:"18px 16px 22px"}}>
      <h3 style={{fontSize:12,margin:"0 0 10px"}}>Telegram notifications</h3>
      <p style={{fontSize:9,lineHeight:1.4,color:"#6e6e73",margin:0}}>OTP, orders, wallet, refunds, rental expiry and security alerts can be delivered here.</p>
    </section>
    <Link href="/telegram-connection/disconnect" style={{width:"100%",height:44,marginTop:28,borderRadius:22,border:"1px solid rgba(0,0,0,.07)",background:"rgba(255,255,255,.95)",boxShadow:"0 6px 18px rgba(0,0,0,.08)",color:"#db1f1f",fontSize:11,fontWeight:600,display:"grid",placeItems:"center"}}>Disconnect Telegram</Link>
    <p className="screenMessage">Disconnect remains unavailable until the verified Telegram linking contract is available.</p>
  </PageShell>
}
