"use client";
import {PageShell} from "@/components/PageShell";

export default function TelegramConnected(){
  return <PageShell title="Telegram Connected" subtitle="Your WickSpend account is connected to Telegram." back="/settings">
    <section style={{marginTop:32,background:"#f9f9fa",border:"1px solid rgba(0,0,0,.07)",borderRadius:28,boxShadow:"0 6px 18px rgba(0,0,0,.08)",padding:"32px 16px 28px",textAlign:"center"}}>
      <div aria-hidden="true" style={{width:100,height:100,borderRadius:50,background:"#000",color:"#fff",display:"grid",placeItems:"center",fontSize:34,fontWeight:700,margin:"0 auto 20px",boxShadow:"0 6px 18px rgba(0,0,0,.08)"}}>✓</div>
      <h2 style={{fontSize:18,margin:"0 0 20px"}}>Connected</h2>
      <div style={{display:"grid",gap:22,textAlign:"left"}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1.2fr",alignItems:"center"}}><span style={{fontSize:9,color:"#6e6e73"}}>Telegram Username</span><strong style={{fontSize:10}}>Not available</strong></div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1.2fr",alignItems:"center"}}><span style={{fontSize:9,color:"#6e6e73"}}>Connection Status</span><strong style={{fontSize:10}}>Connected</strong></div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1.2fr",alignItems:"center"}}><span style={{fontSize:9,color:"#6e6e73"}}>Connected Date</span><strong style={{fontSize:10}}>Not available</strong></div>
      </div>
    </section>
    <section className="glassCard" style={{marginTop:34,padding:"18px 16px 22px"}}>
      <h3 style={{fontSize:12,margin:"0 0 10px"}}>Telegram notifications</h3>
      <p style={{fontSize:9,lineHeight:1.4,color:"#6e6e73",margin:0}}>OTP, orders, wallet, refunds, rental expiry and security alerts can be delivered here.</p>
    </section>
    <button type="button" disabled title="Telegram disconnect backend is not verified yet" style={{width:"100%",height:44,marginTop:28,borderRadius:22,border:"1px solid rgba(0,0,0,.07)",background:"rgba(255,255,255,.95)",boxShadow:"0 6px 18px rgba(0,0,0,.08)",color:"#db1f1f",fontSize:11,fontWeight:600,opacity:.6}}>Disconnect Telegram</button>
    <p className="screenMessage">Connection details and disconnect controls will become live when the verified Telegram linking contract is available.</p>
  </PageShell>
}
