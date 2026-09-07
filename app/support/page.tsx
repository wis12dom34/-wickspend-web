"use client";

import {PageShell} from "@/components/PageShell";
import {openSmartSupport} from "@/components/SmartSupport";

export default function Support(){
 return <PageShell title="Smart Support" subtitle="WickSpend support, available throughout your account.">
  <section className="supportIntro"><div className="supportAvatar">W</div><div><h2>WickSpend Support</h2><p>Get help with payments, orders, numbers, Marketplace, Boostly, Temp Mail, wallet and account issues.</p></div></section>
  <button type="button" className="homePrimaryButton" style={{width:"100%",height:48,borderRadius:20,marginTop:18}} onClick={()=>openSmartSupport()}>Open Smart Support</button>
  <p className="screenMessage" style={{marginTop:14}}>Your authenticated support conversation is restored when you reopen the messenger.</p>
 </PageShell>
}
