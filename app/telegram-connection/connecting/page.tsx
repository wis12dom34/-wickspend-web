import {PageShell} from "@/components/PageShell";

export default function TelegramConnecting(){
  return <PageShell title="Connecting Telegram" subtitle="Establishing a secure connection." back="/telegram-connection">
    <section style={{marginTop:68,background:"rgba(255,255,255,.95)",border:"1px solid rgba(0,0,0,.07)",borderRadius:28,boxShadow:"0 6px 18px rgba(0,0,0,.08)",padding:"33px 36px 28px",textAlign:"center"}}>
      <div aria-hidden="true" style={{width:100,height:100,borderRadius:50,background:"#f9f9fa",border:"1px solid rgba(0,0,0,.07)",display:"grid",placeItems:"center",margin:"0 auto 28px"}}>
        <div style={{width:62,height:62,borderRadius:31,background:"#000",color:"#fff",display:"grid",placeItems:"center",fontSize:20,fontWeight:700,letterSpacing:2}}>•••</div>
      </div>
      <h2 style={{fontSize:18,margin:"0 0 10px"}}>Securing connection…</h2>
      <p style={{fontSize:10,lineHeight:1.35,color:"#6e6e73",margin:"0 auto 30px",maxWidth:270}}>Verifying your WickSpend session and Telegram approval.</p>
      <div style={{display:"grid",gap:14,textAlign:"left",fontSize:9,fontWeight:600}}>
        <div>1&nbsp;&nbsp; Open secure Telegram approval</div>
        <div>2&nbsp;&nbsp; Confirm account</div>
      </div>
    </section>
    <section style={{marginTop:36,background:"#f9f9fa",border:"1px solid rgba(0,0,0,.07)",borderRadius:22,padding:"18px 16px 20px"}}>
      <b style={{fontSize:10}}>Do not close this screen</b>
      <p style={{fontSize:9,color:"#6e6e73",margin:"12px 0 0"}}>The connection completes automatically after Telegram approval.</p>
    </section>
    <p className="screenMessage">This is the Figma connecting state. Live transition will be enabled only after the Telegram approval backend contract is verified.</p>
  </PageShell>
}
