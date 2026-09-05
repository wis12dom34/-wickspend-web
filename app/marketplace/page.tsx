"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { BottomNav } from "@/components/BottomNav";
import { api } from "@/lib/api";
import { getSessionToken } from "@/lib/session";
import styles from "./marketplace.module.css";

type Category = "Social Accounts" | "Digital Accounts" | "Premium Products" | "Tools" | "Other";
type Product = {
  id: string;
  category: Category;
  name: string;
  location: string;
  price: string;
  stock: number;
  badge?: string;
  iconUrl?: string;
  iconText?: string;
  tone?: "dark" | "blue";
};

const products: Product[] = [
  { id: "netflix-premium", category: "Premium Products", name: "Netflix Premium", location: "Global", price: "₦7,500.00", stock: 18, iconUrl: "https://cdn.simpleicons.org/netflix/E50914", tone: "dark" },
  { id: "9proxy-10", category: "Tools", name: "9PROXY 10 IP", location: "Global", price: "₦4,000.00", stock: 126, iconText: "↗", tone: "blue" },
  { id: "facebook-account", category: "Social Accounts", name: "Facebook Account", location: "United States", price: "₦12,000.00", stock: 18, iconUrl: "https://cdn.simpleicons.org/facebook/0866FF" },
  { id: "gmail-account", category: "Digital Accounts", name: "Gmail Account", location: "United States", price: "₦6,500.00", stock: 34, iconUrl: "https://cdn.simpleicons.org/gmail/EA4335" },
  { id: "residential-proxy", category: "Tools", name: "Residential Proxy Pack", location: "United States", price: "₦8,000.00", stock: 8, badge: "New", iconText: "▤", tone: "blue" },
  { id: "streaming-bundle", category: "Premium Products", name: "Streaming Bundle", location: "Global", price: "₦14,000.00", stock: 12, iconText: "▶", tone: "dark" },
  { id: "instagram-account", category: "Social Accounts", name: "Instagram Account", location: "United Kingdom", price: "₦11,500.00", stock: 9, iconUrl: "https://cdn.simpleicons.org/instagram/E4405F" },
  { id: "discord-account", category: "Digital Accounts", name: "Discord Account", location: "Canada", price: "₦5,500.00", stock: 21, iconUrl: "https://cdn.simpleicons.org/discord/5865F2" },
];

const categories: Category[] = ["Social Accounts", "Digital Accounts", "Premium Products", "Tools", "Other"];
const sectionMap = [
  ["Featured", "Premium picks with strong availability", ["netflix-premium", "9proxy-10"]],
  ["Popular", "Frequently purchased products", ["facebook-account", "gmail-account"]],
  ["New", "Recently added inventory", ["residential-proxy", "streaming-bundle"]],
  ["Recommended", "Matched to recent activity", ["instagram-account", "discord-account"]],
] as const;

