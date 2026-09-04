"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BottomNav } from "@/components/BottomNav";
import { api } from "@/lib/api";
import { getSessionToken } from "@/lib/session";

const quickActions = [
  ["☎️", "Buy Number", "/buy-number"],
  ["📱", "Rent Number", "/rent-number"],
  ["🛍️", "Marketplace", "/marketplace"],
  ["📋", "Orders", "/orders"],
] as const;

const services = [
  ["🟢", "WhatsApp", "/buy-number?service=WhatsApp"],
  ["🔵", "Telegram", "/buy-number?service=Telegram"],
  ["🟣", "Instagram", "/buy-number?service=Instagram"],
  ["🔷", "Facebook", "/buy-number?service=Facebook"],
  ["⚫", "TikTok", "/buy-number?service=TikTok"],
  ["🔴", "Google", "/buy-number?service=Google"],
] as const;

const countries = [
  ["🇺🇸", "United States"],
  ["🇬🇧", "United Kingdom"],
  ["🇩🇪", "Germany"],
  ["🇳🇬", "Nigeria"],
  ["🇨🇦", "Canada"],
  ["🇵🇱", "Poland"],
] as const;

const marketplace = [
  ["9PROXY 10 IP", "$4.00"],
  ["Premium Account", "$7.50"],
  ["Residential Proxy", "$8.00"],
] as const;

function resolveBalance(payload: any): number | null {
  const candidates = [
    payload?.balance_ngn,
    payload?.wallet_balance_ngn,
    payload?.wallet?.balance_ngn,
    payload?.data?.balance_ngn,
    payload?.data?.wallet_balance_ngn,
  ];
  for (const value of candidates) {
    const number = Number(value);
    if (Number.isFinite(number)) return number;
  }
  return null;
}

export default function Home() {
  const [balance, setBalance] = useState<number | null>(null);
  const [balanceState, setBalanceState] = useState<"loading" | "ready" | "signed-out" | "error">("loading");
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function loadWallet() {
      const token = getSessionToken();
      if (!token) {
        if (!cancelled) setBalanceState("signed-out");
        return;
      }
      try {
        const data = await api.wallet.get(token);
        if (cancelled) return;
        setBalance(resolveBalance(data));
        setBalanceState("ready");
      } catch {
        if (!cancelled) setBalanceState("error");
      }
    }
    loadWallet();
    return () => { cancelled = true; };
  }, []);

  const balanceLabel = balanceState === "loading" ? "Loading…" : balance !== null ? `₦${balance.toLocaleString()}` : "—";

  return (
    <main className="shell homeShell">
      <header className="homeHeader">
        <div>
          <h1>Good morning, Wisdom</h1>
          <p>Ready when you are.</p>
        </div>
        <div className="headerActions">
          <Link href="/notifications" className="circle" aria-label="Notifications">🔔</Link>
          <Link href="/profile" className="avatar" aria-label="Profile">W</Link>
        </div>
      </header>

      <section className="balanceCard homeBalanceCard">
        <p className="balanceLabel">Available Balance <span>◉</span></p>
        <strong>{hidden ? "••••••" : balanceLabel}</strong>
        <p className="preferredCurrency">Preferred Currency&nbsp; • &nbsp;NGN</p>
        {balanceState === "signed-out" && <small className="statusText">Sign in to view your balance.</small>}
        {balanceState === "error" && <small className="statusText">Balance unavailable right now.</small>}
        <div className="balanceActions">
          <Link href="/add-funds" className="homePrimaryButton">Add Funds</Link>
          <button type="button" className="homeSecondaryButton" onClick={() => setHidden((value) => !value)}>{hidden ? "Show" : "Hide"}</button>
        </div>
      </section>

      <section>
        <div className="sectionTitle homeSectionTitle"><h2>Quick Actions</h2></div>
        <div className="actionGrid homeActionGrid">
          {quickActions.map(([icon, label, href]) => (
            <Link href={href} className="quickActionCard" key={href}><span>{icon}</span><b>{label}</b></Link>
          ))}
        </div>
      </section>

      <section>
        <div className="sectionTitle homeSectionTitle"><h2>Active Service</h2></div>
        <div className="activeServiceCard">
          <p className="activeServiceName">Telegram</p>
          <strong>+1 (986) 240-0130</strong>
          <div className="activeServiceFooter">
            <div><b>Waiting for SMS</b><small>18:42 remaining</small></div>
            <Link href="/orders" className="activeServiceButton">View OTP</Link>
          </div>
        </div>
      </section>

      <section>
        <div className="sectionTitle homeSectionTitle"><h2>Popular Services</h2></div>
        <div className="serviceGrid">
          {services.map(([icon, label, href]) => (
            <Link href={href} className="serviceChip" key={label}><span>{icon}</span><b>{label}</b></Link>
          ))}
        </div>
      </section>

      <section>
        <div className="sectionTitle homeSectionTitle"><h2>Popular Countries</h2></div>
        <div className="countryGrid">
          {countries.map(([flag, name]) => (
            <Link href={`/buy-number?country=${encodeURIComponent(name)}`} className="countryChip" key={name}><span>{flag}</span><b>{name}</b></Link>
          ))}
        </div>
      </section>

      <section>
        <div className="sectionTitle homeSectionTitle marketHeading"><h2>Recommended Marketplace</h2><Link href="/marketplace">View all ›</Link></div>
        <div className="marketList">
          {marketplace.map(([name, price]) => (
            <div className="marketItem" key={name}>
              <div><b>{name}</b><small>{price}</small></div>
              <Link href="/marketplace" className="marketBuy">Buy</Link>
            </div>
          ))}
        </div>
      </section>

      <section className="recentSection">
        <div className="sectionTitle homeSectionTitle"><h2>Recent Activity</h2></div>
        <div className="recentCard">
          <div><span>📱</span><p><b>Telegram number</b><small>Completed</small></p><strong>₦1,300</strong></div>
          <div><span>💰</span><p><b>Wallet funding</b><small>Successful</small></p><strong>₦5,000</strong></div>
          <div><span>📈</span><p><b>Boostly order</b><small>Processing</small></p><strong>₦2,500</strong></div>
        </div>
      </section>

      <BottomNav />
    </main>
  );
}
