"use client";
import {PageShell} from "@/components/PageShell";

export default function TelegramConnection(){
  return <PageShell title="Connect Telegram" subtitle="Connect Telegram to access WickSpend purchases and receive important account/order notifications through Telegram." back="/settings">
    <section style={{marginTop:40,background:"#f9f9fa",border:"1px solid rgba(0,0,0,.07)",borderRadius:28,boxShadow:"0 6px 18px rgba(0,0,0,.08)",padding:"34px 36px 20px",textAlign:"center"}}>
      <div aria-hidden="true" style={{width:100,height:100,borderRadius:50,background:"#000",color:"#fff",display:"grid",placeItems:"center",fontSize:34,margin:"0 auto 28px",boxShadow:"0 6px 18px rgba(0,0,0,.08)"}}>↗</div>
      <h2 style={{fontSize:18,margin:"0 0 10px"}}>Telegram not connected</h2>
      <p style={{fontSize:10,lineHeight:1.35,color:"#6e6e73",margin:"0 auto 28px",maxWidth:268}}>Connect your Telegram account to receive OTP, order, wallet and security updates in one secure place.</p>
      <button type="button" disabled title="Telegram connection backend is not verified yet" style={{width:"100%",height:46,border:0,borderRadius:23,background:"#000",color:"#fff",fontSize:11,fontWeight:600,opacity:.55}}>Connect Telegram</button>
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
      <p style={{fontSize:9,color:"#6e6e73",margin:"9px 0 0"}}>WickSpend only links the Telegram account you approve.</p>
    </section>
    <p className="screenMessage">Telegram connection will be enabled when the verified backend link contract is available.</p>
  </PageShell>
}
