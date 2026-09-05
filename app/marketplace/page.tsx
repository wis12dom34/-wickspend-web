"use client";

import { FormEvent, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BottomNav } from "@/components/BottomNav";
import styles from "./marketplace.module.css";

type Product = {
  id: string;
  category: "9PROXY (IPS)" | "Premium Accounts";
  icon: string;
  name: string;
  price: string;
  stock: number;
};

const products: Product[] = [
  { id: "9proxy-10", category: "9PROXY (IPS)", icon: "9", name: "9PROXY 10 IP | Unlimited Residential", price: "₦4,000.00", stock: 126 },
  { id: "9proxy-25", category: "9PROXY (IPS)", icon: "9", name: "9PROXY 25 IP | Unlimited Residential", price: "₦8,000.00", stock: 53 },
  { id: "9proxy-100", category: "9PROXY (IPS)", icon: "9", name: "9PROXY 100 IP | Unlimited Residential", price: "₦19,000.00", stock: 0 },
  { id: "netflix-premium", category: "Premium Accounts", icon: "N", name: "Netflix Premium Account", price: "₦7,500.00", stock: 18 },
];

export default function Marketplace() {
  const router = useRouter();
  const searchRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((product) => {
      const categoryMatch = category === "all" || product.category === category;
      const queryMatch = !q || product.name.toLowerCase().includes(q) || product.category.toLowerCase().includes(q);
      return categoryMatch && queryMatch;
    });
  }, [category, query]);

  function goBack() {
    if (typeof window !== "undefined" && window.history.length > 1) router.back();
    else router.push("/");
  }

  function submitSearch(event: FormEvent) {
    event.preventDefault();
    searchRef.current?.focus();
  }

  const chipLabel = category === "all" ? "9PROXY (IPS)" : category;

  return (
    <main className={styles.screen}>
      <header className={styles.header}>
        <button type="button" className={styles.back} onClick={goBack} aria-label="Go back">‹</button>
        <div className={styles.heading}>
          <h1>Marketplace</h1>
          <p>Premium accounts, proxies and digital products</p>
        </div>
        <Link href="/orders" className={styles.orders} aria-label="Open orders">▣</Link>
      </header>

      <label className={styles.category}>
        <span>Shop by Categories</span>
        <span className={styles.categoryChevron} aria-hidden="true">⌄</span>
        <select value={category} onChange={(event) => setCategory(event.target.value)} aria-label="Shop by Categories">
          <option value="all">All Categories</option>
          <option value="9PROXY (IPS)">9PROXY (IPS)</option>
          <option value="Premium Accounts">Premium Accounts</option>
        </select>
      </label>

      <form className={styles.search} onSubmit={submitSearch} role="search">
        <input
          ref={searchRef}
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Quick search products..."
          aria-label="Quick search products"
          autoComplete="off"
        />
        <button type="submit" aria-label="Search products">⌕</button>
      </form>

      <div className={styles.sectionHead}>
        <h2>Our Recent Products</h2>
        <span>Live stock</span>
      </div>
      <div className={styles.chip}>{chipLabel}</div>

      {filtered.length ? (
        <section className={styles.list} aria-label="Marketplace products" aria-live="polite">
          {filtered.map((product) => {
            const soldOut = product.stock <= 0;
            return (
              <article className={styles.product} key={product.id}>
                <div className={styles.icon} aria-hidden="true">{product.icon}</div>
                <div className={styles.copy}>
                  <h3>{product.name}</h3>
                  <div className={styles.meta}>
                    <div>
                      <div className={styles.price}>{product.price}</div>
                      <div className={styles.state}>{soldOut ? "Out of stock" : "In stock"}</div>
                    </div>
                    <div className={styles.stock}>{product.stock} pcs</div>
                  </div>
                </div>
                <button
                  type="button"
                  className={`${styles.buy} ${soldOut ? styles.sold : ""}`}
                  disabled
                  aria-label={soldOut ? `${product.name} is sold out` : `${product.name} checkout is not available yet`}
                >
                  {soldOut ? "Sold Out" : "Buy"}
                </button>
              </article>
            );
          })}
        </section>
      ) : (
        <div className={styles.empty} role="status">No products match your search.</div>
      )}

      <Link href="/help-support" className={styles.help}>
        <span>Need help choosing a product?</span>
        <span>Get Help&nbsp; ›</span>
      </Link>
      <p className={styles.notice}>Marketplace checkout stays disabled until the verified provider purchase route is connected.</p>

      <BottomNav />
    </main>
  );
}
