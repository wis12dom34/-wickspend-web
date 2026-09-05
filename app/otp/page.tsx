"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { BottomNav } from "@/components/BottomNav";
import { api } from "@/lib/api";
import { getSessionToken } from "@/lib/session";
import styles from "./otp.module.css";

const payloadOf = (v: any) => v?.data || v?.order || v;
const otpOf = (v: any) => String(v?.otp || v?.code || v?.sms_code || v?.sms?.code || v?.data?.otp || v?.data?.code || "");
const phoneOf = (v: any) => String(v?.phone_number || v?.number || v?.phone || "");
const serviceOf = (v: any) => String(v?.service_name || v?.service || v?.product || "WhatsApp");
const countryOf = (v: any) => String(v?.country_name || v?.country || v?.country_code || "United States");
const amountOf = (v: any) => {
  const ngn = v?.amount_ngn ?? v?.final_amount_ngn ?? v?.price_ngn;
  if (ngn != null && Number.isFinite(Number(ngn))) return `₦${Number(ngn).toLocaleString()}`;
  const usd = v?.amount_usd ?? v?.price_usd ?? v?.amount ?? v?.price;
  if (usd != null && Number.isFinite(Number(usd))) return `$${Number(usd).toFixed(2)}`;
  return "—";
};
const refundOf = (v: any) => {
  const ngn = v?.refund_amount_ngn ?? v?.refunded_amount_ngn ?? v?.refund?.amount_ngn ?? v?.refund?.amount;
  if (ngn != null && Number.isFinite(Number(ngn))) return `₦${Number(ngn).toLocaleString()}`;
  const usd = v?.refund_amount_usd ?? v?.refunded_amount_usd ?? v?.refund_amount;
  if (usd != null && Number.isFinite(Number(usd))) return `$${Number(usd).toFixed(2)}`;
  return "";
};
const refundRefOf = (v: any) => String(v?.refund_reference || v?.refund_ref || v?.refund?.reference || "");
const dateObj = (v: any) => { if (!v) return null; const d = new Date(v); return Number.isNaN(d.getTime()) ? null : d; };
const clock = (v: any) => { const d = dateObj(v); return d ? d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : "—"; };
const cancelledStatus = (v: any) => /cancelled|canceled/i.test(String(v?.status || v?.state || ""));
const refundConfirmed = (v:any) => /refunded|refund(ed)?|completed|approved|successful|success/i.test(String(v?.refund_status || v?.refund?.status || v?.status || v?.state || ""));
const walletMoney = (v:any) => { const n=Number(v); return Number.isFinite(n)?`₦${n.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}`:""; };

