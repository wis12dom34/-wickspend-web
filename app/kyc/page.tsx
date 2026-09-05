"use client";
import {PageShell} from "@/components/PageShell";

const steps=[
  ["1","Government-issued ID","Passport, driver’s licence or national ID"],
  ["2","A clear selfie","Used only to match your identity"],
  ["3","Basic information","Name, birthday and country"],
] as const;

export default function KycVerification(){return <PageShell title="KYC Verification" subtitle="Verify your identity securely" back="/profile">
  <section style={{height:170,borderRadius:26,background:"#050505",color:"#fff",boxShadow:"0 8px 20px rgba(0,0,0,.07)",display:"grid",placeItems:"center",textAlign:"center",padding:"20px",marginBottom:25}}>
    <div><div aria-hidden="true" style={{fontSize:34,lineHeight:1,marginBottom:10}}>◇</div><h2 style={{margin:0,fontSize:24}}>Not verified</h2><p style={{margin:"8px 0 12px",fontSize:11,color:"#bdbdc2"}}>Complete verification to protect your wallet</p><span style={{display:"inline-grid",placeItems:"center",height:24,minWidth:120,padding:"0 14px",borderRadius:12,background:"#242424",fontSize:10,fontWeight:600}}>Takes 3–5 minutes</span></div>
  </section>
  <h2 style={{fontSize:14,margin:"0 0 10px"}}>What you’ll need</h2>
  <section style={{border:"1px solid #e0e0e5",borderRadius:24,background:"#fff",boxShadow:"0 8px 20px rgba(0,0,0,.07)",padding:"10px 15px",marginBottom:22}}>
    {steps.map(([n,title,copy],i)=><div key={n} style={{display:"grid",gridTemplateColumns:"38px 1fr",gap:10,alignItems:"center",minHeight:58,borderBottom:i<steps.length-1?"1px solid #e0e0e5":"0"}}><span style={{width:34,height:34,borderRadius:17,background:"#050505",color:"#fff",display:"grid",placeItems:"center",fontSize:12,fontWeight:700}}>{n}</span><div><b style={{fontSize:12}}>{title}</b><p style={{fontSize:10,color:"#6b6b73",margin:"5px 0 0"}}>{copy}</p></div></div>)}
  </section>
  <section style={{height:78,border:"1px solid #e0e0e5",borderRadius:18,background:"#f7f8f9",display:"grid",gridTemplateColumns:"30px 1fr",alignItems:"center",padding:"0 19px",marginBottom:24}}><span aria-hidden="true" style={{fontSize:16}}>▣</span><div><b style={{fontSize:12}}>Your data stays protected</b><p style={{fontSize:10,color:"#6b6b73",margin:"5px 0 0"}}>Encrypted during transfer and storage.</p></div></section>
  <button type="button" disabled title="KYC provider integration is not available yet" style={{width:"100%",height:52,border:0,borderRadius:26,background:"#050505",color:"#fff",fontSize:13,fontWeight:600,opacity:1}}>Begin verification</button>
  <p style={{fontSize:10,color:"#6b6b73",textAlign:"center",margin:"14px 0 0"}}>Verification is completed through our secure provider.</p>
</PageShell>}
