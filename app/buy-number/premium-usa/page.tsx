"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { PageShell } from "@/components/PageShell";
import { api, newRequestKey } from "@/lib/api";
import { getSessionToken } from "@/lib/session";
import { NUMBER_SERVICE_NAMES } from "@/lib/number-service-names";

type PremiumService = {
  code: string;
  name: string;
  price: number | null;
  available: number | null;
};

const BRAND_ICON_SLUGS: Readonly<Record<string, string>> = {
  "google / gmail": "google",
  google: "google",
  gmail: "gmail",
  microsoft: "microsoft",
  apple: "apple",
  snapchat: "snapchat",
  discord: "discord",
  "x / twitter": "x",
  twitter: "x",
  tinder: "tinder",
  uber: "uber",
  netflix: "netflix",
  amazon: "amazon",
  linkedin: "linkedin",
  paypal: "paypal",
  airbnb: "airbnb",
  ebay: "ebay",
  spotify: "spotify",
  alipay: "alipay",
};

function friendlyServiceName(code: string, providedName?: string) {
  const cleanCode = String(code || "").trim();
  const cleanName = String(providedName || "").trim();
  if (cleanName && cleanName.toLowerCase() !== cleanCode.toLowerCase()) return cleanName;
  const known = NUMBER_SERVICE_NAMES[cleanCode.toLowerCase()];
  if (known) return known;
  if (!cleanCode) return "Unknown service";
  const formatted = cleanCode.replace(/[_-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  return cleanCode.length <= 5 ? `Service ${cleanCode.toUpperCase()}` : formatted;
}

function firstFiniteNumber(...values: unknown[]): number | null {
  for (const value of values) {
    const number = Number(value);
    if (value !== null && value !== undefined && value !== "" && Number.isFinite(number)) return number;
  }
  return null;
}

function rowsFromPayload(payload: any): any[] {
  const rows: any[] = [];
  const seen = new Set<any>();

  function visit(value: any, keyHint = "", depth = 0) {
    if (value == null || depth > 5 || (typeof value === "object" && seen.has(value))) return;
    if (typeof value !== "object") return;

    seen.add(value);
    if (Array.isArray(value)) {
      value.forEach((item) => visit(item, "", depth + 1));
      return;
    }

    const explicitCode = value.service_code ?? value.serviceCode ?? value.code ?? value.service_id;
    const hasCatalogFields =
      explicitCode != null ||
      value.service_name != null ||
      value.price_ngn != null ||
      value.available != null;

    if (hasCatalogFields && (explicitCode != null || keyHint)) {
      rows.push(explicitCode != null ? value : { ...value, service_code: keyHint });
      return;
    }

    for (const [key, child] of Object.entries(value)) {
      if (["provider_id", "provider", "api_key", "metadata", "internal", "status", "success", "message", "currency", "country", "country_code", "error"].includes(key.toLowerCase())) continue;
      const nextHint = ["services", "prices", "items", "results", "data", "catalog", "offers"].includes(key.toLowerCase()) ? "" : key;
      visit(child, nextHint, depth + 1);
    }
  }

  visit(payload);
  return rows;
}

function normalizePremiumServices(payload: any): PremiumService[] {
  const rows = rowsFromPayload(payload);
  const byCode = new Map<string, PremiumService>();

  for (const item of rows) {
    if (!item || typeof item !== "object") continue;
    const code = String(item.service_code ?? item.serviceCode ?? item.code ?? item.service_id ?? item.id ?? "").trim();
    if (!code) continue;
    if (["status", "success", "message", "currency", "country", "country_code", "error", "provider", "provider_id", "api_key", "metadata", "internal"].includes(code.toLowerCase())) continue;

    const providedName = String(item.service_name ?? item.serviceName ?? item.name ?? item.title ?? item.service ?? "").trim();
    const price = firstFiniteNumber(item.price_ngn, item.final_price_ngn, item.amount_ngn, item.customer_price_ngn, item.price);
    const available = firstFiniteNumber(item.available, item.stock, item.count, item.quantity, item.availability);
    const key = code.toLowerCase();
    const current = byCode.get(key);

    byCode.set(key, {
      code,
      name: friendlyServiceName(code, providedName || current?.name),
      price: price ?? current?.price ?? null,
      available: available ?? current?.available ?? null,
    });
  }

  return [...byCode.values()].sort((a, b) => a.name.localeCompare(b.name));
}

function money(value: number | null) {
  return value === null
    ? "Price unavailable"
    : new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(value);
}

function ServiceBrandIcon({ service }: { service: string }) {
  const key = service.toLowerCase();
  if (key === "whatsapp") return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="#25D366"/><path d="M7.1 17.3 8 14.9a6.4 6.4 0 1 1 2.3 2.2l-3.2.2Z" fill="none" stroke="#fff" strokeWidth="1.5"/><path d="M9.5 9.2c.2-.4.4-.4.7-.4h.4c.2 0 .4 0 .5.4l.6 1.4c.1.2.1.4-.1.6l-.5.6c-.2.2-.1.4 0 .6.5.9 1.2 1.6 2.1 2 .2.1.4.1.6-.1l.7-.8c.2-.2.4-.2.6-.1l1.4.7c.2.1.4.2.4.4 0 .2-.1 1.1-.7 1.6-.5.5-1.3.7-2 .5-1.2-.3-2.8-1.1-4-2.2-1.5-1.4-2.4-3.1-2.7-4.2-.2-.6.1-1.1.4-1.5l.6-.5Z" fill="#fff"/></svg>;
  if (key === "telegram") return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="#2AABEE"/><path d="m6.8 11.7 9.7-3.8c.5-.2.9.1.7.8l-1.7 7.9c-.1.6-.5.8-1 .5l-2.6-1.9-1.3 1.2c-.1.1-.3.3-.6.3l.2-2.7 4.9-4.4c.2-.2-.1-.3-.3-.1l-6 3.8-2.6-.8c-.6-.2-.6-.6.1-.8Z" fill="#fff"/></svg>;
  if (key === "instagram") return <svg viewBox="0 0 24 24" aria-hidden="true"><defs><linearGradient id="ig-premium" x1="3" y1="21" x2="21" y2="3"><stop stopColor="#FEDA75"/><stop offset=".35" stopColor="#FA7E1E"/><stop offset=".65" stopColor="#D62976"/><stop offset="1" stopColor="#4F5BD5"/></linearGradient></defs><rect x="2" y="2" width="20" height="20" rx="5" fill="url(#ig-premium)"/><circle cx="12" cy="12" r="4" fill="none" stroke="#fff" strokeWidth="1.8"/><circle cx="17.4" cy="6.7" r="1.1" fill="#fff"/></svg>;
  if (key === "facebook") return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="#1877F2"/><path d="M13.4 20v-7h2.4l.4-2.7h-2.8V8.6c0-.8.2-1.3 1.4-1.3h1.5V4.9c-.3 0-1.2-.1-2.2-.1-2.2 0-3.7 1.3-3.7 3.8v1.7H8V13h2.4v7h3Z" fill="#fff"/></svg>;
  if (key === "tiktok") return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2" y="2" width="20" height="20" rx="5" fill="#000"/><path d="M14.2 6c.4 1.8 1.4 2.9 3.2 3.2v2.2c-1.2 0-2.3-.4-3.2-1.1v4.4a4 4 0 1 1-3.5-4v2.2a1.8 1.8 0 1 0 1.3 1.8V6h2.2Z" fill="#fff"/></svg>;
  if (key === "google" || key === "google / gmail") return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="#fff" stroke="#dadce0"/><path d="M19.6 12.2c0-.6-.1-1.2-.2-1.7H12v3h4.2a3.6 3.6 0 0 1-1.6 2.4v2h2.6c1.5-1.4 2.4-3.4 2.4-5.7Z" fill="#4285F4"/><path d="M12 20c2.2 0 4-.7 5.3-1.9l-2.6-2a4.8 4.8 0 0 1-7.1-2.5H4.9v2.1A8 8 0 0 0 12 20Z" fill="#34A853"/><path d="M7.6 13.6a4.8 4.8 0 0 1 0-3.1V8.4H4.9a8 8 0 0 0 0 7.3l2.7-2.1Z" fill="#FBBC05"/><path d="M12 7.3c1.3 0 2.4.4 3.3 1.3l2.5-2.5A8 8 0 0 0 4.9 8.4l2.7 2.1A4.8 4.8 0 0 1 12 7.3Z" fill="#EA4335"/></svg>;
  const slug = BRAND_ICON_SLUGS[key];
  if (slug) return <span aria-hidden="true" style={{width:"100%",height:"100%",borderRadius:"50%",background:"#fff",border:"1px solid #dadce0",display:"grid",placeItems:"center"}}><img src={`https://cdn.simpleicons.org/${slug}`} alt="" width="18" height="18" loading="lazy" style={{display:"block",maxWidth:"65%",maxHeight:"65%"}}/></span>;
  return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="#fff" stroke="#dadce0"/><circle cx="12" cy="12" r="3.5" fill="none" stroke="#6e6e73" strokeWidth="1.5"/><path d="M4.5 12h15M12 4.5c2 2.1 3 4.6 3 7.5s-1 5.4-3 7.5c-2-2.1-3-4.6-3-7.5s1-5.4 3-7.5Z" fill="none" stroke="#6e6e73" strokeWidth="1.2"/></svg>;
}

export default function PremiumUsaPage() {
  const router = useRouter();
  const [services, setServices] = useState<PremiumService[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [buyingCode, setBuyingCode] = useState("");
  const requestKeyRef = useRef<{ serviceCode: string; key: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    const token = getSessionToken();
    if (!token) {
      router.replace("/login");
      return;
    }

    setLoading(true);
    setError("");
    api.numbers.premiumCatalog(token)
      .then((payload: any) => {
        if (cancelled) return;
        setServices(normalizePremiumServices(payload));
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Unable to load Premium USA services. Please try again.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [router]);

  const filteredServices = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return services;
    return services.filter((item) => item.name.toLowerCase().includes(query) || item.code.toLowerCase().includes(query));
  }, [search, services]);

  async function buy(service: PremiumService) {
    if (buyingCode) return;
    const token = getSessionToken();
    if (!token) {
      router.replace("/login");
      return;
    }

    setBuyingCode(service.code);
    setError("");
    try {
      if (!requestKeyRef.current || requestKeyRef.current.serviceCode !== service.code) {
        requestKeyRef.current = { serviceCode: service.code, key: newRequestKey("premium-usa") };
      }
      const result: any = await api.numbers.premiumBuy(token, {
        service_code: service.code,
        request_key: requestKeyRef.current.key,
      });
      const reference = result?.reference || result?.order?.reference || result?.data?.reference;
      if (!reference) throw new Error("The purchase completed but no order reference was returned. Please check Orders.");
      requestKeyRef.current = null;
      router.push(`/otp?reference=${encodeURIComponent(reference)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to purchase this number. Please try again.");
    } finally {
      setBuyingCode("");
    }
  }

  return (
    <PageShell title="Premium USA Number" subtitle="Choose a Premium USA service" back="/buy-number">
      <section className="buyNumberPanel" aria-busy={loading}>
        <div className="selectorCard" aria-label="Country: United States">
          <span className="selectorIcon">🇺🇸</span>
          <span className="selectorCopy"><small>Country</small><strong>United States</strong></span>
        </div>

        <label style={{height:50,border:"1px solid rgba(0,0,0,.1)",borderRadius:17,display:"flex",alignItems:"center",gap:10,padding:"0 14px",background:"rgba(255,255,255,.92)",boxShadow:"0 5px 16px rgba(0,0,0,.045)",backdropFilter:"blur(18px)",WebkitBackdropFilter:"blur(18px)"}}>
          <svg width="19" height="19" viewBox="0 0 24 24" aria-hidden="true" style={{flex:"0 0 auto",color:"#6e6e73"}}><circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="2"/><path d="m16.5 16.5 4 4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search Premium USA services" aria-label="Search Premium USA services" style={{border:0,outline:0,width:"100%",fontSize:16,background:"transparent",color:"#111"}} />
        </label>

        {loading && <p className="buyNumberMessage" role="status">Loading Premium USA services…</p>}
        {!loading && error && <p className="buyNumberMessage" role="alert">{error}</p>}
        {!loading && !error && services.length === 0 && <p className="buyNumberMessage" role="status">No Premium USA services are available right now.</p>}
        {!loading && !error && services.length > 0 && filteredServices.length === 0 && <p className="buyNumberMessage" role="status">No services match your search.</p>}

        {!loading && !error && filteredServices.length > 0 && (
          <div style={{display:"grid",gap:10}}>
            {filteredServices.map((service) => {
              const isBuying = buyingCode === service.code;
              const unavailable = service.available !== null && service.available <= 0;
              const disabled = Boolean(buyingCode) || service.price === null || unavailable;
              return (
                <article key={service.code} className="selectorCard" style={{cursor:"default",display:"grid",gridTemplateColumns:"42px minmax(0,1fr) auto",gap:12,alignItems:"center"}}>
                  <span className="selectorIcon serviceSelectorIcon"><ServiceBrandIcon service={service.name}/></span>
                  <span className="selectorCopy" style={{minWidth:0}}>
                    <small>{service.available === null ? "Available now" : service.available > 0 ? `${service.available.toLocaleString()} available` : "Unavailable"}</small>
                    <strong style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{service.name}</strong>
                    <span style={{fontSize:14,fontWeight:700,color:"#0866F5",marginTop:2}}>{money(service.price)}</span>
                  </span>
                  <button className="priceBuyButton" type="button" disabled={disabled} onClick={() => buy(service)}>{isBuying ? "Buying…" : unavailable ? "Unavailable" : "Buy"}</button>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </PageShell>
  );
}