const numericPrice = (value: string) => Number(value.replace(/[^0-9.]/g, "")) || 0;
const money = (value: number | null) => value == null ? "—" : `₦${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const walletBalance = (wallet: any) => {
  const raw = wallet?.balance_ngn ?? wallet?.wallet_balance_ngn ?? wallet?.balance ?? wallet?.wallet?.balance_ngn ?? wallet?.data?.balance_ngn ?? wallet?.data?.balance;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
};

function ProductIcon({ product }: { product: Product }) {
  return <span className={`${styles.productIcon} ${product.tone === "dark" ? styles.iconDark : ""} ${product.tone === "blue" ? styles.iconBlue : ""}`} aria-hidden="true">
    {product.iconUrl ? <img src={product.iconUrl} alt="" loading="lazy" /> : <b>{product.iconText}</b>}
  </span>;
}

function ProductCard({ product, onOpen }: { product: Product; onOpen: (product: Product) => void }) {
  const soldOut = product.stock <= 0;
  return <article className={styles.productCard}>
    <div className={styles.cardTop}>
      <ProductIcon product={product} />
      <div className={styles.cardCopy}>
        <span>{product.category.toUpperCase()}</span>
        <h3>{product.name}</h3>
        <p>{product.location}</p>
      </div>
    </div>
    <div className={styles.cardBottom}>
      <div>
        <small>{product.badge || (soldOut ? "Out of stock" : `${product.stock} in stock`)}</small>
        <strong>{product.price}</strong>
      </div>
      <button type="button" onClick={() => onOpen(product)}>View</button>
    </div>
  </article>;
}

export default function Marketplace() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<Category | "All">("All");
  const [selected, setSelected] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [notice, setNotice] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    const token = getSessionToken();
    if (!token) return;
    api.wallet.get(token).then((payload: any) => {
      if (!cancelled) setBalance(walletBalance(payload));
    }).catch(() => {
      if (!cancelled) setBalance(null);
    });
    return () => { cancelled = true; };
  }, []);

  const normalized = query.trim().toLowerCase();
  const filtered = useMemo(() => products.filter((product) => {
    const categoryMatch = category === "All" || product.category === category;
    const queryMatch = !normalized || `${product.name} ${product.category} ${product.location}`.toLowerCase().includes(normalized);
    return categoryMatch && queryMatch;
  }), [category, normalized]);

  function openProduct(product: Product) {
    setSelected(product);
    setQuantity(1);
    setNotice("");
    setConfirming(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (selected) {
    const soldOut = selected.stock <= 0;
    const total = numericPrice(selected.price) * quantity;
    const balanceAfter = balance == null ? null : balance - total;

    if (soldOut) {
      return <main className={`${styles.screen} ${styles.stateScreen}`}>
        <header className={styles.topHeader}>
          <div><h1>Marketplace</h1><p>Premium digital products, one clean checkout.</p></div>
          <Link href="/orders" className={styles.ordersButton}>Orders</Link>
        </header>
        <section className={styles.stockCard}>
          <span>{selected.category.replace(/s$/, "")}</span>
          <h2>{selected.name}</h2>
          <b>Out of stock</b>
          <strong>{selected.price}</strong>
        </section>
        <button type="button" className={styles.notifyButton} onClick={() => setNotice("Availability alerts will appear here when Marketplace notification support is connected.")}>Notify Me</button>
        <p className={styles.stateHint}>This product is currently unavailable.</p>
        {notice && <p className={styles.centerNotice} role="status">{notice}</p>}
        <BottomNav />
      </main>;
    }

    return <main className={`${styles.screen} ${styles.detailScreen}`}>
      <header className={styles.topHeader}>
        <div>
          <h1>Marketplace</h1>
          <p>Premium digital products, one clean checkout.</p>
        </div>
        <Link href="/orders" className={styles.ordersButton}>Orders</Link>
      </header>

      <button type="button" className={styles.backLink} onClick={() => { setSelected(null); setNotice(""); setConfirming(false); }}>‹ Back</button>

      <section className={styles.heroCard}>
        <span>{selected.category.replace(/s$/, "")}</span>
        <h2>{selected.name}</h2>
        <p>{selected.location}</p>
        <div><strong>{selected.price}</strong><b>In stock</b></div>
      </section>

      <section className={styles.detailCopy}><h3>Description</h3><p>Premium digital access delivered securely after purchase.</p></section>
      <section className={styles.detailCopy}><h3>What’s Included</h3><p>Account access details and setup instructions.</p></section>
      <section className={styles.detailCopy}><h3>Delivery Information</h3><p>Delivered to this order screen after successful payment.</p></section>
      <section className={styles.detailCopy}><h3>Important Information</h3><p>Review usage terms before changing account details.</p></section>

      <div className={styles.purchaseRow}>
        <div className={styles.qtyBlock}>
          <label>Quantity</label>
          <div>
            <button type="button" onClick={() => setQuantity((value) => Math.max(1, value - 1))}>−</button>
            <strong>{quantity}</strong>
            <button type="button" onClick={() => setQuantity((value) => Math.min(Math.max(selected.stock, 1), value + 1))}>+</button>
          </div>
        </div>
        <button type="button" className={styles.saveButton} onClick={() => setNotice("Saved for later on this device.")}>Save</button>
        <button type="button" className={styles.buyNow} onClick={() => { setNotice(""); setConfirming(true); }}>Buy Now</button>
      </div>
      {notice && <p className={styles.notice} role="status">{notice}</p>}

      {confirming && <div className={styles.confirmBackdrop} role="presentation" onClick={() => setConfirming(false)}>
        <section className={styles.confirmSheet} role="dialog" aria-modal="true" aria-label="Confirm purchase" onClick={(event) => event.stopPropagation()}>
          <h2>Confirm purchase</h2>
          <div className={styles.confirmRows}>
            <div><span>Product</span><strong>{selected.name}</strong></div>
            <div><span>Quantity</span><strong>{quantity}</strong></div>
            <div><span>Price</span><strong>{money(total)}</strong></div>
            <div><span>Wallet Balance</span><strong>{money(balance)}</strong></div>
            <div><span>Balance After Purchase</span><strong>{balanceAfter == null ? "—" : money(balanceAfter)}</strong></div>
          </div>
          <button type="button" className={styles.confirmButton} onClick={() => { setConfirming(false); setNotice("Marketplace checkout is not live yet because the verified provider purchase route has not been connected."); }}>Confirm Purchase</button>
          <button type="button" className={styles.cancelButton} onClick={() => setConfirming(false)}>Cancel</button>
        </section>
      </div>}
      <BottomNav />
    </main>;
  }

  const searching = normalized.length > 0 || category !== "All";

  return <main className={styles.screen}>
    <header className={styles.topHeader}>
      <div>
        <h1>Marketplace</h1>
        <p>Premium digital products, one clean checkout.</p>
      </div>
      <Link href="/orders" className={styles.ordersButton}>Orders</Link>
    </header>

    <label className={styles.searchBox}>
      <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search products" aria-label="Search products" />
    </label>

    <div className={styles.categoryGrid}>
      {categories.map((item) => <button key={item} type="button" className={category === item ? styles.categoryActive : ""} onClick={() => setCategory(category === item ? "All" : item)}>{item}</button>)}
    </div>

    {searching ? <section className={styles.searchResults}>
      <div className={styles.sectionTitle}><h2>Search Results</h2><p>{filtered.length ? `${filtered.length} product${filtered.length === 1 ? "" : "s"}` : "No matching products"}</p></div>
      {filtered.length ? <div className={styles.productGrid}>{filtered.map((product) => <ProductCard key={product.id} product={product} onOpen={openProduct} />)}</div> : <div className={styles.emptyState}><strong>No products found</strong><p>Try a different search or category.</p><button type="button" onClick={() => { setQuery(""); setCategory("All"); }}>Clear filters</button></div>}
    </section> : <>
      {sectionMap.map(([title, subtitle, ids]) => <section className={styles.productSection} key={title}>
        <div className={styles.sectionTitle}><h2>{title}</h2><p>{subtitle}</p></div>
        <div className={styles.productGrid}>{ids.map((id) => {
          const product = products.find((item) => item.id === id)!;
          return <ProductCard key={product.id} product={product} onOpen={openProduct} />;
        })}</div>
      </section>)}
      <section className={styles.productSection}>
        <div className={styles.sectionTitle}><h2>Recently Viewed</h2><p>Continue where you left off</p></div>
        <div className={styles.productGrid}>{products.slice(0, 2).map((product) => <ProductCard key={product.id} product={product} onOpen={openProduct} />)}</div>
      </section>
    </>}

    <BottomNav />
  </main>;
}
