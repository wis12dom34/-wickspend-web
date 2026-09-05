"use client";
import Link from "next/link";
import {useMemo,useState} from "react";
import {PageShell} from "@/components/PageShell";

const categories=["Numbers","OTP","Rentals","Marketplace","Wallet","Payments","Account"];
const faqs=[
  ["How do I buy a virtual number?","Choose Buy Number, select a country and service, review the live price, then complete the purchase from your wallet."],
  ["What happens if my OTP does not arrive?","Keep the number active while WickSpend checks for SMS. If the provider allows cancellation or refund, the backend policy controls the result."],
  ["How do refunds work?","Eligible refunds are returned by the backend after a failed or approved cancellation. Your wallet and order history will reflect the final status."],
  ["How do marketplace deliveries work?","Marketplace checkout remains unavailable until the provider purchase contract is verified, so WickSpend does not guess delivery or order fields."],
  ["Why do I need a screenshot for login issues?","A screenshot or screen recording helps us see the exact error before suggesting a fix, so we do not guess."]
] as const;

export default function HelpSupport(){
  const[query,setQuery]=useState(""),[open,setOpen]=useState<number>(4);
  const normalized=query.trim().toLowerCase();
  const visible=useMemo(()=>normalized?faqs.filter(([q,a])=>`${q} ${a}`.toLowerCase().includes(normalized)):faqs,[normalized]);
  return <PageShell title="Help & Support" subtitle="Find answers or send us the details we need to help." back="/settings">
    <section style={{marginTop:8}}>
      <h2 style={{fontSize:12,margin:"0 0 10px"}}>How can we help?</h2>
      <label style={{height:48,borderRadius:22,background:"#f9f9fa",border:"1px solid rgba(0,0,0,.07)",display:"flex",alignItems:"center",padding:"0 20px"}}>
        <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search help articles and FAQs" aria-label="Search help articles and FAQs" style={{width:"100%",border:0,outline:0,background:"transparent",fontSize:10,color:"#111"}}/>
      </label>
    </section>

    <section style={{marginTop:26}}>
      <h2 style={{fontSize:13,margin:"0 0 12px"}}>Categories</h2>
      <div style={{display:"flex",flexWrap:"wrap",gap:8}}>{categories.map(category=><button key={category} type="button" onClick={()=>setQuery(category)} style={{height:38,borderRadius:19,border:"1px solid rgba(0,0,0,.07)",background:"rgba(255,255,255,.95)",padding:"0 18px",fontSize:9,fontWeight:600}}>{category}</button>)}</div>
    </section>

    <Link href="/support" style={{height:56,borderRadius:22,background:"#000",color:"#fff",display:"grid",placeItems:"center",fontSize:11,fontWeight:600,marginTop:20,boxShadow:"0 5px 12px rgba(0,0,0,.15)"}}>Chat with AI Support</Link>

    <section style={{marginTop:18}}>
      <h2 style={{fontSize:13,margin:"0 0 14px"}}>Frequently Asked Questions</h2>
      <div style={{display:"grid",gap:10}}>{visible.length?visible.map(([question,answer],index)=>{
        const original=faqs.findIndex(([q])=>q===question),expanded=open===original;
        return <article key={question} style={{border:"1px solid rgba(0,0,0,.07)",borderRadius:20,background:expanded?"#f9f9fa":"rgba(255,255,255,.95)",boxShadow:"0 6px 18px rgba(0,0,0,.08)",overflow:"hidden"}}>
          <button type="button" aria-expanded={expanded} onClick={()=>setOpen(expanded?-1:original)} style={{width:"100%",minHeight:54,border:0,background:"transparent",display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 15px",textAlign:"left",fontSize:10,fontWeight:600}}><span>{question}</span><span aria-hidden="true">{expanded?"⌃":"⌄"}</span></button>
          {expanded&&<p style={{fontSize:9,lineHeight:1.45,color:"#6e6e73",margin:"-2px 15px 16px"}}>{answer}</p>}
        </article>
      }):<div className="screenMessage" role="status">No help articles match “{query.trim()}”.</div>}</div>
    </section>

    <Link href="/help-support/request" style={{height:44,borderRadius:22,background:"#000",color:"#fff",display:"grid",placeItems:"center",fontSize:11,fontWeight:600,marginTop:22,boxShadow:"0 5px 12px rgba(0,0,0,.15)"}}>Submit Support Request</Link>
  </PageShell>
}
