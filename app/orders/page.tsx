"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PageShell } from "@/components/PageShell";
import { api } from "@/lib/api";

function getToken() {
  return localStorage.getItem("wickspend_session_token") || localStorage.getItem("wickspend_token") || "";
}

function getReference(order: any) {
  return String(order?.reference || order?.order_reference || order?.ref || order?.id || "");
}

function getOtp(payload: any) {
  return payload?.otp || payload?.code || payload?.sms_code || payload?.data?.otp || payload?.data?.code || payload?.sms?.code || "";
}

export default function Orders() {
  const params = useSearchParams();
  const focusReference = params.get("reference") || "";
  const [items, setItems] = useState<any[]>([]);
  const [message, setMessage] = useState("Loading orders…");
  const [statusByRef, setStatusByRef] = useState<Record<string, any>>({});
  const [busyRef, setBusyRef] = useState("");

  async function loadOrders() {
    const token = getToken();
    if (!token) {
      setMessage("Please sign in to view your orders.");
      setItems([]);
      return;
    }
    try {
      const data: any = await api.orders(token);
      const list = Array.isArray(data) ? data : (data?.orders || data?.items || data?.data || []);
      setItems(Array.isArray(list) ? list : []);
      setMessage("");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Unable to load orders");
    }
  }

  useEffect(() => { loadOrders(); }, []);

  const sortedItems = useMemo(() => {
    if (!focusReference) return items;
    return [...items].sort((a, b) => Number(getReference(b) === focusReference) - Number(getReference(a) === focusReference));
  }, [items, focusReference]);

  async function refreshStatus(order: any) {
    const reference = getReference(order);
    if (!reference) return;
    const token = getToken();
    if (!token) return setMessage("Please sign in first.");
    setBusyRef(reference);
    try {
      const status: any = await api.numbers.status(token, reference);
      setStatusByRef((current) => ({ ...current, [reference]: status }));
      setMessage("");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Unable to refresh number status");
    } finally {
      setBusyRef("");
    }
  }

  async function cancelNumber(order: any) {
    const reference = getReference(order);
    if (!reference) return;
    const token = getToken();
    if (!token) return setMessage("Please sign in first.");
    setBusyRef(reference);
    try {
      await api.numbers.cancel(token, reference);
      setMessage("Number cancelled. Any eligible refund will be handled by the backend policy.");
      await refreshStatus(order);
      await loadOrders();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Unable to cancel this number");
    } finally {
      setBusyRef("");
    }
  }

  return (
    <PageShell title="Orders" subtitle="Your purchases and activity">
      {message && <div className="panel"><p className="statusText">{message}</p></div>}
      {sortedItems.length > 0 ? (
        <div className="list">
          {sortedItems.map((order: any, i) => {
            const reference = getReference(order);
            const live = reference ? statusByRef[reference] : null;
            const otp = getOtp(live || order);
            const status = live?.status || live?.data?.status || order?.status || "Processing";
            const isNumber = /number|sms|otp/i.test(String(order?.type || order?.category || order?.product_type || order?.service || "")) || Boolean(order?.phone_number || order?.number);
            const canCancel = isNumber && !/cancel|complete|expired|refunded/i.test(String(status));
            return (
              <div className="listItem" key={reference || order?.id || i} style={{ alignItems: "flex-start", gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <b>{order?.service || order?.product || order?.title || "Order"}</b><br />
                  <small>{status}</small>
                  {reference && <><br /><small>Ref: {reference}</small></>}
                  {(live?.phone_number || live?.number || order?.phone_number || order?.number) && <><br /><strong>{live?.phone_number || live?.number || order?.phone_number || order?.number}</strong></>}
                  {otp && <><br /><div className="price" style={{ marginTop: 8 }}>OTP: {otp}</div></>}
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
                    {isNumber && reference && <button className="secondaryButton" type="button" disabled={busyRef === reference} onClick={() => refreshStatus(order)}>{busyRef === reference ? "Checking…" : "View OTP / Refresh"}</button>}
                    {canCancel && reference && <button className="secondaryButton" type="button" disabled={busyRef === reference} onClick={() => cancelNumber(order)}>Cancel number</button>}
                  </div>
                </div>
                <span>{order?.amount_ngn ? `₦${Number(order.amount_ngn).toLocaleString()}` : ""}</span>
              </div>
            );
          })}
        </div>
      ) : !message ? (
        <div className="panel"><h3>No orders yet</h3><p>Your orders will appear here once you make a purchase.</p></div>
      ) : null}
    </PageShell>
  );
}
