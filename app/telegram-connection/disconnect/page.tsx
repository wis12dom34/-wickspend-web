"use client";
import Link from "next/link";
import {PageShell} from "@/components/PageShell";

export default function TelegramDisconnectConfirmation(){
  return <PageShell title="Telegram Connected" subtitle="Your WickSpend account is connected to Telegram." back="/telegram-connection/connected">
    <div aria-hidden="true" style={{position:"fixed",inset:0,zIndex:140,background:"rgba(0,0,0,.12)"}}/>
    <section role="dialog" aria-modal="true" aria-labelledby="disconnect-telegram-title" style={{position:"fixed",left:"50%",bottom:0,zIndex:160,transform:"translateX(-50%)",width:"min(100%,390px)",minHeight:388,borderRadius:"30px 30px 0 0",border:"1px solid rgba(0,0,0,.07)",background:"rgba(255,255,255,.97)",boxShadow:"0 6px 18px rgba(0,0,0,.08)",padding:"26px 22px calc(54px + env(safe-area-inset-bottom))"}}>
      <h2 id="disconnect-telegram-title" style={{fontSize:20,margin:"0 0 14px"}}>Disconnect Telegram?</h2>
      <p style={{fontSize:10,lineHeight:1.35,color:"#6e6e73",margin:"0 0 24px"}}>You will stop receiving WickSpend notifications and account/order updates through Telegram.</p>
      <p style={{fontSize:9,fontWeight:600,margin:"0 0 66px"}}>Your WickSpend account and purchases remain unchanged.</p>
      <Link href="/telegram-connection/connected" style={{height:46,borderRadius:23,background:"#000",color:"#fff",display:"grid",placeItems:"center",fontSize:11,fontWeight:600,boxShadow:"0 5px 12px rgba(0,0,0,.15)"}}>Keep Connected</Link>
      <button type="button" disabled title="Telegram disconnect backend is not verified yet" style={{width:"100%",height:44,marginTop:10,borderRadius:22,border:"1px solid rgba(0,0,0,.07)",background:"rgba(255,255,255,.95)",boxShadow:"0 6px 18px rgba(0,0,0,.08)",color:"#db1f1f",fontSize:11,fontWeight:600,opacity:.6}}>Disconnect Telegram</button>
      <p style={{fontSize:9,color:"#6e6e73",textAlign:"center",margin:"18px 0 0"}}>You can reconnect at any time.</p>
    </section>
  </PageShell>
}
