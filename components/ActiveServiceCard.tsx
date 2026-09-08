"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import styles from "./active-service-card.module.css";

type ActiveServiceCardProps = {
  active: any;
};

function readOtp(active: any) {
  return active?.otp ?? active?.code ?? active?.sms_code ?? active?.verification_code ?? active?.message ?? "";
}

function expiryLabel(value: any) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : `Expires ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
}

export function ActiveServiceCard({ active }: ActiveServiceCardProps) {
  const [displayed, setDisplayed] = useState(active);
  const [exiting, setExiting] = useState(false);
  const [otpPulse, setOtpPulse] = useState(false);
  const previousOtp = useRef(readOtp(active));

  useEffect(() => {
    if (active) {
      setDisplayed(active);
      setExiting(false);
      const nextOtp = readOtp(active);
      if (nextOtp && nextOtp !== previousOtp.current) {
        setOtpPulse(true);
        const timer = window.setTimeout(() => setOtpPulse(false), 1500);
        previousOtp.current = nextOtp;
        return () => window.clearTimeout(timer);
      }
      previousOtp.current = nextOtp;
      return;
    }

    if (displayed) {
      setExiting(true);
      const timer = window.setTimeout(() => {
        setDisplayed(null);
        setExiting(false);
      }, 320);
      return () => window.clearTimeout(timer);
    }
  }, [active, displayed]);

  const data = active || displayed;
  const hasActive = Boolean(data);

  const view = useMemo(() => {
    if (!data) return null;
    const number = data?.phone_number || data?.number || data?.phone || "";
    const service = data?.service_name || data?.service || data?.service_code || "Active number";
    const status = data?.status || "Status unavailable";
    const reference = data?.reference || data?.order_reference || data?.ref || "";
    const expires = expiryLabel(data?.expires_at);
    return { number, service, status, reference, expires };
  }, [data]);

  if (!hasActive || !view) {
    return (
      <div className="activeServiceCard">
        <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 4 }}>
          <img src="/icons/services/tiktok.svg" alt="TikTok" width="18" height="18" style={{ display: "block" }} />
          <p className="activeServiceName" style={{ margin: 0 }}>Boostly</p>
        </div>
        <strong>Boost Your TikTok</strong>
        <small style={{ display: "block", marginTop: 5, color: "#74747a", lineHeight: 1.4 }}>Grow your TikTok with fast, affordable services.</small>
        <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginTop: 12 }}>
          {[["TikTok Followers", "Followers"], ["TikTok Likes", "Likes"], ["TikTok Views", "Views"]].map(([label, category]) => (
            <Link key={category} href={`/boostly?platform=TikTok&category=${encodeURIComponent(category)}`} style={{ textDecoration: "none", color: "#111", fontSize: 11, fontWeight: 650, padding: "7px 10px", borderRadius: 12, border: "1px solid rgba(0,0,0,.08)", background: "rgba(255,255,255,.72)" }}>{label}</Link>
          ))}
        </div>
        <div className="activeServiceFooter" style={{ marginTop: 12 }}>
          <div><b>TikTok services</b><small>Live catalog and pricing</small></div>
          <Link href="/boostly?platform=TikTok" className="activeServiceButton">Boost Now</Link>
        </div>
      </div>
    );
  }

  const statusClass = styles.statusActive;
  const href = view.reference ? `/orders?reference=${encodeURIComponent(view.reference)}` : "/orders";

  return (
    <div className={`${styles.wrap} ${exiting ? styles.exiting : ""}`}>
      <div className={`activeServiceCard ${styles.card} ${otpPulse ? styles.otpArrived : ""}`}>
        <span className={styles.shimmer} aria-hidden="true" />
        <p className="activeServiceName">{view.service}</p>
        <strong className={styles.number}>{view.number || "Number active"}</strong>
        <div className="activeServiceFooter">
          <div>
            <b className={styles.statusLine}><span className={`${styles.statusDot} ${statusClass}`} aria-hidden="true" />{view.status}</b>
            <small className={styles.expiry} key={view.expires || view.reference}>{view.expires || (view.reference ? `Ref: ${view.reference}` : "Status from provider unavailable")}</small>
          </div>
          <Link href={href} className={`activeServiceButton ${styles.otpButton} ${otpPulse ? styles.otpButtonAlert : ""}`}>View OTP</Link>
        </div>
      </div>
    </div>
  );
}