export default function OtpPage() {
  const [data, setData] = useState<any>(null);
  const [message, setMessage] = useState("Loading number…");
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [cancelError, setCancelError] = useState(false);
  const [toast, setToast] = useState("");
  const [walletBalance,setWalletBalance]=useState("");
  const mounted = useRef(true);
  const seq = useRef(0);
  const reference = useMemo(() => typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("reference") || "" : "", []);

  useEffect(() => () => { mounted.current = false; seq.current++; }, []);

  async function refresh(silent = false) {
    if (busy || !reference) return;
    const token = getSessionToken();
    if (!token) { setMessage("Please sign in to view this number."); return; }
    const id = ++seq.current;
    if (!silent) { setBusy(true); setMessage("Checking for OTP…"); }
    try {
      const r: any = await api.numbers.status(token, reference);
      const next = payloadOf(r);
      if (!mounted.current || id !== seq.current) return;
      setData(next && typeof next === "object" ? next : r);
      setCancelError(false);
      setMessage("");
    } catch (e) {
      if (mounted.current && id === seq.current) setMessage(e instanceof Error ? e.message : "Unable to refresh number status");
    } finally {
      if (mounted.current && id === seq.current && !silent) setBusy(false);
    }
  }

  useEffect(() => {
    if (!reference) { setMessage("Number reference is missing."); return; }
    refresh();
    const timer = window.setInterval(() => { if (!busy) refresh(true); }, 5000);
    return () => window.clearInterval(timer);
  }, [reference]);

  const refund = refundOf(data);
  const refunded = Boolean(data && refund && refundConfirmed(data));

  useEffect(()=>{
    if(!refunded)return;
    const token=getSessionToken();
    if(!token)return;
    let active=true;
    api.wallet.get(token).then((w:any)=>{
      if(!active)return;
      const raw=w?.balance_ngn??w?.wallet_balance_ngn??w?.balance??w?.wallet?.balance_ngn??w?.data?.balance_ngn??w?.data?.balance;
      setWalletBalance(walletMoney(raw));
    }).catch(()=>{});
    return()=>{active=false};
  },[refunded]);

  async function cancel() {
    if (busy || !reference) return;
    const token = getSessionToken();
    if (!token) { setMessage("Please sign in to cancel this number."); return; }
    const id = ++seq.current;
    setBusy(true);
    setMessage("Cancelling number…");
    setCancelError(false);
    try {
      const cancelResult: any = await api.numbers.cancel(token, reference);
      if (!mounted.current || id !== seq.current) return;
      setConfirm(false);

      let confirmed = payloadOf(cancelResult);
      try {
        const statusResult: any = await api.numbers.status(token, reference);
        const statusPayload = payloadOf(statusResult);
        if (statusPayload && typeof statusPayload === "object") confirmed = statusPayload;
      } catch {}

      if (!mounted.current || id !== seq.current) return;
      if (confirmed && typeof confirmed === "object") setData(confirmed);

      if (cancelledStatus(confirmed) || refundConfirmed(confirmed)) setMessage("");
      else {
        setCancelError(true);
        setMessage("Cancellation was not confirmed. Refresh before taking another action.");
      }
    } catch (e) {
      if (!mounted.current || id !== seq.current) return;
      setConfirm(false);
      setCancelError(true);
      setMessage(e instanceof Error ? e.message : "Unable to cancel this number");
    } finally {
      if (mounted.current && id === seq.current) setBusy(false);
    }
  }

  async function copy(value: string, label: string) {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setToast(label);
      window.setTimeout(() => setToast(""), 1600);
    } catch {
      setMessage("Copy failed. Press and hold to copy manually.");
    }
  }

  const status = String(data?.status || data?.state || "Active");
  const otp = otpOf(data);
  const phone = phoneOf(data) || "Number unavailable";
  const service = serviceOf(data);
  const country = countryOf(data);
  const expired = /expired/i.test(status);
  const cancelled = cancelledStatus(data);
  const terminal = expired || cancelled || refunded || /failed|complete/i.test(status);
  const created = data?.created_at || data?.createdAt || data?.purchased_at || data?.purchase_date;
  const expires = data?.expires_at || data?.expiry_at || data?.expiresAt;
  const refundReference = refundRefOf(data);
  const remaining = (() => {
    if (expired) return "Expired";
    const exp = dateObj(expires);
    if (!exp) return data?.time_remaining || data?.remaining || "20:00";
    const delta = Math.max(0, exp.getTime() - Date.now());
    const m = Math.floor(delta / 60000), s = Math.floor((delta % 60000) / 1000);
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  })();
  const target = service.toLowerCase().includes("telegram") ? "https://web.telegram.org" : service.toLowerCase().includes("instagram") ? "https://www.instagram.com" : service.toLowerCase().includes("facebook") ? "https://www.facebook.com" : service.toLowerCase().includes("tiktok") ? "https://www.tiktok.com" : "https://web.whatsapp.com";
  const orderLabel=reference?`Order #${reference}`:"Order details";
  const productLabel=`${country} ${service} Number`;

  return <main className="shell appShell">
    <div className={styles.screen}>
      {refunded ? <section className={styles.refundedTerminal}>
        <div className={styles.refundedCheck}>✓</div>
        <h1>Number cancelled</h1><p>The provider approved the cancellation.</p>
        <div className={styles.refundedCard}><small>REFUND</small><strong>{refund}</strong><p>Returned to WickSpend Wallet</p><div><span>New balance</span><b>{walletBalance||"Updated in wallet"}</b></div></div>
        <div className={styles.refundedOrder}><b>{orderLabel}</b><p>{productLabel} • Cancelled</p><strong>Refund completed</strong>{refundReference&&<small>Reference • {refundReference}</small>}</div>
        <Link href="/buy-number" className={styles.refundedPrimary}>Buy another number</Link><Link href="/wallet" className={styles.refundedSecondary}>View wallet</Link>
      </section> : expired ? <section className={styles.expiredTerminal}>
        <header><Link href="/buy-number" aria-label="Back">‹</Link><div><h1>Number expired</h1><p>The verification window has ended.</p></div></header>
        <div className={styles.expiredStatus}><small>STATUS</small><strong>Expired</strong><b>{productLabel}</b><p>{orderLabel}</p></div>
        <h2>Refund status</h2>
        <div className={styles.expiredRefund}><b>Refund review</b><p>If the provider confirms the number was unused,<br/>the eligible amount is returned to your wallet.</p><strong>Status • {refundConfirmed(data)?"Provider confirmation received":"Pending provider confirmation"}</strong></div>
        <Link className={styles.expiredPrimary} href="/buy-number">Buy another number</Link><Link className={styles.expiredSecondary} href="/orders">View order details</Link>
        <div className={styles.expiredNote}><b>You will not be charged twice</b><p>Any approved refund returns to your WickSpend Wallet.</p></div>
      </section> : <>
      <header className={styles.header}>
        <h1>OTP</h1><p>Receive SMS/OTP in real time.</p>
        <button className={styles.refreshTop} type="button" disabled={busy || !reference} onClick={() => refresh()}>{busy ? "Checking…" : "Refresh"}</button>
      </header>

      {data && !cancelled && <>
        <section className={styles.card}>
          <div className={styles.service}>{service}</div><div className={styles.country}>{country}</div><div className={styles.number}>{phone}</div>
          <div className={styles.status}><span>{terminal ? status : "Active"}</span><span className={styles.statusDot}/></div>
          <button className={styles.copyNumber} type="button" onClick={() => copy(phone, "Number Copied")}>Copy Number</button>
        </section>
        <section className={styles.info}>
          <div><small>Time Remaining</small><strong>{remaining}</strong></div><div><small>Purchased At</small><strong>{clock(created)}</strong></div>
          <div><small>Expires At</small><strong>{clock(expires)}</strong></div><div><small>Total Price</small><strong>{amountOf(data)}</strong></div>
        </section>
      </>}

      {cancelled && <>
        <section className={styles.cancelledSuccess}>
          <div className={styles.check}>✓</div><h2>Number Cancelled</h2>
          <strong>Cancellation confirmed.</strong>
          <p>No refund is shown as completed until the provider/backend confirms a refund amount and status.</p>
          <Link href="/buy-number" className={styles.primary}>Back to Numbers</Link>
        </section>
        <section className={styles.refundStatus}>
          <div><small>Status</small><strong>Cancelled</strong></div>
          <div><small>Refund</small><strong>Not confirmed</strong></div>
          <p>Refund information will appear only after provider confirmation.</p>
        </section>
      </>}

      {data && !cancelled && (cancelError ? <>
        <section className={styles.cancelErrorCard}>
          <h2>Unable to cancel this number.</h2><p>The cancellation was not confirmed.<br/>No refund is being claimed or shown as completed.</p>
          <div className={styles.errorActions}><button type="button" disabled={busy} onClick={cancel}>Try Again</button><button type="button" onClick={() => { setCancelError(false); setMessage(""); }}>Keep Number</button></div>
          <small>If the status changes later, refresh before taking another action.</small>
        </section>
        <div className={styles.actions}><button type="button" disabled={busy} onClick={() => refresh()}>{busy ? "Checking…" : "Refresh"}</button><a href={target} target="_blank" rel="noreferrer">Open Target Site</a><button type="button" className={styles.cancel} disabled={busy} onClick={() => setConfirm(true)}>Cancel Number</button></div>
      </> : <>
        <section className={styles.state}>{otp ? <><div className={styles.listen}>OTP received</div><div className={styles.digits}>{otp.replace(/\s/g, "").slice(0, 6).padEnd(6, "•").split("").map((d, i) => <div className={styles.digit} style={{ animationDelay: `${i * 45}ms` }} key={`${d}-${i}`}>{d}</div>)}</div><button className={styles.copyOtp} type="button" onClick={() => copy(otp, "OTP Copied")}>Copy OTP</button><p className={styles.receivedAgo}>Received just now</p></> : <><h2>Waiting for code…</h2><p>We’ll automatically detect your SMS/OTP.</p><div className={styles.dots}>{[0,1,2,3,4].map(i => <span className={styles.dot} key={i}/>)}</div><div className={styles.listen}>Listening securely</div></>}</section>
        <div className={styles.actions}><button type="button" disabled={busy} onClick={() => refresh()}>{busy ? "Checking…" : "Refresh"}</button><a href={target} target="_blank" rel="noreferrer">Open Target Site</a><button type="button" className={styles.cancel} disabled={busy} onClick={() => setConfirm(true)}>Cancel Number</button></div>
      </>)}

      {message && !cancelled && <p className={`${styles.message} ${/unable|failed|missing|sign in|not confirmed/i.test(message) ? styles.error : ""}`} role="status">{message}</p>}
      </>}
    </div>

    {toast && <div className={styles.toast}>{toast}</div>}
    {confirm && data && <div className={styles.confirmBackdrop} onClick={() => !busy && setConfirm(false)}>
      <section className={styles.confirm} role="dialog" aria-modal="true" aria-label="Cancel number" onClick={e => e.stopPropagation()}>
        <h2>Cancel Number?</h2><p>Review refund eligibility before continuing.</p>
        <div className={styles.refundEligibility}><strong>Refund eligible</strong><span>Only if cancellation is accepted by the backend.</span><div><small>Refund amount</small><b>{refund || "Confirmed after cancellation"}</b></div><em>No refund is shown as completed until cancellation is confirmed.</em></div>
        <button type="button" className={styles.keepButton} disabled={busy} onClick={() => setConfirm(false)}>Keep Number</button>
        <button className={styles.refundButton} type="button" disabled={busy} onClick={cancel}>{busy ? "Cancelling…" : "Cancel & Refund"}</button>
        <small className={styles.cancelNote}>Cancellation may fail depending on the number status.</small>
      </section>
    </div>}
    <BottomNav />
  </main>;
}
