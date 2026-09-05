"use client";

import Link from "next/link";
import {BottomNav} from "@/components/BottomNav";
import s from "./unavailable.module.css";

export default function WickAIUnavailable(){return <main className={s.page}><header className={s.header}><Link href="/wick-ai" aria-label="Back">‹</Link><h1>Wick AI</h1></header><div className={s.icon}>!</div><h2>Temporarily unavailable</h2><p className={s.subtitle}>Wick AI can’t complete this request right now.</p><section className={s.card}><b>What you can do</b><p>Try again in a moment or continue manually.</p><strong>Your wallet has not been charged.</strong><p>Any unfinished checkout remains unchanged.</p></section><Link className={s.primary} href="/wick-ai">Try again</Link><Link className={s.secondary} href="/marketplace">Browse manually</Link><Link className={s.help} href="/help-support">Need help? Open Support from Profile.</Link><BottomNav/></main>}
