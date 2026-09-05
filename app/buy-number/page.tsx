"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { PageShell } from "@/components/PageShell";
import { api } from "@/lib/api";
import { getSessionToken } from "@/lib/session";

const countries = [
  ["🇳🇬", "Nigeria", "NG"],
  ["🇺🇸", "USA", "US"],
  ["🇬🇧", "UK", "GB"],
  ["🇩🇪", "Germany", "DE"],
  ["🇨🇦", "Canada", "CA"],
  ["🇵🇱", "Poland", "PL"],
] as const;
const services = [
  ["Telegram", "telegram"],
  ["WhatsApp", "whatsapp"],
  ["Instagram", "instagram"],
  ["TikTok", "tiktok"],
  ["Facebook", "facebook"],
  ["Google", "google"],
] as const;
const countryCodes: Record<string, string> = Object.fromEntries(countries.map(([, name, code]) => [name, code]));
const serviceCodes: Record<string, string> = Object.fromEntries(services.map(([name, code]) => [name, code]));
const priceNgn = (p: any) => p?.price_ngn ?? p?.final_price_ngn ?? p?.amount_ngn ?? null;
const walletBalance = (wallet: any) => wallet?.balance_ngn ?? wallet?.wallet_balance_ngn ?? wallet?.balance ?? wallet?.wallet?.balance_ngn ?? wallet?.data?.balance_ngn ?? wallet?.data?.balance;
const money = (value: any) => { const n = Number(value); return Number.isFinite(n) ? `₦${n.toLocaleString()}` : "—"; };

function ServiceBrandIcon({ service }: { service: string }) {
  const key = service.toLowerCase();
  if (key === "whatsapp") return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="#25D366"/><path d="M7.1 17.3 8 14.9a6.4 6.4 0 1 1 2.3 2.2l-3.2.2Z" fill="none" stroke="#fff" strokeWidth="1.5"/><path d="M9.5 9.2c.2-.4.4-.4.7-.4h.4c.2 0 .4 0 .5.4l.6 1.4c.1.2.1.4-.1.6l-.5.6c-.2.2-.1.4 0 .6.5.9 1.2 1.6 2.1 2 .2.1.4.1.6-.1l.7-.8c.2-.2.4-.2.6-.1l1.4.7c.2.1.4.2.4.4 0 .2-.1 1.1-.7 1.6-.5.5-1.3.7-2 .5-1.2-.3-2.8-1.1-4-2.2-1.5-1.4-2.4-3.1-2.7-4.2-.2-.6.1-1.1.4-1.5l.6-.5Z" fill="#fff"/></svg>;
  if (key === "telegram") return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="#2AABEE"/><path d="m6.8 11.7 9.7-3.8c.5-.2.9.1.7.8l-1.7 7.9c-.1.6-.5.8-1 .5l-2.6-1.9-1.3 1.2c-.1.1-.3.3-.6.3l.2-2.7 4.9-4.4c.2-.2-.1-.3-.3-.1l-6 3.8-2.6-.8c-.6-.2-.6-.6.1-.8Z" fill="#fff"/></svg>;
  if (key === "instagram") return <svg viewBox="0 0 24 24" aria-hidden="true"><defs><linearGradient id="ig-buy" x1="3" y1="21" x2="21" y2="3"><stop stopColor="#FEDA75"/><stop offset=".35" stopColor="#FA7E1E"/><stop offset=".65" stopColor="#D62976"/><stop offset="1" stopColor="#4F5BD5"/></linearGradient></defs><rect x="2" y="2" width="20" height="20" rx="5" fill="url(#ig-buy)"/><circle cx="12" cy="12" r="4" fill="none" stroke="#fff" strokeWidth="1.8"/><circle cx="17.4" cy="6.7" r="1.1" fill="#fff"/></svg>;
  if (key === "facebook") return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="#1877F2"/><path d="M13.4 20v-7h2.4l.4-2.7h-2.8V8.6c0-.8.2-1.3 1.4-1.3h1.5V4.9c-.3 0-1.2-.1-2.2-.1-2.2 0-3.7 1.3-3.7 3.8v1.7H8V13h2.4v7h3Z" fill="#fff"/></svg>;
  if (key === "tiktok") return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2" y="2" width="20" height="20" rx="5" fill="#000"/><path d="M14.2 6c.4 1.8 1.4 2.9 3.2 3.2v2.2c-1.2 0-2.3-.4-3.2-1.1v4.4a4 4 0 1 1-3.5-4v2.2a1.8 1.8 0 1 0 1.3 1.8V6h2.2Z" fill="#fff"/></svg>;
  return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="#fff" stroke="#dadce0"/><path d="M19.6 12.2c0-.6-.1-1.2-.2-1.7H12v3h4.2a3.6 3.6 0 0 1-1.6 2.4v2h2.6c1.5-1.4 2.4-3.4 2.4-5.7Z" fill="#4285F4"/><path d="M12 20c2.2 0 4-.7 5.3-1.9l-2.6-2a4.8 4.8 0 0 1-7.1-2.5H4.9v2.1A8 8 0 0 0 12 20Z" fill="#34A853"/><path d="M7.6 13.6a4.8 4.8 0 0 1 0-3.1V8.4H4.9a8 8 0 0 0 0 7.3l2.7-2.1Z" fill="#FBBC05"/><path d="M12 7.3c1.3 0 2.4.4 3.3 1.3l2.5-2.5A8 8 0 0 0 4.9 8.4l2.7 2.1A4.8 4.8 0 0 1 12 7.3Z" fill="#EA4335"/></svg>;
}

