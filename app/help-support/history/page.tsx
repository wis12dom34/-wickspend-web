"use client";
import Link from "next/link";
import {PageShell} from "@/components/PageShell";

export default function SupportHistory(){
  return <PageShell title="Support history" subtitle="Reopen previous conversations and cases" back="/help-support">
    <label style={{height:48,borderRadius:24,background:"#fff",border:"1px solid #e0e0e5",display:"flex",alignItems:"center",padding:"0 20px",marginTop:20}}>
      <input disabled placeholder="Search by issue or ticket ID" aria-label="Search support history" style={{width:"100%",border:0,outline:0,background:"transparent",fontSize:10,color:"#6b6b73"}}/>
    </label>
    <section style={{marginTop:32}}>
      <h2 style={{fontSize:15,margin:"0 0 16px"}}>Recent cases</h2>
      <div style={{minHeight:220,border:"1px solid #e0e0e5",borderRadius:22,background:"#fff",display:"grid",placeItems:"center",padding:28,textAlign:"center"}}>
        <div><div style={{width:44,height:44,borderRadius:22,border:"1px solid #e0e0e5",display:"grid",placeItems:"center",margin:"0 auto 14px",fontSize:18}}>⌕</div><strong style={{display:"block",fontSize:14}}>No support cases yet</strong><p style={{fontSize:10,lineHeight:1.5,color:"#6b6b73",margin:"8px auto 0",maxWidth:240}}>Your support conversations will appear here when ticket history is available from WickSpend.</p></div>
      </div>
    </section>
    <Link href="/support" style={{height:54,borderRadius:27,background:"#050505",color:"#fff",display:"grid",placeItems:"center",fontSize:13,fontWeight:600,marginTop:70}}>Start a new support chat</Link>
    <Link href="/help-support" style={{height:42,borderRadius:21,background:"#fff",border:"1px solid #e0e0e5",color:"#050505",display:"grid",placeItems:"center",fontSize:11,fontWeight:600,marginTop:14}}>Back to Help &amp; Support</Link>
  </PageShell>
}
