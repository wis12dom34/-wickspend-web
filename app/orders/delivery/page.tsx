"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { wickspendApi, api } from "@/lib/api";
import { getSessionToken } from "@/lib/session";
import { marketplaceDeliveryEntries, marketplaceDeliveryText } from "@/lib/marketplaceDelivery";
import styles from "./delivery.module.css";

const money = (v: any) => `₦${Number(v || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
const refCandidates = (o: any) => [
  o?.reference,
  o?.order_reference,
  o?.ref,
  o?.id,
  o?.order_id,
  o?.delivery_reference,
  o?.marketplace_reference,
  o?.provider_reference,
  o?.data?.reference,
  o?.data?.order_reference,
  o?.data?.ref,
  o?.data?.id,
].filter((v) => v !== undefined && v !== null && String(v).trim() !== "").map((v) => String(v).trim());
const refOf = (o: any) => refCandidates(o)[0] || "";
const normalizeRef = (v: any) => String(v ?? "").trim().replace(/^#/, "").toLowerCase();
const matchesReference = (o: any, reference: string) => {
  const target = normalizeRef(reference);
  return refCandidates(o).some((value) => normalizeRef(value) === target);
};

function listOf(payload: any): any[] {
  if (Array.isArray(payload)) return payload;
  for (const value of [payload?.orders, payload?.items, payload?.data]) {
    if (Array.isArray(value)) return value;
  }
  for (const value of [payload?.data?.orders, payload?.data?.items, payload?.data?.data]) {
    if (Array.isArray(value)) return value;
  }
  if (payload?.order && typeof payload.order === "object") return [payload.order];
  if (payload?.data?.order && typeof payload.data.order === "object") return [payload.data.order];
  return [];
}

function unwrapOrder(payload: any, reference: string) {
  const direct = [payload?.order, payload?.data?.order, payload?.data, payload].find(
    (value) => value && typeof value === "object" && !Array.isArray(value) && matchesReference(value, reference)
  );
  if (direct) return direct;
  return listOf(payload).find((item: any) => matchesReference(item, reference)) || null;
}

async function copyText(value: string) {
  if (!value) return false;
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch {}

  try {
    const textarea = document.createElement("textarea");
    textarea.value = value;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    textarea.style.pointerEvents = "none";
    document.body.appendChild(textarea);
    textarea.select();
    textarea.setSelectionRange(0, textarea.value.length);
    const copied = document.execCommand("copy");
    textarea.remove();
    return copied;
  } catch {
    return false;
  }
}

export default function DeliveryPage() {
  const [order, setOrder] = useState<any | null>(null);
  const [message, setMessage] = useState("Loading your delivery…");
  const [copyStatus, setCopyStatus] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const reference = new URLSearchParams(window.location.search).get("reference") || "";
        const token = getSessionToken();
        if (!token) throw new Error("Please sign in to view this delivery.");
        if (!reference) throw new Error("Order reference is missing.");

        let found: any = null;

        // Manual Marketplace orders can expose a dedicated detail endpoint.
        try {
          const payload: any = await wickspendApi(
            `wickspend/backend/marketplace/manual-order?reference=${encodeURIComponent(reference)}`,
            { token }
          );
          found = unwrapOrder(payload, reference);
        } catch {}

        // FADDED / live Marketplace orders are normally available here and can
        // contain the actual delivery payload even when the generic Orders feed
        // only contains summary fields.
        if (!found) {
          try {
            const payload: any = await api.marketplace.orders(token);
            found = unwrapOrder(payload, reference);
          } catch {}
        }

        // Fall back to the unified Orders feed so historical/manual orders still work.
        if (!found) {
          const payload: any = await api.orders(token);
          found = unwrapOrder(payload, reference);
        }

        if (cancelled) return;
        if (!found) throw new Error("Delivery unavailable.");
        setOrder(found);
        setMessage("");
      } catch (e) {
        if (!cancelled) setMessage(e instanceof Error ? e.message : "Delivery unavailable.");
      }
    })();
    return () => { cancelled = true; };
  }, []);

  async function handleCopy(value: string, label = "Copied") {
    setCopyStatus("");
    const copied = await copyText(value);
    setCopyStatus(copied ? label : "Unable to copy on this device. Press and hold the delivery text to copy manually.");
    window.setTimeout(() => setCopyStatus(""), 2200);
  }

  const entries = marketplaceDeliveryEntries(order);
  const allText = marketplaceDeliveryText(order);
  const available = entries.length > 0 || order?.delivery_available === true;

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <Link className={styles.back} href="/orders" aria-label="Back to orders">‹</Link>
        <header className={styles.header}>
          <h1>Order Delivery</h1>
          <p>Protected digital delivery for your WickSpend purchase.</p>
        </header>

        {message ? (
          <div className={message.toLowerCase().includes("loading") ? styles.pending : styles.error}>{message}</div>
        ) : order && (
          <>
            <section className={`${styles.card} ${styles.meta}`}>
              <div className={styles.row}><span>Product</span><strong>{order.product_name || order.product || order.title || order.service || order?.product?.name || "Marketplace Product"}</strong></div>
              <div className={styles.row}><span>Order</span><strong>{refOf(order) || new URLSearchParams(window.location.search).get("reference") || "—"}</strong></div>
              <div className={styles.row}><span>Price</span><strong>{money(order.amount_ngn ?? order.final_amount_ngn ?? order.price_ngn ?? order?.data?.amount_ngn)}</strong></div>
              <div className={styles.row}><span>Status</span><strong>{String(order.status || order.state || order.order_status || order?.data?.status || "").replaceAll("_", " ")}</strong></div>
            </section>

            <section className={`${styles.card} ${styles.delivery}`}>
              <h2>{available ? "Your delivery" : "Delivery pending"}</h2>
              {!available ? (
                <p className={styles.notice}>This order has not been delivered yet. Once fulfillment is completed, the delivery will become available here.</p>
              ) : (
                <>
                  {entries.length ? entries.map((item, i) => (
                    <div className={styles.deliveryItem} key={`${item.label}-${i}`}>
                      <span>{item.label}</span>
                      <div className={styles.pre}>{item.value}</div>
                      <div className={styles.actions}>
                        {item.url && (
                          <a className={styles.button} href={item.value} target="_blank" rel="noreferrer">Open Delivery</a>
                        )}
                        <button type="button" className={styles.secondary} onClick={() => handleCopy(item.value, item.url ? "Link copied" : "Copied")}>{item.url ? "Copy Link" : "Copy"}</button>
                      </div>
                    </div>
                  )) : (
                    <p className={styles.notice}>Your delivery is confirmed. Open this order again if the delivery content is still being prepared.</p>
                  )}
                  {entries.length > 1 && (
                    <div className={styles.actions}>
                      <button type="button" className={styles.secondary} onClick={() => handleCopy(allText, "All delivery details copied")}>Copy all</button>
                    </div>
                  )}
                  {copyStatus && <p className={styles.copyStatus} role="status" aria-live="polite">{copyStatus}</p>}
                </>
              )}
            </section>

            <section className={styles.card}>
              <p className={styles.notice}>This delivery is returned only after WickSpend validates your signed-in session and verifies that this order belongs to you. Do not share credentials or download contents publicly.</p>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
