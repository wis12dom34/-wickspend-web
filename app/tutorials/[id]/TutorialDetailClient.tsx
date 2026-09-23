"use client";

import Link from "next/link";
import { useState } from "react";
import { BottomNav } from "@/components/BottomNav";
import { formatTutorialDate, Tutorial, tutorialDate } from "@/lib/tutorials";
import styles from "../tutorials.module.css";

function ProfileIcon(){return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="3.5"/><path d="M5.5 20c.7-4 3-6 6.5-6s5.8 2 6.5 6"/></svg>}

export default function TutorialDetailClient({tutorial}:{tutorial:Tutorial}){
  const [playback,setPlayback]=useState<"idle"|"loading"|"ready"|"error">("idle");
  const [toast,setToast]=useState("");
  async function copy(){try{await navigator.clipboard.writeText(window.location.href);setToast("Tutorial link copied")}catch{setToast("Couldn’t copy the link")}window.setTimeout(()=>setToast(""),1800)}
  async function share(){try{if(navigator.share)await navigator.share({title:tutorial.title,text:tutorial.description||undefined,url:window.location.href});else await copy()}catch{}}
  return <main className={styles.screen}>
    <header className={styles.detailHeader}><Link className={styles.back} href="/tutorials" aria-label="Back to tutorials">‹</Link><span className={styles.detailTitle}>Tutorials</span><Link className={styles.profile} href="/profile" aria-label="Profile"><ProfileIcon/></Link></header>
    <div className={styles.player}><video controls playsInline preload="metadata" poster={tutorial.thumbnail_url||undefined} onLoadStart={()=>setPlayback("loading")} onLoadedMetadata={()=>setPlayback("ready")} onCanPlay={()=>setPlayback("ready")} onWaiting={()=>setPlayback("loading")} onPlaying={()=>setPlayback("ready")} onError={()=>setPlayback("error")}><source src={tutorial.video_url}/></video>{playback==="loading"&&<div className={styles.playerStatus}>Loading video…</div>}{playback==="error"&&<div className={styles.playerStatus}>Video unavailable. Please try again.</div>}</div>
    <section className={styles.detailCopy}><h1>{tutorial.title}</h1><div className={styles.detailDate}>{formatTutorialDate(tutorialDate(tutorial))}</div>{tutorial.description&&<p>{tutorial.description}</p>}<div className={styles.detailActions}><button type="button" onClick={()=>void share()}>Share</button><button type="button" onClick={()=>void copy()}>Copy link</button></div></section>
    <div className={styles.bottomSpace}/>{toast&&<div className={styles.toast} role="status">{toast}</div>}<BottomNav/>
  </main>;
}
