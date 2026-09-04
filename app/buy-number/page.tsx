"use client";

import { FormEvent, useEffect, useState } from "react";
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
  ["✈️", "Telegram", "telegram"],
  ["🟢", "WhatsApp", "whatsapp"],
  ["📸", "Instagram", "instagram"],
  ["♪", "TikTok", "tiktok"],
  ["f", "Facebook", "facebook"],
  ["G", "Google", "google"],
] as const;
const countryCodes: Record<string, string> = Object.fromEntries(countries.map(([, name, code]) => [name, code]));
const serviceCodes: Record<string, string> = Object.fromEntries(services.map(([, name, code]) => [name, code]));
const priceNgn = (p: any) => p?.price_ngn ?? p?.final_price_ngn ?? p?.amount_ngn ?? null;
const walletBalance = (wallet: any) => wallet?.balance_ngn ?? wallet?.wallet_balance_ngn ?? wallet?.balance ?? wallet?.wallet?.balance_ngn ?? wallet?.data?.balance_ngn ?? wallet?.data?.balance;
const money = (value: any) => { const n = Number(value); return Number.isFinite(n) ? `₦${n.toLocaleString()}` : "—"; };

export default function BuyNumberPage() {
  const router = useRouter();
  const [country, setCountry] = useState("Nigeria");
  const [service, setService] = useState("Telegram");
  const [prices, setPrices] = useState<any[]>([]);
  const [message, setMessage] = useState("");
  const [buying, setBuying] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [balance, setBalance] = useState("—");

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
    return () => { cancelled = true; };
  }, []);

  async function load(e: FormEvent) {
    e.preventDefault();
    if (buying) return;
    setMessage("Checking live prices…");
    try {
      const data: any = await api.numbers.prices("", countryCodes[country] || country, serviceCodes[service] || service);
      const list = Array.isArray(data) ? data : (data?.prices || data?.items || data?.data || []);
      const parsed = Array.isArray(list) ? list : [];
      setPrices(parsed);
      setMessage(parsed.length ? "" : "No numbers are available for this selection right now.");
      setSheetOpen(parsed.length > 0);
    } catch (err) {
      setPrices([]);
      setSheetOpen(false);
      setMessage(err instanceof Error ? err.message : "Unable to load prices");
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
      router.push(reference ? `/orders?reference=${encodeURIComponent(reference)}` : "/orders");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Unable to purchase this number");
    } finally {
      setBuying(false);
    }
  }

  const selectedCountry = countries.find(([, name]) => name === country);
  const selectedService = services.find(([, name]) => name === service);

  return (
    <PageShell title="Buy Number" subtitle="Choose a country and service">
      <form className="buyNumberPanel" onSubmit={load}>
        <button type="button" className="selectorCard" onClick={() => document.getElementById("countrySelect")?.focus()}>
          <span className="selectorIcon">{selectedCountry?.[0]}</span>
          <span className="selectorCopy"><small>Country</small><strong>{country}</strong></span>
          <span className="selectorChevron">⌄</span>
          <select id="countrySelect" aria-label="Country" value={country} onChange={(e) => setCountry(e.target.value)}>
            {countries.map(([, name]) => <option key={name}>{name}</option>)}
          </select>
        </button>

        <button type="button" className="selectorCard" onClick={() => document.getElementById("serviceSelect")?.focus()}>
          <span className="selectorIcon serviceSelectorIcon">{selectedService?.[0]}</span>
          <span className="selectorCopy"><small>Service</small><strong>{service}</strong></span>
          <span className="selectorChevron">⌄</span>
          <select id="serviceSelect" aria-label="Service" value={service} onChange={(e) => setService(e.target.value)}>
            {services.map(([, name]) => <option key={name}>{name}</option>)}
          </select>
        </button>

        <div className="purchaseSummary">
          <div><small>Wallet</small><strong>{balance}</strong></div>
          <div><small>Validity</small><strong>20 min</strong></div>
          <div><small>Avg. wait</small><strong>1–5 min</strong></div>
        </div>

        <button className="buyNumberCta" type="submit">View Prices</button>
        {message && <p className="buyNumberMessage" role="status">{message}</p>}
      </form>

      {sheetOpen && prices.length > 0 && (
        <div className="sheetBackdrop" role="presentation" onClick={() => setSheetOpen(false)}>
          <section className="priceSheet" role="dialog" aria-modal="true" aria-label="Choose a number" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="sheetHandle" aria-label="Close" onClick={() => setSheetOpen(false)} />
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
