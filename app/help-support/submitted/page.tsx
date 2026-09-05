"use client";

import Link from "next/link";
import {useSearchParams} from "next/navigation";
import {PageShell} from "@/components/PageShell";

export default function SupportRequestSubmitted(){
  const params=useSearchParams();
  const reference=(params.get("reference")||"").trim();
  return <PageShell title="Request Submitted" subtitle="Your support request is now in the queue." back="/help-support">
    <section style={{marginTop:54,border:"1px solid rgba(0,0,0,.07)",borderRadius:28,background:"rgba(255,255,255,.95)",boxShadow:"0 6px 18px rgba(0,0,0,.08)",padding:"32px 36px 28px",textAlign:"center"}}>
      <div aria-hidden="true" style={{width:100,height:100,borderRadius:50,background:"#050505",color:"#fff",display:"grid",placeItems:"center",fontSize:31,fontWeight:700,margin:"0 auto 22px",boxShadow:"0 6px 18px rgba(0,0,0,.08)"}}>✓</div>
      <h2 style={{fontSize:20,margin:"0 0 22px"}}>Request Submitted</h2>
      <div style={{display:"grid",gap:20,textAlign:"left"}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",alignItems:"center"}}><span style={{fontSize:9,color:"#6e6e73"}}>Reference</span><strong style={{fontSize:11,textAlign:"right"}}>{reference||"Not assigned"}</strong></div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",alignItems:"center"}}><span style={{fontSize:9,color:"#6e6e73"}}>Status</span><strong style={{fontSize:11,textAlign:"right"}}>Submitted</strong></div>
        <div style={{display:"grid",gap:8}}><span style={{fontSize:9,color:"#6e6e73"}}>Next step</span><p style={{fontSize:9,color:"#6e6e73",margin:0}}>We’ll review the details and attachments provided.</p></div>
      </div>
    </section>

    {reference?<Link href={`/help-support/ticket?reference=${encodeURIComponent(reference)}`} style={{width:"calc(100% - 72px)",height:44,borderRadius:22,background:"#050505",color:"#fff",display:"grid",placeItems:"center",fontSize:11,fontWeight:600,margin:"26px auto 0",boxShadow:"0 5px 12px rgba(0,0,0,.15)"}}>View Request</Link>:<button type="button" disabled title="A ticket reference is required to view a submitted request" style={{width:"calc(100% - 72px)",height:44,border:0,borderRadius:22,background:"#050505",color:"#fff",fontSize:11,fontWeight:600,margin:"26px auto 0",boxShadow:"0 5px 12px rgba(0,0,0,.15)",opacity:.5,display:"block"}}>View Request</button>}
    <Link href="/help-support" style={{display:"block",textAlign:"center",marginTop:18,fontSize:10,fontWeight:600}}>Back to Support</Link>
  </PageShell>
}
