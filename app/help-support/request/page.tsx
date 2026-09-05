"use client";
import {useRef,useState} from "react";
import {PageShell} from "@/components/PageShell";

const issueTypes=["Payment Issue","Order Problem","Number Issue","OTP Issue","Marketplace Purchase","Account Issue","Other"];

export default function SupportRequest(){
  const[issue,setIssue]=useState("Payment Issue"),[description,setDescription]=useState(""),[orderRef,setOrderRef]=useState(""),[attachmentName,setAttachmentName]=useState(""),[message,setMessage]=useState("");
  const fileRef=useRef<HTMLInputElement>(null);
  function pickFile(){fileRef.current?.click()}
  function submit(){
    if(!description.trim()){setMessage("Describe what happened before submitting.");return}
    setMessage("Support ticket submission will be enabled when a verified support-request API is available. You can use AI Support now for immediate help.")
  }
  return <PageShell title="Support Request" subtitle="Tell us what happened and attach anything that helps us verify it." back="/help-support">
    <section style={{marginTop:18}}>
      <h2 style={{fontSize:10,margin:"0 0 10px"}}>Issue Type</h2>
      <div style={{display:"flex",flexWrap:"wrap",gap:8}}>{issueTypes.map(type=><button key={type} type="button" aria-pressed={issue===type} onClick={()=>{setIssue(type);setMessage("")}} style={{height:38,borderRadius:19,border:`1px solid ${issue===type?"#000":"rgba(0,0,0,.07)"}`,background:"rgba(255,255,255,.95)",padding:"0 15px",fontSize:9,fontWeight:600}}>{type}</button>)}</div>
    </section>

    <section style={{marginTop:20}}>
      <label style={{display:"grid",gap:10}}><span style={{fontSize:10,fontWeight:600}}>Description</span><textarea value={description} onChange={e=>{setDescription(e.target.value);setMessage("")}} placeholder="Describe what you expected and what happened…" rows={5} style={{width:"100%",minHeight:104,resize:"vertical",border:"1px solid rgba(0,0,0,.07)",borderRadius:20,background:"rgba(255,255,255,.95)",boxShadow:"0 6px 18px rgba(0,0,0,.08)",padding:"18px 15px",outline:0,fontSize:9,fontFamily:"inherit"}}/></label>
    </section>

    <section style={{marginTop:18}}>
      <label style={{display:"grid",gap:10}}><span style={{fontSize:10,fontWeight:600}}>Order Reference</span><input value={orderRef} onChange={e=>setOrderRef(e.target.value)} placeholder="#WS-10482" autoCapitalize="characters" style={{width:"100%",height:48,border:"1px solid rgba(0,0,0,.07)",borderRadius:20,background:"rgba(255,255,255,.95)",boxShadow:"0 6px 18px rgba(0,0,0,.08)",padding:"0 15px",outline:0,fontSize:10}}/></label>
    </section>

    <section style={{marginTop:20,background:"#f9f9fa",border:"1px solid rgba(0,0,0,.07)",borderRadius:22,boxShadow:"0 6px 18px rgba(0,0,0,.08)",padding:"16px"}}>
      <h3 style={{fontSize:11,margin:"0 0 8px"}}>Visual evidence recommended</h3>
      <p style={{fontSize:9,lineHeight:1.4,color:"#6e6e73",margin:"0 0 14px"}}>For login or product-access problems, please attach a screenshot or screen recording before troubleshooting.</p>
      <input ref={fileRef} type="file" accept="image/*,video/*" hidden onChange={e=>setAttachmentName(e.target.files?.[0]?.name||"")}/>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1.15fr",gap:10}}><button type="button" onClick={pickFile} style={{height:34,borderRadius:17,border:"1px solid rgba(0,0,0,.07)",background:"rgba(255,255,255,.95)",boxShadow:"0 6px 18px rgba(0,0,0,.08)",fontSize:11,fontWeight:600}}>Add Screenshot</button><button type="button" onClick={pickFile} style={{height:34,borderRadius:17,border:"1px solid rgba(0,0,0,.07)",background:"rgba(255,255,255,.95)",boxShadow:"0 6px 18px rgba(0,0,0,.08)",fontSize:11,fontWeight:600}}>Add File / Recording</button></div>
      {attachmentName&&<p style={{fontSize:8,color:"#6e6e73",margin:"10px 0 0",wordBreak:"break-all"}}>Selected: {attachmentName}</p>}
    </section>

    <button type="button" onClick={submit} style={{width:"100%",height:46,border:0,borderRadius:23,background:"#000",color:"#fff",fontSize:11,fontWeight:600,marginTop:30,boxShadow:"0 5px 12px rgba(0,0,0,.15)"}}>Submit Request</button>
    <p style={{fontSize:8,color:"#6e6e73",textAlign:"center",margin:"14px 0 0"}}>Supported attachments depend on your device and platform.</p>
    {message&&<p className="screenMessage" role="status">{message}</p>}
  </PageShell>
}
