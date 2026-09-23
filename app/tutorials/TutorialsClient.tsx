"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { BottomNav } from "@/components/BottomNav";
import { tutorialsApi } from "@/lib/tutorial-api";
import { formatTutorialDate, Tutorial, tutorialDate, tutorialSlug, tutorialsFrom } from "@/lib/tutorials";
import styles from "./tutorials.module.css";

function SearchIcon(){return <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg>}
function ProfileIcon(){return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="3.5"/><path d="M5.5 20c.7-4 3-6 6.5-6s5.8 2 6.5 6"/></svg>}
function PlayIcon(){return <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="m9 6 9 6-9 6V6Z"/></svg>}

export default function TutorialsClient({initialTutorials=[]}:{initialTutorials?:Tutorial[]}){
  const [tutorials,setTutorials]=useState<Tutorial[]>(initialTutorials);
  const [state,setState]=useState<"loading"|"ready"|"error">("ready");
  const [query,setQuery]=useState("");
  const [menuId,setMenuId]=useState<string|null>(null);
  const [toast,setToast]=useState("");

  async function load(){
    setState("loading");
    try{const result=await tutorialsApi.list();setTutorials(tutorialsFrom(result));setState("ready")}catch{setState("error")}
  }
  useEffect(()=>{if(!initialTutorials.length)void load()},[initialTutorials.length]);
  useEffect(()=>{if(!toast)return;const id=window.setTimeout(()=>setToast(""),1800);return()=>window.clearTimeout(id)},[toast]);

  const filtered=useMemo(()=>{const q=query.trim().toLowerCase();if(!q)return tutorials;return tutorials.filter(t=>`${t.title} ${t.description||""}`.toLowerCase().includes(q))},[query,tutorials]);
  async function copyLink(t:Tutorial){const url=`${window.location.origin}/tutorials/${tutorialSlug(t)}`;try{await navigator.clipboard.writeText(url);setToast("Tutorial link copied")}catch{setToast("Couldn’t copy the link")}setMenuId(null)}
  async function share(t:Tutorial){const url=`${window.location.origin}/tutorials/${tutorialSlug(t)}`;try{if(navigator.share)await navigator.share({title:t.title,text:t.description||undefined,url});else await copyLink(t)}catch{}finally{setMenuId(null)}}

  return <main className={styles.screen}>
    <header className={styles.header}><h1>Tutorials</h1><Link className={styles.profile} href="/profile" aria-label="Profile"><ProfileIcon/></Link></header>
    <label className={styles.search}><SearchIcon/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search tutorials" aria-label="Search tutorials"/></label>
    {state==="loading"?<div className={styles.message}>Loading tutorials…</div>:state==="error"?<div className={styles.message}><div><p>We couldn’t load tutorials right now.</p><button className={styles.retry} onClick={()=>void load()}>Try again</button></div></div>:filtered.length===0?<div className={styles.message}><div><span className={styles.emptyIcon}><PlayIcon/></span><b>{query?"No tutorials match your search":"No tutorials published yet"}</b><p>{query?"Try another search term.":"Published WickSpend guides will appear here."}</p></div></div>:<section className={styles.feed} aria-label="Tutorial videos">{filtered.map(t=><article className={styles.item} key={String(t.id)}><Link href={`/tutorials/${tutorialSlug(t)}`} className={styles.thumbLink}><div className={styles.thumb}>{t.thumbnail_url?<img src={t.thumbnail_url} alt="" loading="lazy" decoding="async"/>:<span className={styles.placeholder}><PlayIcon/></span>}{t.duration&&<span className={styles.duration}>{t.duration}</span>}</div></Link><div className={styles.meta}><Link href={`/tutorials/${tutorialSlug(t)}`} className={styles.copy}><h2>{t.title}</h2>{t.description&&<p>{t.description}</p>}<small className={styles.date}>{formatTutorialDate(tutorialDate(t))}</small></Link><div className={styles.menuWrap}><button className={styles.menuButton} type="button" aria-label={`Options for ${t.title}`} aria-expanded={menuId===String(t.id)} onClick={()=>setMenuId(menuId===String(t.id)?null:String(t.id))}>⋮</button>{menuId===String(t.id)&&<div className={styles.menu}><button type="button" onClick={()=>void share(t)}>Share tutorial</button><button type="button" onClick={()=>void copyLink(t)}>Copy link</button></div>}</div></div></article>)}</section>}
    {toast&&<div className={styles.toast} role="status">{toast}</div>}
    <BottomNav/>
  </main>;
}
