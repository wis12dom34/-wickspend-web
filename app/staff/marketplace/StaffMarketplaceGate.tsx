"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { ApiError, api } from "@/lib/api";
import { clearSessionToken, getSessionToken } from "@/lib/session";
import styles from "./staff-marketplace.module.css";

type State="checking"|"allowed"|"denied"|"error";

export default function StaffMarketplaceGate({children}:{children:ReactNode}){
  const [state,setState]=useState<State>("checking"),[name,setName]=useState("Marketplace Assistant");
  useEffect(()=>{let alive=true;const verify=async()=>{const token=getSessionToken();if(!token){window.location.replace("/staff/login");return}try{await api.auth.session(token);const access:any=await api.staff.marketplaceAccess(token);if(!alive)return;if(access?.authorized===true&&(access?.role==="marketplace_assistant"||access?.role==="owner")){setName(access?.user?.full_name||access?.user?.email||"Marketplace Assistant");setState("allowed")}else setState("denied")}catch(error){if(!alive)return;if(error instanceof ApiError&&error.status===401){clearSessionToken();window.location.replace("/staff/login");return}if(error instanceof ApiError&&error.status===403)setState("denied");else setState("error")}};void verify();return()=>{alive=false}},[]);

  async function logout(){const token=getSessionToken();try{if(token)await api.auth.logout(token)}catch{}clearSessionToken();window.location.replace("/staff/login")}

  if(state==="checking")return <main className={styles.gate}><div className={styles.gateCard}><span className={styles.spinner}/><strong>Checking Marketplace access…</strong></div></main>;
  if(state==="denied")return <main className={styles.gate}><div className={styles.gateCard}><strong>403 · Access forbidden</strong><p>This account is not an active Marketplace Assistant.</p><Link href="/staff/login">Staff sign in</Link></div></main>;
  if(state==="error")return <main className={styles.gate}><div className={styles.gateCard}><strong>Staff access unavailable</strong><p>Marketplace permissions could not be verified.</p><button onClick={()=>window.location.reload()}>Try again</button></div></main>;
  return <div className={styles.frame}><header className={styles.header}><div><strong>WickSpend Staff</strong><span>{name}</span></div><nav><Link href="/staff/marketplace">Marketplace</Link><Link href="/staff/marketplace/add">Add Product</Link><Link href="/staff/marketplace/products">Products</Link><button type="button" onClick={()=>void logout()}>Logout</button></nav></header><div className={styles.body}>{children}</div></div>;
}
