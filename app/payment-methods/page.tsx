"use client";
import Link from "next/link";
import {PageShell} from "@/components/PageShell";

export default function PaymentMethods(){return <PageShell title="Payment Methods" subtitle="Choose how you fund your wallet" back="/profile">
  <section className="walletHero" style={{height:110,background:"#050505",color:"#fff"}}>
    <p style={{color:"#fff",fontWeight:700,fontSize:15}}>▣ &nbsp; Wallet funding</p>
    <small style={{display:"block",marginTop:8,color:"#bdbdc2"}}>Payments are verified before your balance updates.</small>
    <small style={{display:"block",marginTop:18,color:"#fff",fontWeight:600}}>Preferred currency&nbsp; • &nbsp;USD</small>
  </section>
  <section className="profileGroup"><p>Available methods</p><div className="profileRows">
    <Link className="profileRow" href="/add-funds"><span aria-hidden="true">▣</span><b>Bank transfer<small style={{display:"block",fontWeight:400,color:"#6e6e73",marginTop:4}}>Fast confirmation</small></b><i style={{fontSize:9,background:"#050505",color:"#fff",padding:"6px 9px",borderRadius:12}}>Recommended</i></Link>
    <Link className="profileRow" href="/add-funds"><span aria-hidden="true">◇</span><b>Debit or credit card<small style={{display:"block",fontWeight:400,color:"#6e6e73",marginTop:4}}>Secure card checkout</small></b><i aria-hidden="true">›</i></Link>
    <div className="profileRow" aria-disabled="true"><span aria-hidden="true">◉</span><b>Mobile money<small style={{display:"block",fontWeight:400,color:"#6e6e73",marginTop:4}}>Availability depends on country</small></b><i aria-hidden="true">›</i></div>
  </div></section>
  <section className="glassCard" style={{marginTop:26,display:"grid",gridTemplateColumns:"22px 1fr",gap:10,background:"#f7f8f9"}}><span aria-hidden="true">◇</span><div><b style={{fontSize:12}}>Secure checkout</b><p style={{fontSize:10,color:"#6e6e73",margin:"6px 0 0"}}>WickSpend doesn’t store your full card details.</p></div></section>
  <Link className="buyNumberCta" href="/add-funds" style={{display:"grid",placeItems:"center",marginTop:24}}>Fund wallet</Link>
  <p className="screenMessage">Minimum funding amount: ₦500 equivalent.</p>
</PageShell>}
