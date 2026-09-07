"use client";
import Link from "next/link";
import {PageShell} from "@/components/PageShell";
import {openSmartSupport} from "@/components/SmartSupport";

export default function SupportHistory(){
  return <PageShell title="Support history" subtitle="Continue your existing WickSpend support conversation" back="/help-support">
    <section style={{marginTop:24,minHeight:220,border:"1px solid rgba(0,0,0,.07)",borderRadius:24,background:"rgba(255,255,255,.95)",boxShadow:"0 6px 18px rgba(0,0,0,.08)",display:"grid",placeItems:"center",padding:28,textAlign:"center"}}>
      <div><div style={{width:46,height:46,borderRadius:18,background:"#EEF5FF",color:"#0866F5",display:"grid",placeItems:"center",margin:"0 auto 14px",fontSize:18}}>✦</div><strong style={{display:"block",fontSize:14}}>Your Smart Support conversation is persistent</strong><p style={{fontSize:10,lineHeight:1.5,color:"#6b6b73",margin:"8px auto 0",maxWidth:260}}>Open Smart Support to restore your authenticated conversation history and continue where you stopped.</p></div>
    </section>
    <button type="button" onClick={()=>openSmartSupport()} style={{width:"100%",height:54,border:0,borderRadius:27,background:"#0866F5",color:"#fff",display:"grid",placeItems:"center",fontSize:13,fontWeight:600,marginTop:30}}>Open Smart Support</button>
    <Link href="/help-support" style={{height:42,borderRadius:21,background:"#fff",border:"1px solid #e0e0e5",color:"#050505",display:"grid",placeItems:"center",fontSize:11,fontWeight:600,marginTop:14}}>Back to Help &amp; Support</Link>
  </PageShell>
}
