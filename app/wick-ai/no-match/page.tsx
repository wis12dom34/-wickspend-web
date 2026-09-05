"use client";

import Link from "next/link";
import {BottomNav} from "@/components/BottomNav";
import s from "./no-match.module.css";

export default function WickAINoMatch(){return <main className={s.page}><header className={s.header}><Link href="/wick-ai" aria-label="Back">‹</Link><h1>Wick AI</h1></header><div className={s.prompt}>I need a service you do not have</div><div className={s.icon}>?</div><h2>No exact match found</h2><p className={s.subtitle}>I couldn’t find an exact product for that request.</p><section className={s.card}><b>Try one of these</b><p>• Change the country or service</p><p>• Browse Marketplace or Boostly</p></section><Link className={s.primary} href="/marketplace">Browse available services</Link><Link className={s.secondary} href="/wick-ai">Ask Wick AI something else</Link><BottomNav/></main>}
