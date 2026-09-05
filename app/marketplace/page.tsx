"use client";

import Link from "next/link";
import { BottomNav } from "@/components/BottomNav";
import styles from "./marketplace.module.css";

export default function Marketplace() {
  return <main className={`${styles.screen} ${styles.stateScreen}`}>
    <header className={styles.topHeader}>
      <div>
        <h1>Marketplace</h1>
        <p>Premium digital products, one clean checkout.</p>
      </div>
      <Link href="/orders" className={styles.ordersButton}>Orders</Link>
    </header>

    <section className={styles.stockCard}>
      <span>LIVE CATALOG</span>
      <h2>Marketplace catalog unavailable</h2>
      <b>Live inventory required</b>
      <strong>—</strong>
    </section>

    <section className={styles.detailCopy}>
      <h3>Live pricing only</h3>
      <p>Marketplace products, prices and stock will appear here only after the verified live Marketplace catalog route is connected.</p>
    </section>

    <section className={styles.detailCopy}>
      <h3>No placeholder products</h3>
      <p>WickSpend will not display hard-coded Marketplace prices or inventory as if they were live.</p>
    </section>

    <Link href="/orders" className={styles.notifyButton}>View Orders</Link>
    <p className={styles.stateHint}>Existing orders remain available from Orders.</p>

    <BottomNav />
  </main>;
}
