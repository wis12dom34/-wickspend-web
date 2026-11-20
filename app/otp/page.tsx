"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { getSessionToken } from "@/lib/session";
import styles from "./otp.module.css";

const payloadOf = (v: any) => v?.data || v?.order || v;
const otpOf = (input: any): string => {
  const seen = new Set<any>();
  const directKeys = ["otp","sms_code","smsCode","verification_code","verificationCode","code"];
  const nestedKeys = ["data","order","sms","messages","message","provider_response","providerResponse","provider_status","providerStatus","result","results"];
  const fromString = (value: string) => {
    const text = value.trim();
    const statusMatch = text.match(/(?:STATUS_OK|CODE_RECEIVED|OTP_RECEIVED)\s*[:=-]\s*([0-9]{3}[-\s]?[0-9]{3}|[0-9]{3,12})/i);
    if (statusMatch) return statusMatch[1].replace(/[-\s]/g, "");
    const labeled = text.match(/(?:otp|code|verification)[^0-9]{0,20}([0-9]{3}[-\s]?[0-9]{3}|[0-9]{3,12})/i);
    return labeled ? labeled[1].replace(/[-\s]/g, "") : "";
  };
  const visit = (value: any, depth = 0): string => {
    if (value == null || depth > 7) return "";
    if (typeof value === "string") return fromString(value);
    if (Array.isArray(value)) { for (const item of value) { const hit = visit(item, depth + 1); if (hit) return hit; } return ""; }
    if (typeof value !== "object" || seen.has(value)) return "";
    seen.add(value);
    for (const key of directKeys) {
      const raw = value?.[key];
      if (raw == null) continue;
      const text = String(raw).trim();
      if (/^[0-9]{3}[-\s]?[0-9]{3}$/.test(text)) return text.replace(/[-\s]/g, "");
      if (/^[0-9]{3,12}$/.test(text)) return text;
      const hit = fromString(text); if (hit) return hit;
    }
    for (const key of nestedKeys) { const hit = visit(value?.[key], depth + 1); if (hit) return hit; }
    return "";
  };
  return visit(input);
};
const phoneOf = (v: any) => String(v?.phone_number || v?.number || v?.phone || "");
const serviceOf = (v: any) => String(v?.service_name || v?.service || v?.product || v?.service_code || "WhatsApp");
const countryOf = (v: any) => {
  const raw = String(v?.country_name || v?.country || v?.country_code || "");
  const known: Record<string,string> = { "187":"United States", US:"United States", "19":"Nigeria", NG:"Nigeria", "16":"United Kingdom", GB:"United Kingdom", "43":"Germany", DE:"Germany", "36":"Canada", CA:"Canada", "15":"Poland", PL:"Poland" };
  return known[raw.toUpperCase()] || raw || "United States";
};
const amountOf = (v: any) => {
  const ngn = v?.customer_price_ngn ?? v?.amount_ngn ?? v?.final_amount_ngn ?? v?.price_ngn;
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
const refundConfirmed = (v:any) => {
  const explicit = String(v?.refund_status || v?.refund?.status || "").toLowerCase();
  if (explicit) return /^(refunded|completed|approved|successful|success)$/.test(explicit);
  return /^(failed_refunded|cancelled_refunded|canceled_refunded|refunded)$/.test(String(v?.status || v?.state || "").toLowerCase());
};
const walletMoney = (v:any) => { const n=Number(v); return Number.isFinite(n)?`₦${n.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}`:""; };
const referenceOf = (v:any) => String(v?.reference || v?.order_reference || v?.orderReference || v?.ref || v?.order?.reference || v?.data?.reference || "").trim();
const timeOf = (v:any) => {
  const raw = v?.created_at || v?.createdAt || v?.purchased_at || v?.purchase_date || v?.updated_at || v?.updatedAt;
  const value = raw ? new Date(raw).getTime() : 0;
  return Number.isFinite(value) ? value : 0;
};
const listOf = (v:any): any[] => {
  if (Array.isArray(v)) return v;
  if (!v || typeof v !== "object") return [];
  const direct = [v.items, v.orders, v.number_orders, v.numbers, v.activations, v.results, v.data?.items, v.data?.orders, v.data?.number_orders, v.data?.numbers, v.data?.results, v.data];
  for (const candidate of direct) if (Array.isArray(candidate)) return candidate;
  return [];
};

export default function OtpPage() {
  const [data, setData] = useState<any>(null);
  const [message, setMessage] = useState("Loading number…");
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [cancelError, setCancelError] = useState(false);
  const [toast, setToast] = useState("");
  const [walletBalance,setWalletBalance]=useState("");
  const [reference, setReference] = useState("");
  const [recoveringReference, setRecoveringReference] = useState(false);
  const mounted = useRef(true);
  const seq = useRef(0);
  const statusRequest = useRef<{ reference: string; id: number } | null>(null);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; seq.current++; statusRequest.current = null; };
  }, []);

  function rememberReference(value:string) {
    const recovered = value.trim();
    if (!recovered || typeof window === "undefined") return;
    for (const storageName of ["sessionStorage", "localStorage"] as const) {
      try { window[storageName].setItem("wickspend:lastNumberReference", recovered); }
      catch { /* The URL reference remains authoritative when storage is unavailable. */ }
    }
  }

  async function refresh(silent = false) {
    if (!reference || statusRequest.current?.reference === reference) return;
    const token = getSessionToken();
    if (!token) { setMessage("Please sign in to view this number."); return; }
    const id = ++seq.current;
    statusRequest.current = { reference, id };
    if (!silent) { setBusy(true); setMessage("Checking for OTP…"); }
    try {
      const r: any = await api.numbers.status(token, reference);
      const next = payloadOf(r);
      if (!mounted.current || id !== seq.current) return;
      setData(next && typeof next === "object" ? next : r);
      rememberReference(reference);
      setCancelError(false);
      setMessage("");
    } catch (e) {
      if (mounted.current && id === seq.current) setMessage(e instanceof Error ? e.message : "Unable to refresh number status");
    } finally {
      if (statusRequest.current?.id === id) statusRequest.current = null;
      if (mounted.current && id === seq.current && !silent) setBusy(false);
    }
  }

  useEffect(() => {
    if (!reference) {
      const requestedReference = new URLSearchParams(window.location.search).get("reference")?.trim() || "";
      if (requestedReference) {
        setReference(requestedReference);
        return;
      }
      const token = getSessionToken();
      setMessage("");
      if (!token) return;
      let remembered = "";
      if (typeof window !== "undefined") {
        for (const storageName of ["sessionStorage", "localStorage"] as const) {
          try { remembered = window[storageName].getItem("wickspend:lastNumberReference") || ""; }
          catch { /* Continue to the other store or authenticated order recovery. */ }
          if (remembered.trim()) break;
        }
      }
      if (remembered.trim()) {
        const recovered = remembered.trim();
        window.history.replaceState({}, "", `/otp?reference=${encodeURIComponent(recovered)}`);
        setReference(recovered);
        return;
      }
      let active = true;
      setRecoveringReference(true);
      Promise.allSettled([api.numbers.active(token), api.orders(token)]).then((results: any[]) => {
        if (!active || !mounted.current) return;
        const activeResponse: any = results[0]?.status === "fulfilled" ? results[0].value : null;
        const ordersResponse: any = results[1]?.status === "fulfilled" ? results[1].value : null;
        const candidates = [...listOf(activeResponse), ...listOf(ordersResponse)].filter((item: any) => {
          const itemReference = referenceOf(item);
          const status = String(item?.status || item?.state || "").toLowerCase();
          const type = String([item?.type,item?.category,item?.product_type,item?.service_type,item?.order_type,item?.service,item?.service_name].filter(Boolean).join(" ")).toLowerCase();
          const looksLikeNumber = Boolean(phoneOf(item)) || /number|sms|otp|activation/.test(type) || /WICKWEB-NUM-/i.test(itemReference);
          const isTerminal = /failed|refunded|cancelled|canceled|rejected|error|completed|complete|expired|delivered|fulfilled/.test(status);
          // Pending provider orders must remain recoverable after a refresh or browser restart.
          // Keep terminal failures excluded; completed orders are only relevant if an OTP exists.
          return itemReference && looksLikeNumber && (!isTerminal || (/completed|complete/.test(status) && Boolean(otpOf(item))));
        });
        const unique = Array.from(new Map(candidates.map((item: any) => [referenceOf(item), item])).values()) as any[];
        unique.sort((a: any,b: any) => timeOf(b) - timeOf(a));
        const newest = unique[0];
        const recovered = newest ? referenceOf(newest) : "";
        if (recovered) {
          rememberReference(recovered);
          window.history.replaceState({}, "", `/otp?reference=${encodeURIComponent(recovered)}`);
          setReference(recovered);
        }
      }).catch(() => {}).finally(() => { if (active && mounted.current) setRecoveringReference(false); });
      return () => { active = false; };
    }
    rememberReference(reference);
    refresh();
    const timer = window.setInterval(() => { refresh(true); }, 5000);
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
        const pending = cancelResult?.provider_pending === true || cancelResult?.code === "CANCEL_STATUS_UNKNOWN" || confirmed?.provider_pending === true;
        setCancelError(!pending);
        setMessage(pending
          ? "Cancellation pending provider confirmation. No refund is confirmed yet; check the order status before trying again."
          : "Cancellation was not confirmed. Refresh before taking another action.");
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
  const waitingNumber = /waiting_number|retrying_number|processing|provider_unknown/i.test(status) || (data?.provider_pending === true && !phoneOf(data));
  const terminal = expired || cancelled || refunded || /failed|complete/i.test(status);
  const displayStatus = waitingNumber ? "Waiting for number" : otp ? "SMS code received" : (terminal ? status.replace(/[_-]/g, " ") : "Waiting for SMS");
  const created = data?.created_at || data?.createdAt || data?.purchased_at || data?.purchase_date;
  const expires = data?.expires_at || data?.expiry_at || data?.expiresAt;
  const refundReference = refundRefOf(data);
  const remaining = (() => {
    if (expired) return "Expired";
    const exp = dateObj(expires);
    if (!exp) return data?.time_remaining || data?.remaining || "—";
    const delta = Math.max(0, exp.getTime() - Date.now());
    const m = Math.floor(delta / 60000), s = Math.floor((delta % 60000) / 1000);
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  })();
  const target = service.toLowerCase().includes("telegram") ? "https://web.telegram.org" : service.toLowerCase().includes("instagram") ? "https://www.instagram.com" : service.toLowerCase().includes("facebook") ? "https://www.facebook.com" : service.toLowerCase().includes("tiktok") ? "https://www.tiktok.com" : "https://web.whatsapp.com";
  const orderLabel=reference?`Order #${reference}`:"Order details";
  const productLabel=`${country} ${service} Number`;

  return <main className="shell appShell">
    <div className={styles.screen} data-otp-screen="true">
      {!reference ? <section className={styles.cancelledSuccess}>
        <h2>{recoveringReference ? "Checking recent number…" : "No active number selected"}</h2>
        <p>{recoveringReference ? "Restoring your latest confirmed number and OTP status." : "Open a number order to view its OTP and status here."}</p>
        <Link href="/orders" className={styles.primary}>View Number Orders</Link>
      </section> : refunded ? <section className={styles.refundedTerminal}>
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
        <Link className={styles.expiredPrimary} href="/buy-number">Buy another number</Link><Link className={styles.expiredSecondary} href="/orders">View order details</Link><a className={styles.expiredSecondary} href="https://t.me/wickspendsupport" target="_blank" rel="noopener noreferrer">Help with expired number</a>
        <div className={styles.expiredNote}><b>Refunds require provider confirmation</b><p>If a refund is approved, it is returned to your WickSpend Wallet.</p></div>
      </section> : <>
      <header className={styles.header}>
        <h1>Your number &amp; SMS code</h1><p>Copy your number, use it in the app, then check here for the code.</p>
        <button className={styles.refreshTop} type="button" disabled={busy || !reference} onClick={() => refresh()}>{busy ? "Checking…" : "Refresh"}</button>
      </header>

      {reference && !data && <section className={styles.emptyRecovery} role="status"><h2>Checking your number…</h2><p>We are restoring the number and SMS status. Check My Orders if it takes longer.</p><Link href="/orders">View my orders</Link></section>}
      {data && !cancelled && <>
        <nav className={styles.otpWorkflow} aria-label="How to use your number"><div><span>1</span><strong>Copy number</strong></div><div><span>2</span><strong>Use in app</strong></div><div><span>3</span><strong>Copy SMS</strong></div></nav>
        <section className={styles.card}>
          <div className={styles.stepHint}>Step 1 · Your number for {service}</div><div className={styles.service}>{service}</div><div className={styles.country}>{country}</div><div className={styles.number}>{phone}</div>
          <div className={styles.status} role="status" aria-live="polite"><span className={styles.statusDot}/><span>{displayStatus}</span></div>
          <button className={styles.copyNumber} type="button" disabled={!phoneOf(data)} onClick={() => copy(phoneOf(data), "Number copied")}>{phoneOf(data) ? "Copy this number" : "Waiting for number"}</button><p className={styles.statusInstruction}>{waitingNumber ? "The provider is assigning your number. We check automatically." : "Enter this number in the selected app, then return here for the verification code."}</p>
        </section>
        <section className={styles.info}>
          <div><small>Time left (if provided)</small><strong>{remaining}</strong></div><div><small>Purchased at</small><strong>{clock(created)}</strong></div>
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
        <div className={styles.actions}><button type="button" disabled={busy} onClick={() => refresh()}>{busy ? "Checking…" : "Refresh"}</button><a href={target} target="_blank" rel="noreferrer">Open Target Site</a>{!terminal && <button type="button" className={styles.cancel} disabled={busy} onClick={() => setConfirm(true)}>Cancel Number</button>}</div>
      </> : <>
        <section className={styles.state}>{waitingNumber ? <><h2>Step 1 · Waiting for number</h2><p>The provider is assigning your number. We check automatically about every 5 seconds.</p><div className={styles.dots}>{[0,1,2,3,4].map(i => <span className={styles.dot} key={i}/>)}</div><div className={styles.listen}>Checking automatically</div></> : otp ? <><div className={styles.listen}>Step 3 · SMS code received</div><div className={styles.digits} aria-label="Received verification code">{otp.replace(/\s/g, "").split("").map((digit,index) => <div className={styles.digit} style={{animationDelay: String(index * 45) + "ms"}} key={index} aria-hidden="true">{digit}</div>)}</div><span className={styles.codeText}>Full code: <strong>{otp}</strong></span><button className={styles.copyOtp} type="button" onClick={() => copy(otp, "SMS code copied")}>Copy full SMS code</button><p className={styles.receivedAgo}>Paste the code into {service}. Return here from My Orders if needed.</p></> : <><h2>Step 2 · Waiting for SMS code</h2><p>Use your number in {service}. Return here to copy the code. We check about every 5 seconds.</p><div className={styles.dots}>{[0,1,2,3,4].map(i => <span className={styles.dot} key={i}/>)}</div><div className={styles.listen}>Still waiting? Tap Refresh to check now.</div></>}</section>
        <div className={styles.actions}><button type="button" disabled={busy} onClick={() => refresh()}>{busy ? "Checking…" : "Refresh"}</button><a href={target} target="_blank" rel="noreferrer">Open Target Site</a>{!terminal && <button type="button" className={styles.cancel} disabled={busy} onClick={() => setConfirm(true)}>Cancel Number</button>}</div>
      </>)}

      {data && !cancelled && !otp && !waitingNumber && !terminal && <section className={styles.helpCard}><h2>No SMS code yet?</h2><p>Check that you entered the correct number in {service}. Keep this page open while waiting. Delivery is not guaranteed.</p><div><button type="button" disabled={busy} onClick={() => refresh()}>{busy ? "Checking…" : "Check for SMS"}</button><Link href="/help-support">Get help</Link></div><small>Only cancel if you no longer need the number. Refunds depend on the provider's confirmed result.</small></section>}
      {message && !cancelled && <p className={`${styles.message} ${/unable|failed|missing|sign in|not confirmed/i.test(message) ? styles.error : ""}`} role="status">{message}</p>}
      {(waitingNumber || (!!data && !otp && !terminal) || cancelError || /unable|failed|not confirmed|error/i.test(message)) && <a className={styles.humanSupport} href="https://t.me/wickspendsupport" target="_blank" rel="noopener noreferrer">Number or OTP not arriving? Contact support on Telegram</a>}
      </>}
    </div>

    {toast && <div className={styles.toast}>{toast}</div>}
    {confirm && data && <div className={styles.confirmBackdrop} onClick={() => !busy && setConfirm(false)}>
      <section className={styles.confirm} role="dialog" aria-modal="true" aria-label="Cancel number" onClick={e => e.stopPropagation()}>
        <h2>Cancel Number?</h2><p>Review refund eligibility before continuing.</p>
        <div className={styles.refundEligibility}><strong>Refund not yet confirmed</strong><span>Cancellation and refund eligibility depend on the provider’s response.</span><div><small>Refund amount</small><b>{refund || "Confirmed after cancellation"}</b></div><em>No refund is shown as completed until cancellation is confirmed.</em></div>
        <button type="button" className={styles.keepButton} disabled={busy} onClick={() => setConfirm(false)}>Keep Number</button>
        <button className={styles.refundButton} type="button" disabled={busy} onClick={cancel}>{busy ? "Requesting cancellation…" : "Request cancellation"}</button>
        <small className={styles.cancelNote}>Cancellation may fail depending on the number status.</small>
      </section>
    </div>}
  </main>;
}