"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { getSessionToken } from "@/lib/session";
import styles from "./staff-admin.module.css";

type StaffRow={user_id:number|string;name:string;email:string;role:string;active:boolean;permissions:string[];created_at:string;updated_at:string;revoked_at?:string|null};
type AuditRow={id:number|string;actor:string;actor_role:string;action:string;entity_type:string;entity_id?:string|null;created_at:string};

export default function MarketplaceAssistantsPage(){
  const [staff,setStaff]=useState<StaffRow[]>([]);
  const [audit,setAudit]=useState<AuditRow[]>([]);
  const [name,setName]=useState("");
  const [email,setEmail]=useState("");
  const [message,setMessage]=useState("Loading staff…");
  const [busy,setBusy]=useState("");
  function adminSession(){const value=getSessionToken();if(!value)throw new Error("Admin sign-in required.");return value}
  async function load(){try{const current=adminSession();const [staffData,auditData]:any[]=await Promise.all([api.admin.staffList(current),api.admin.staffAudit(current,80)]);setStaff(Array.isArray(staffData?.staff)?staffData.staff:[]);setAudit(Array.isArray(auditData?.audit)?auditData.audit:[]);setMessage("")}catch(error){setMessage(error instanceof Error?error.message:"Unable to load staff")}}
  useEffect(()=>{void load()},[]);

  async function create(e:FormEvent){e.preventDefault();if(busy)return;const mail=email.trim().toLowerCase();if(!name.trim()||!mail)return setMessage("Name and email are required.");setBusy("create");setMessage("");try{await api.admin.staffMutate(adminSession(),{action:"create",name:name.trim(),email:mail,active:true});setName("");setEmail("");setMessage("Marketplace Assistant access created. Staff can sign in using email verification.");await load()}catch(error){setMessage(error instanceof Error?error.message:"Unable to create assistant")}finally{setBusy("")}}

  async function setActive(row:StaffRow,active:boolean){setBusy(String(row.user_id));setMessage("");try{await api.admin.staffMutate(adminSession(),{action:"set_active",user_id:row.user_id,active});setMessage(active?"Assistant access activated.":"Assistant access deactivated.");await load()}catch(error){setMessage(error instanceof Error?error.message:"Unable to update assistant")}finally{setBusy("")}}
  async function resetAccess(row:StaffRow){setBusy(`reset-${row.user_id}`);setMessage("");try{const current=adminSession();await api.admin.staffMutate(current,{action:"revoke",user_id:row.user_id,active:false});await api.admin.staffMutate(current,{action:"set_active",user_id:row.user_id,active:true});setMessage("Assistant access reset. Existing sessions were revoked; they can sign in again with a fresh email code.");await load()}catch(error){setMessage(error instanceof Error?error.message:"Unable to reset access")}finally{setBusy("")}}

  return <main className={styles.page}><div className={styles.shell}>
    <header className={styles.top}><Link href="/admin/menu" className={styles.back} aria-label="Back">‹</Link><div><h1>Marketplace Assistants</h1><p>Create and control Marketplace-only staff access.</p></div></header>
    <section className={styles.panel}><h2>Add assistant</h2><form className={styles.form} onSubmit={create}><label>Name<input value={name} onChange={e=>setName(e.target.value)} placeholder="Assistant name"/></label><label>Email<input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="assistant@example.com"/></label><button type="submit" disabled={busy==="create"}>{busy==="create"?"Creating…":"Create Marketplace Assistant"}</button></form><p className={styles.help}>New assistants use the existing WickSpend email verification login. The role is fixed to Marketplace Assistant.</p></section>
    {message&&<p className={styles.message}>{message}</p>}
    <section className={styles.panel}><div className={styles.sectionHead}><div><h2>Staff</h2><p>{staff.length} Marketplace assistant{staff.length===1?"":"s"}</p></div><button className={styles.lightButton} onClick={()=>void load()}>Refresh</button></div>
      <div className={styles.list}>{staff.map(row=><article className={styles.staffCard} key={String(row.user_id)}><div><strong>{row.name||row.email}</strong><span>{row.email}</span><small>Marketplace Assistant · {row.active?"Active":"Inactive"}</small></div><div className={styles.actions}><button className={styles.lightButton} disabled={busy===String(row.user_id)} onClick={()=>void setActive(row,!row.active)}>{row.active?"Deactivate":"Activate"}</button><button className={styles.lightButton} disabled={busy===`reset-${row.user_id}`} onClick={()=>void resetAccess(row)}>{busy===`reset-${row.user_id}`?"Resetting…":"Reset Access"}</button></div></article>)}</div>
    </section>
    <section className={styles.panel}><div className={styles.sectionHead}><div><h2>Audit log</h2><p>Owner-only record of staff and Marketplace changes.</p></div></div><div className={styles.audit}>{audit.map(row=><div className={styles.auditRow} key={String(row.id)}><div><strong>{row.action.replaceAll("."," ")}</strong><span>{row.actor} · {row.entity_type}{row.entity_id?` #${row.entity_id}`:""}</span></div><time>{new Date(row.created_at).toLocaleString()}</time></div>)}{!audit.length&&<p className={styles.help}>No staff audit events yet.</p>}</div></section>
  </div></main>;
}
