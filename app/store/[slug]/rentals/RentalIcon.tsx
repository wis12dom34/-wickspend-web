"use client";

import { useEffect, useMemo, useState } from "react";
import styles from "./rentals.module.css";

const initials: Record<string,string> = {
  whatsapp:"WA", telegram:"TG", facebook:"f", instagram:"IG", tiktok:"TT",
  google:"G", gmail:"G", discord:"D", microsoft:"M", openai:"AI", twitter:"X", snapchat:"S",
};

export default function RentalIcon({code,name,url}:{code?:string;name?:string;url?:string}) {
  const key = `${code || ""} ${name || ""}`.toLowerCase();
  const match = Object.keys(initials).find(value => key.includes(value));
  const source = useMemo(() => {
    if (url) return url;
    if (!code && !name) return "";
    const params = new URLSearchParams();
    if (code) params.set("code", code.toLowerCase());
    if (name) params.set("name", name);
    return `/api/number-service-icon?${params.toString()}`;
  }, [code,name,url]);
  const [failed,setFailed] = useState(false);
  useEffect(()=>setFailed(false),[source]);

  if (source && !failed) {
    return <span className={styles.icon}><img className={styles.serviceImg} src={source} alt="" width="28" height="28" loading="lazy" decoding="async" onError={()=>setFailed(true)} /></span>;
  }
  return <span className={styles.icon} aria-hidden="true">{match ? initials[match] : String(name || code || "R").slice(0,2).toUpperCase()}</span>;
}
