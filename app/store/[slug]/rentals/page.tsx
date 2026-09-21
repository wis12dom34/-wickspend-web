"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import RentalIcon from "./RentalIcon";
import styles from "./rentals.module.css";
import { rentalExpiry, rentalReference, remainingLabel, StoreRental, storeRentalRequest, storeToken } from "@/lib/store-rentals";

type Filter = "active"|"expired"|"failed";
function stateOf(item:StoreRental){return String(item.status||"").toLowerCase()}

export default function StoreRentalsPage(){
  const {slug:rawSlug}=useParams<{slug:string}>(); const slug=String(rawSlug||"").toLowerCase(); const router=useRouter();
  const[items,setItems]=useState<StoreRental[]>([]),[loading,setLoading]=useState(true),[message,setMessage]=useState(""),[filter,setFilter]=useState<Filter>("active"),[now,setNow]=useState(Date.now());
  const load=useCallback(async()=>{if(!storeToken(slug)){setLoading(false);setMessage("Sign in to view your rentals.");return}setLoading(true);setMessage("");try{const result:any=await storeRentalRequest(slug,"rentals/orders");setItems(Array.isArray(result.items)?result.items:Array.isArray(result.rentals)?result.rentals:[])}catch(error){setMessage(error instanceof Error?error.message:"Unable to load rentals.")}finally{setLoading(false)}},[slug]);
  useEffect(()=>{load()},[load]); useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(timer)},[]);
  const visible=useMemo(()=>items.filter(item=>{const state=stateOf(item),expired=state.includes("expired")||Date.parse(rentalExpiry(item))<=now,failed=/failed|refund|cancel/.test(state);return filter==="active"?!expired&&!failed:filter==="expired"?expired&&!failed:failed}),[items,filter,now]);
  return <main className={styles.page}><div className={styles.shell}><header className={styles.topbar}><button className={styles.back} onClick={()=>router.push(`/store/${slug}`)} aria-label="Back">‹</button><div><h1>My Rentals</h1><p>Active numbers and rental history</p></div><button className={styles.ghost} onClick={load}>Refresh</button></header><div className={styles.navLinks}><Link href={`/store/${slug}`}>Store home</Link><Link href={`/store/${slug}/rent-number`}>Rent Number</Link></div>{message&&<div className={`${styles.notice} ${styles.error}`}>{message}</div>}<div className={styles.tabs}>{(["active","expired","failed"] as Filter[]).map(value=><button key={value} className={value===filter?styles.secondary:styles.ghost} onClick={()=>setFilter(value)}>{value==="failed"?"Failed / Refunded":value[0].toUpperCase()+value.slice(1)}</button>)}</div>{loading?<><div className={styles.skeleton}/><div className={styles.skeleton}/></>:visible.length?visible.map(item=>{const ref=rentalReference(item),ended=filter!=="active";return <article className={styles.rentalCard} key={ref}><RentalIcon code={item.service_code} name={item.service_name} url={item.icon_url}/><div className={styles.rentalInfo}><b>{item.service_name||item.service_code||"Rental"} · {item.country_name||item.country_code||""}</b><span>{item.phone_number||"Number processing"}</span><small>{ended?new Date(item.created_at||Date.now()).toLocaleString():`${remainingLabel(rentalExpiry(item),now)} remaining`}</small></div><div><span className={`${styles.status} ${ended?styles.ended:""}`}>{item.status||filter}</span><button className={styles.secondary} onClick={()=>router.push(`/store/${slug}/rentals/${encodeURIComponent(ref)}`)}>View SMS</button></div></article>}):<div className={styles.empty}>{storeToken(slug)?`No ${filter} rentals found.`:<><p>Sign in from the store home page first.</p><Link href={`/store/${slug}`}>Go to store</Link></>}</div>}</div></main>
}