export default function BuyNumberPage() {
  const router = useRouter();
  const [country, setCountry] = useState("Nigeria");
  const [service, setService] = useState("Telegram");
  const [prices, setPrices] = useState<any[]>([]);
  const [message, setMessage] = useState("");
  const [buying, setBuying] = useState(false);
  const [loadingPrices, setLoadingPrices] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [balance, setBalance] = useState("—");
  const priceRequest = useRef(0);

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams(window.location.search);
    const requestedCountry = params.get("country");
    const requestedService = params.get("service");
    if (requestedCountry && countryCodes[requestedCountry]) setCountry(requestedCountry);
    if (requestedService && serviceCodes[requestedService]) setService(requestedService);
    const token = getSessionToken();
    if (token) {
      api.wallet.get(token).then((wallet: any) => {
        if (!cancelled) setBalance(money(walletBalance(wallet)));
      }).catch(() => {
        if (!cancelled) setBalance("—");
      });
    }
    return () => { cancelled = true; priceRequest.current++; };
  }, []);

  function resetSelection(next: "country" | "service", value: string) {
    priceRequest.current++;
    setPrices([]);
    setSheetOpen(false);
    setLoadingPrices(false);
    setMessage("");
    if (next === "country") setCountry(value); else setService(value);
  }

  async function load(e: FormEvent) {
    e.preventDefault();
    if (buying || loadingPrices) return;
    const requestId = ++priceRequest.current;
    const selectedCountryCode = countryCodes[country] || country;
    const selectedServiceCode = serviceCodes[service] || service;
    setLoadingPrices(true);
    setSheetOpen(false);
    setMessage("Checking live prices…");
    try {
      const data: any = await api.numbers.prices("", selectedCountryCode, selectedServiceCode);
      if (requestId !== priceRequest.current) return;
      const list = Array.isArray(data) ? data : (data?.prices || data?.items || data?.data || []);
      const parsed = Array.isArray(list) ? list : [];
      setPrices(parsed);
      setMessage(parsed.length ? "" : "No numbers are available for this selection right now.");
      setSheetOpen(parsed.length > 0);
    } catch (err) {
      if (requestId !== priceRequest.current) return;
      setPrices([]);
      setSheetOpen(false);
      setMessage(err instanceof Error ? err.message : "Unable to load prices");
    } finally {
      if (requestId === priceRequest.current) setLoadingPrices(false);
    }
  }

  async function buy() {
    if (buying) return;
    setBuying(true);
    setMessage("Purchasing number…");
    try {
      const token = getSessionToken();
      if (!token) throw new Error("Please sign in first");
      const result: any = await api.numbers.buy(token, {
        country_code: countryCodes[country] || country,
        service_code: serviceCodes[service] || service,
      });
      const reference = result?.reference || result?.order?.reference || result?.data?.reference;
      setMessage("Number purchased successfully.");
      router.push(reference ? `/otp?reference=${encodeURIComponent(reference)}` : "/orders");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Unable to purchase this number");
    } finally {
      setBuying(false);
    }
  }

  const selectedCountry = countries.find(([, name]) => name === country);

  return (
    <PageShell title="Buy Number" subtitle="Choose a country and service">
      <form className="buyNumberPanel" onSubmit={load}>
        <button type="button" className="selectorCard" onClick={() => document.getElementById("countrySelect")?.focus()}>
          <span className="selectorIcon">{selectedCountry?.[0]}</span>
          <span className="selectorCopy"><small>Country</small><strong>{country}</strong></span>
          <span className="selectorChevron">⌄</span>
          <select id="countrySelect" aria-label="Country" value={country} disabled={buying} onChange={(e) => resetSelection("country", e.target.value)}>
            {countries.map(([, name]) => <option key={name}>{name}</option>)}
          </select>
        </button>

        <button type="button" className="selectorCard" onClick={() => document.getElementById("serviceSelect")?.focus()}>
          <span className="selectorIcon serviceSelectorIcon"><ServiceBrandIcon service={service}/></span>
          <span className="selectorCopy"><small>Service</small><strong>{service}</strong></span>
          <span className="selectorChevron">⌄</span>
          <select id="serviceSelect" aria-label="Service" value={service} disabled={buying} onChange={(e) => resetSelection("service", e.target.value)}>
            {services.map(([name]) => <option key={name}>{name}</option>)}
          </select>
        </button>

        <div className="purchaseSummary">
          <div><small>Wallet</small><strong>{balance}</strong></div>
          <div><small>Validity</small><strong>20 min</strong></div>
          <div><small>Avg. wait</small><strong>1–5 min</strong></div>
        </div>

        <button className="buyNumberCta" type="submit" disabled={buying || loadingPrices}>{loadingPrices ? "Checking…" : "View Prices"}</button>
        {message && <p className="buyNumberMessage" role="status">{message}</p>}
      </form>

      {sheetOpen && prices.length > 0 && (
        <div className="sheetBackdrop" role="presentation" onClick={() => !buying && setSheetOpen(false)}>
          <section className="priceSheet" role="dialog" aria-modal="true" aria-label="Choose a number" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="sheetHandle" aria-label="Close" disabled={buying} onClick={() => setSheetOpen(false)} />
            <div className="priceSheetHeading">
              <h2>Choose a number</h2>
              <p>Select the best price for your purchase.</p>
            </div>
            <div className="priceSheetList">
              {prices.map((p: any, i) => {
                const rawPrice = priceNgn(p);
                const formattedPrice = rawPrice != null && Number.isFinite(Number(rawPrice)) ? `₦${Number(rawPrice).toLocaleString()}` : "Price at checkout";
                return (
                  <div className="priceRow" key={p.id || p.service_code || i}>
                    <div>
                      <strong>{formattedPrice}</strong>
                      <small>{p.available ?? p.stock ?? "Available"}</small>
                    </div>
                    <button className="priceBuyButton" type="button" disabled={buying} onClick={buy}>{buying ? "Buying…" : "Buy Number"}</button>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      )}
    </PageShell>
  );
}
