"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { BottomNav } from "@/components/BottomNav";
import { api } from "@/lib/api";
import { getSessionToken } from "@/lib/session";
import styles from "./status.module.css";

type ViewState = "loading" | "processing" | "delivered" | "failed" | "missing";

function listOf(payload: any) {
  if (Array.isArray(payload)) return payload;
  for (const key of ["orders", "items", "data"]) {
    if (Array.isArray(payload?.[key])) return payload[key];
  }
  if (Array.isArray(payload?.data?.orders)) return payload.data.orders;
  if (Array.isArray(payload?.data?.items)) return payload.data.items;
  return [];
}

function referenceOf(order: any) {
  return String(order?.reference ?? order?.order_reference ?? order?.ref ?? order?.id ?? "");
}

function statusOf(order: any) {
  return String(order?.status ?? order?.state ?? order?.order_status ?? "pending").toLowerCase();
}

function viewFrom(order: any): ViewState {
  const status = statusOf(order);
  if (/delivered|complete|completed|fulfilled|success/.test(status)) return "delivered";
  if (/failed|error|cancelled|canceled|refunded/.test(status)) return "failed";
  return "processing";
}

function productName(order: any) {
  return order?.product_name ?? order?.name ?? order?.title ?? order?.product?.name ?? order?.item?.name ?? "Marketplace order";
}

function amount(order: any) {
  const raw = order?.final_amount_ngn ?? order?.amount_ngn ?? order?.price_ngn ?? order?.amount ?? order?.price;
  const n = Number(raw);
  return Number.isFinite(n) ? `₦${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "—";
}

function delivery(order: any) {
  return order?.delivery ?? order?.delivery_data ?? order?.credentials ?? order?.account_details ?? order?.details ?? order?.provider_delivery ?? "";
}

function stringifyDelivery(value: any) {
  if (!value) return "";
  if (typeof value === "string") return value;
  try { return JSON.stringify(value, null, 2); } catch { return String(value); }
}

export default function MarketplaceStatusPage() {
  const [view, setView] = useState<ViewState>("loading");
  const [order, setOrder] = useState<any>(null);
  const [message, setMessage] = useState("");
  const [revealed, setRevealed] = useState(false);

  const reference = useMemo(() => {
    if (typeof window === "undefined") return "";
    return new URLSearchParams(window.location.search).get("reference") || "";
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const token = getSessionToken();
      if (!reference) { setView("missing"); return; }
      if (!token) { setMessage("Please sign in to view this marketplace order."); setView("missing"); return; }
      try {
        const payload: any = await api.orders(token);
        if (cancelled) return;
        const match = listOf(payload).find((item: any) => referenceOf(item) === reference);
        if (!match) { setView("missing"); return; }
        setOrder(match);
        setView(viewFrom(match));
      } catch (error) {
        if (!cancelled) { setMessage(error instanceof Error ? error.message : "Unable to load this order."); setView("failed"); }
      }
    }
    load();
    return () => { cancelled = true; };
  }, [reference]);

  const deliveredValue = stringifyDelivery(delivery(order));

  async function copyDelivery() {
    if (!deliveredValue) return;
    try { await navigator.clipboard.writeText(deliveredValue); setMessage("Delivery details copied."); }
    catch { setMessage("Unable to copy delivery details on this device."); }
  }

  function downloadDelivery() {
    if (!deliveredValue) return;
    const blob = new Blob([deliveredValue], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `wickspend-${reference || "marketplace-order"}.txt`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return <main className={styles.screen}>
    <header className={styles.header}>
      <div><h1>Marketplace</h1><p>Premium digital products, one clean checkout.</p></div>
      <Link href="/orders" className={styles.orders}>Orders</Link>
    </header>

    {view === "loading" && <>
      <section className={styles.processingCard}>
        <h2>Processing purchase…</h2>
        <p>Please keep this screen open.</p>
        <div className={styles.progress}><span /></div>
      </section>
      <button className={styles.processingButton} type="button" disabled>Processing…</button>
      <p className={styles.hint}>Duplicate purchase protection is active.</p>
    </>}

    {view === "processing" && <>
      <section className={styles.processingCard}>
        <h2>Processing purchase…</h2>
        <p>Your order is still being processed.</p>
        <div className={styles.progress}><span /></div>
      </section>
      <Link href={`/marketplace/status?reference=${encodeURIComponent(reference)}`} className={styles.processingButton}>Refresh status</Link>
      <p className={styles.hint}>Duplicate purchase protection is active.</p>
    </>}

    {view === "delivered" && <>
      <section className={styles.successCard}>
        <h2>Purchase Successful</h2>
        <div><span>Order ID&nbsp; {reference}</span><strong>Delivered</strong></div>
      </section>
      <h3 className={styles.sectionLabel}>Product</h3>
      <section className={styles.productCard}><strong>{productName(order)}</strong><b>{amount(order)}</b></section>
      <h3 className={styles.sectionLabel}>Secure Delivery</h3>
      <section className={styles.deliveryCard}>
        <span>Account details</span>
        <pre className={revealed ? styles.deliveryText : styles.masked}>{revealed ? (deliveredValue || "Delivery confirmed. Open Orders for full details.") : "••••••••••••"}</pre>
        <p>Sensitive information is hidden by default.</p>
        <div className={styles.deliveryActions}>
          <button type="button" className={styles.primary} onClick={() => setRevealed((value) => !value)}>{revealed ? "Hide" : "Reveal"}</button>
          <button type="button" disabled={!deliveredValue} onClick={copyDelivery}>Copy</button>
          <button type="button" disabled={!deliveredValue} onClick={downloadDelivery}>Download</button>
        </div>
      </section>
      <Link href="/orders" className={styles.instructions}>Instructions</Link>
    </>}

    {view === "failed" && <>
      <section className={styles.failureCard}>
        <h2>Purchase failed</h2>
        <p>Your order was not completed.</p>
        <p>No delivery has been issued.</p>
        <div className={styles.failureActions}>
          <Link href="/marketplace" className={styles.primary}>Try Again</Link>
          <Link href="/marketplace">Back to Marketplace</Link>
        </div>
      </section>
      <section className={styles.ruleCard}><strong>Important</strong><p>Only wallet deductions, refunds, or delivery confirmed by the transaction state are shown here.</p></section>
    </>}

    {view === "missing" && <section className={styles.failureCard}>
      <h2>Order not found</h2>
      <p>{message || "We could not find a marketplace order for this reference."}</p>
      <div className={styles.failureActions}><Link href="/orders" className={styles.primary}>View Orders</Link><Link href="/marketplace">Back to Marketplace</Link></div>
    </section>}

    {message && view !== "missing" && <p className={styles.message} role="status">{message}</p>}
    <BottomNav />
  </main>;
}
