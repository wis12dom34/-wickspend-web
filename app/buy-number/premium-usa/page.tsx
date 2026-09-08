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
  const wrappers = new Set(["services", "prices", "items", "results", "data", "catalog", "offers"]);
  const ignored = new Set(["provider_id", "provider", "api_key", "metadata", "internal", "status", "success", "message", "currency", "country", "country_code", "error", "ok"]);

  function visit(value: any, keyHint = "", depth = 0) {
    if (value == null || depth > 7) return;
    if (Array.isArray(value)) { value.forEach((item) => visit(item, "", depth + 1)); return; }
    if (typeof value !== "object") {
      if (keyHint && !ignored.has(keyHint.toLowerCase())) {
        const numeric = Number(value);
        if (Number.isFinite(numeric)) rows.push({ service_code: keyHint, price_ngn: numeric });
      }
      return;
    }
    if (seen.has(value)) return;
    seen.add(value);

    const explicitCode = value.service_code ?? value.serviceCode ?? value.code ?? value.service_id;
    const hasCatalogFields = explicitCode != null || value.service_name != null || value.price_ngn != null || value.available != null;
    if (hasCatalogFields && (explicitCode != null || keyHint)) rows.push(explicitCode != null ? value : { ...value, service_code: keyHint });

    for (const [key, child] of Object.entries(value)) {
      const lower = key.toLowerCase();
      if (ignored.has(lower)) continue;
      if (["service_code", "servicecode", "code", "service_id", "service_name", "servicename", "name", "title", "service", "price_ngn", "final_price_ngn", "amount_ngn", "customer_price_ngn", "price", "available", "stock", "count", "quantity", "availability"].includes(lower)) continue;
      visit(child, wrappers.has(lower) ? "" : key, depth + 1);
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

const SIMPLE_ICON_ALIASES: Readonly<Record<string, string>> = {
  aol: "aol",
  bankamerica: "bankofamerica",
  battlenet: "battledotnet",
  cashapp: "cashapp",
  chatgpt: "openai",
  chime: "chime",
  cleartrip: "cleartrip",
  doordash: "doordash",
  facebook: "facebook",
  github: "github",
  google: "google",
  googlechat: "googlechat",
  googlemessenger: "googlemessages",
  googlevoice: "googlevoice",
  instagram: "instagram",
  linkedin: "linkedin",
  microsoft: "microsoft",
  moneylion: "moneylion",
  paypal: "paypal",
  pof: "pof",
  protonmail: "protonmail",
  snapchat: "snapchat",
  telegram: "telegram",
  tiktok: "tiktok",
  twitter: "x",
  venmo: "venmo",
  whatsapp: "whatsapp",
  x: "x",
};

function iconSlug(value: string) {
  const base = value
    .trim()
    .toLowerCase()
    .replace(/_(du|sm|re|canada|co)$/i, "")
    .replace(/[^a-z0-9]/g, "");
  return SIMPLE_ICON_ALIASES[base] || base;
}

function ServiceBrandIcon({ code, service }: { code: string; service: string }) {
  const candidates = [...new Set([iconSlug(code), iconSlug(service)].filter(Boolean))];
  const [candidateIndex, setCandidateIndex] = useState(0);
  const slug = candidates[candidateIndex];

  if (!slug) {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="#fff" stroke="#dadce0"/><path d="M7 12h10M12 7v10" stroke="#6e6e73" strokeWidth="1.4" strokeLinecap="round"/></svg>;
  }

  return (
    <span aria-hidden="true" style={{width:"100%",height:"100%",borderRadius:"50%",background:"#fff",border:"1px solid #e5e7eb",display:"grid",placeItems:"center",overflow:"hidden"}}>
      <img
        src={`https://cdn.simpleicons.org/${encodeURIComponent(slug)}`}
        alt=""
        width="22"
        height="22"
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={() => setCandidateIndex((index) => index + 1)}
        style={{display:"block",width:"62%",height:"62%",objectFit:"contain"}}
      />
    </span>
  );
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
      window.sessionStorage.setItem("wickspend:lastNumberReference", reference);
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
                  <span className="selectorIcon serviceSelectorIcon"><ServiceBrandIcon code={service.code} service={service.name}/></span>
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
