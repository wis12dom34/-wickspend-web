"use client";

import { useState } from "react";
import styles from "./rentals.module.css";

const initials: Record<string,string> = { whatsapp:"WA", wa:"WA", telegram:"TG", facebook:"f", instagram:"IG", tiktok:"TT", google:"G", discord:"D", microsoft:"M", openai:"AI" };

export default function RentalIcon({code,name,url}:{code?:string;name?:string;url?:string}) {
  const key = `${code || ""} ${name || ""}`.toLowerCase();
  const match = Object.keys(initials).find(value => key.includes(value));
  const [failed,setFailed] = useState(false);
  const source = url || (code ? `/api/number-service-icon?code=${encodeURIComponent(code.toLowerCase())}` : "");
  if (source && !failed) return <span className={styles.icon}><img className={styles.serviceImg} src={source} alt="" width="24" height="24" onError={()=>setFailed(true)} /></span>;
  return <span className={styles.icon} aria-hidden="true">{match ? initials[match] : String(name || code || "R").slice(0,2).toUpperCase()}</span>;
}
