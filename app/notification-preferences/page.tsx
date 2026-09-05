"use client";
import {useEffect,useState} from "react";
import {PageShell} from "@/components/PageShell";

const defaults=["OTP Received","Order Delivered","Wallet Funded","Refund Completed","Rental Expiring","Purchase Failed","Security Alerts"] as const;
const storageKey="wickspend.notificationPreferences";
type PreferenceState=Record<string,boolean>;
function allEnabled():PreferenceState{return Object.fromEntries(defaults.map(label=>[label,true]))}

export default function NotificationPreferences(){
  const[enabled,setEnabled]=useState<PreferenceState>(allEnabled),[ready,setReady]=useState(false);
  useEffect(()=>{try{const raw=localStorage.getItem(storageKey);if(raw){const saved=JSON.parse(raw);if(saved&&typeof saved==="object")setEnabled({...allEnabled(),...saved})}}catch{}finally{setReady(true)}},[]);
  function toggle(label:string){setEnabled(current=>{const next={...current,[label]:!current[label]};try{localStorage.setItem(storageKey,JSON.stringify(next))}catch{}return next})}
  return <PageShell title="Notification Preferences" subtitle="Choose which updates WickSpend should send." back="/notifications">
    <section style={{display:"grid",gap:14,marginTop:16}} aria-busy={!ready}>
      {defaults.map(label=>{
        const on=enabled[label];
        return <button key={label} type="button" onClick={()=>toggle(label)} aria-pressed={on} aria-label={`${label} notifications ${on?"on":"off"}`} disabled={!ready} style={{height:58,border:"1px solid rgba(0,0,0,.07)",borderRadius:20,background:"rgba(255,255,255,.95)",boxShadow:"0 6px 18px rgba(0,0,0,.08)",display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 16px",fontSize:10,fontWeight:600,cursor:ready?"pointer":"default",opacity:ready?1:.7}}>
          <span>{label}</span>
          <span aria-hidden="true" style={{width:48,height:30,borderRadius:15,background:on?"#000":"#d1d1d6",display:"flex",alignItems:"center",justifyContent:on?"flex-end":"flex-start",padding:4,transition:"background .18s ease"}}><span style={{width:22,height:22,borderRadius:11,background:"rgba(255,255,255,.98)",border:"1px solid rgba(0,0,0,.07)",display:"block",transition:"transform .18s ease"}}/></span>
        </button>
      })}
    </section>
    <p style={{fontSize:9,color:"#6e6e73",margin:"34px 0 0"}}>Telegram delivery is managed from Telegram Connection.</p>
    <p className="screenMessage">These choices are saved on this device. Server-side notification settings will be connected when a verified API is available.</p>
  </PageShell>
}
