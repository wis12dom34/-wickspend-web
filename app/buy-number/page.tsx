"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { PageShell } from "@/components/PageShell";
import { api } from "@/lib/api";
import { getSessionToken } from "@/lib/session";
import { NUMBER_SERVICE_NAMES } from "@/lib/number-service-names";

type CountryOption = { flag: string; name: string; code: string; iso?: string };
type ServiceOption = { name: string; code: string };

const fallbackCountries: CountryOption[] = [
  { flag: "🇳🇬", name: "Nigeria", code: "19", iso: "NG" },
  { flag: "🇺🇸", name: "United States", code: "187", iso: "US" },
  { flag: "🇬🇧", name: "United Kingdom", code: "16", iso: "GB" },
  { flag: "🇩🇪", name: "Germany", code: "43", iso: "DE" },
  { flag: "🇨🇦", name: "Canada", code: "36", iso: "CA" },
  { flag: "🇵🇱", name: "Poland", code: "15", iso: "PL" },
];

const POPULAR_SERVICE_ORDER = ["WhatsApp", "Telegram", "Instagram", "Facebook", "TikTok", "Google / Gmail"];
const POPULAR_SERVICE_RANK = new Map(POPULAR_SERVICE_ORDER.map((name, index) => [name.toLowerCase(), index]));

const BRAND_ICON_SLUGS: Readonly<Record<string, string>> = {
  "google / gmail": "google",
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
  const known = NUMBER_SERVICE_NAMES[cleanCode.toLowerCase()];
  if (known) return known;
  if (cleanName && cleanName.toLowerCase() !== cleanCode.toLowerCase()) return cleanName;
  if (!cleanCode) return "Unknown service";
  const formatted = cleanCode.replace(/[_-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  return cleanCode.length <= 5 ? `Service ${cleanCode.toUpperCase()}` : formatted;
}

const priceNgn = (p: any) => p?.price_ngn ?? p?.final_price_ngn ?? p?.amount_ngn ?? p?.price ?? p?.cost_ngn ?? null;
const walletBalance = (wallet: any) => wallet?.balance_ngn ?? wallet?.wallet_balance_ngn ?? wallet?.balance ?? wallet?.wallet?.balance_ngn ?? wallet?.data?.balance_ngn ?? wallet?.data?.balance;
const money = (value: any) => { const n = Number(value); return Number.isFinite(n) ? `₦${n.toLocaleString()}` : "—"; };

function isoFlag(iso?: string) {
  const code = String(iso || "").trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(code)) return "🌐";
  return String.fromCodePoint(...[...code].map((char) => 127397 + char.charCodeAt(0)));
}

function firstArray(...values: any[]): any[] {
  for (const value of values) if (Array.isArray(value)) return value;
  return [];
}

function normalizeCountries(payload: any): CountryOption[] {
  const raw = firstArray(
    payload,
    payload?.countries,
    payload?.data?.countries,
    payload?.data,
    payload?.items,
    payload?.results,
    payload?.catalog?.countries,
    payload?.catalog
  );
  const seen = new Set<string>();
  return raw.flatMap((item: any) => {
    const name = String(item?.country_name ?? item?.countryName ?? item?.name ?? item?.title ?? "").trim();
    const code = String(item?.country_code ?? item?.countryCode ?? item?.code ?? item?.id ?? item?.country_id ?? "").trim();
    const iso = String(item?.iso_code ?? item?.iso ?? item?.alpha2 ?? item?.country_iso ?? "").trim().toUpperCase();
    if (!name || !code || seen.has(code)) return [];
    seen.add(code);
    return [{ flag: String(item?.flag || isoFlag(iso)), name, code, iso }];
  });
}

function normalizeServices(payload: any): ServiceOption[] {
  const raw = firstArray(
    payload?.services,
    payload?.data?.services,
    payload?.catalog?.services,
    payload?.data?.items,
    payload?.items,
    payload?.results,
    payload?.data,
    payload
  );
  const seen = new Set<string>();
  return raw.flatMap((item: any) => {
    const code = String(item?.service_code ?? item?.serviceCode ?? item?.code ?? item?.service_id ?? item?.id ?? "").trim();
    if (!code) return [];
    const key = code.toLowerCase();
    if (seen.has(key)) return [];
    seen.add(key);
    const providedName = String(item?.service_name ?? item?.serviceName ?? item?.name ?? item?.title ?? item?.service ?? "").trim();
    return [{ name: friendlyServiceName(code, providedName), code }];
  }).sort((a, b) => {
    const aRank = POPULAR_SERVICE_RANK.get(a.name.toLowerCase()) ?? Number.MAX_SAFE_INTEGER;
    const bRank = POPULAR_SERVICE_RANK.get(b.name.toLowerCase()) ?? Number.MAX_SAFE_INTEGER;
    return aRank - bRank || a.name.localeCompare(b.name);
  });
}

function normalizePrices(payload: any): any[] {
  const direct = firstArray(
    payload,
    payload?.prices,
    payload?.data?.prices,
    payload?.data?.items,
    payload?.data,
    payload?.items,
    payload?.results,
    payload?.offers,
    payload?.catalog?.prices
  );
  if (direct.length) return direct;

  const candidates = [payload?.prices, payload?.data?.prices, payload?.data, payload?.items, payload?.results];
  for (const candidate of candidates) {
    if (candidate && typeof candidate === "object" && !Array.isArray(candidate)) {
      const values = Object.values(candidate);
      if (values.length && values.every((value) => value && typeof value === "object")) return values;
    }
  }
  return [];
}

function ServiceBrandIcon({ service }: { service: string }) {
  const key = service.toLowerCase();
  if (key === "whatsapp") return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="#25D366"/><path d="M7.1 17.3 8 14.9a6.4 6.4 0 1 1 2.3 2.2l-3.2.2Z" fill="none" stroke="#fff" strokeWidth="1.5"/><path d="M9.5 9.2c.2-.4.4-.4.7-.4h.4c.2 0 .4 0 .5.4l.6 1.4c.1.2.1.4-.1.6l-.5.6c-.2.2-.1.4 0 .6.5.9 1.2 1.6 2.1 2 .2.1.4.1.6-.1l.7-.8c.2-.2.4-.2.6-.1l1.4.7c.2.1.4.2.4.4 0 .2-.1 1.1-.7 1.6-.5.5-1.3.7-2 .5-1.2-.3-2.8-1.1-4-2.2-1.5-1.4-2.4-3.1-2.7-4.2-.2-.6.1-1.1.4-1.5l.6-.5Z" fill="#fff"/></svg>;
  if (key === "telegram") return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="#2AABEE"/><path d="m6.8 11.7 9.7-3.8c.5-.2.9.1.7.8l-1.7 7.9c-.1.6-.5.8-1 .5l-2.6-1.9-1.3 1.2c-.1.1-.3.3-.6.3l.2-2.7 4.9-4.4c.2-.2-.1-.3-.3-.1l-6 3.8-2.6-.8c-.6-.2-.6-.6.1-.8Z" fill="#fff"/></svg>;
  if (key === "instagram") return <svg viewBox="0 0 24 24" aria-hidden="true"><defs><linearGradient id="ig-buy" x1="3" y1="21" x2="21" y2="3"><stop stopColor="#FEDA75"/><stop offset=".35" stopColor="#FA7E1E"/><stop offset=".65" stopColor="#D62976"/><stop offset="1" stopColor="#4F5BD5"/></linearGradient></defs><rect x="2" y="2" width="20" height="20" rx="5" fill="url(#ig-buy)"/><circle cx="12" cy="12" r="4" fill="none" stroke="#fff" strokeWidth="1.8"/><circle cx="17.4" cy="6.7" r="1.1" fill="#fff"/></svg>;
  if (key === "facebook") return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="#1877F2"/><path d="M13.4 20v-7h2.4l.4-2.7h-2.8V8.6c0-.8.2-1.3 1.4-1.3h1.5V4.9c-.3 0-1.2-.1-2.2-.1-2.2 0-3.7 1.3-3.7 3.8v1.7H8V13h2.4v7h3Z" fill="#fff"/></svg>;
  if (key === "tiktok") return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2" y="2" width="20" height="20" rx="5" fill="#000"/><path d="M14.2 6c.4 1.8 1.4 2.9 3.2 3.2v2.2c-1.2 0-2.3-.4-3.2-1.1v4.4a4 4 0 1 1-3.5-4v2.2a1.8 1.8 0 1 0 1.3 1.8V6h2.2Z" fill="#fff"/></svg>;
  if (key === "google" || key === "google / gmail") return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="#fff" stroke="#dadce0"/><path d="M19.6 12.2c0-.6-.1-1.2-.2-1.7H12v3h4.2a3.6 3.6 0 0 1-1.6 2.4v2h2.6c1.5-1.4 2.4-3.4 2.4-5.7Z" fill="#4285F4"/><path d="M12 20c2.2 0 4-.7 5.3-1.9l-2.6-2a4.8 4.8 0 0 1-7.1-2.5H4.9v2.1A8 8 0 0 0 12 20Z" fill="#34A853"/><path d="M7.6 13.6a4.8 4.8 0 0 1 0-3.1V8.4H4.9a8 8 0 0 0 0 7.3l2.7-2.1Z" fill="#FBBC05"/><path d="M12 7.3c1.3 0 2.4.4 3.3 1.3l2.5-2.5A8 8 0 0 0 4.9 8.4l2.7 2.1A4.8 4.8 0 0 1 12 7.3Z" fill="#EA4335"/></svg>;
  const brandSlug = BRAND_ICON_SLUGS[key];
  if (brandSlug) return <span aria-hidden="true" style={{width:"100%",height:"100%",borderRadius:"50%",background:"#fff",border:"1px solid #dadce0",display:"grid",placeItems:"center"}}><img src={`https://cdn.simpleicons.org/${brandSlug}`} alt="" width="18" height="18" loading="lazy" style={{display:"block",maxWidth:"65%",maxHeight:"65%"}}/></span>;
  return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="#fff" stroke="#dadce0"/><circle cx="12" cy="12" r="3.5" fill="none" stroke="#6e6e73" strokeWidth="1.5"/><path d="M4.5 12h15M12 4.5c2 2.1 3 4.6 3 7.5s-1 5.4-3 7.5c-2-2.1-3-4.6-3-7.5s1-5.4 3-7.5Z" fill="none" stroke="#6e6e73" strokeWidth="1.2"/></svg>;
}

export default function BuyNumberPage() {
  const router = useRouter();
  const [premium, setPremium] = useState(false);
  const [countries, setCountries] = useState<CountryOption[]>(fallbackCountries);
  const [serviceOptions, setServiceOptions] = useState<ServiceOption[]>([]);
  const [country, setCountry] = useState("19");
  const [service, setService] = useState("telegram");
  const [prices, setPrices] = useState<any[]>([]);
  const [message, setMessage] = useState("");
  const [buying, setBuying] = useState(false);
  const [loadingPrices, setLoadingPrices] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [balance, setBalance] = useState("—");
  const [picker, setPicker] = useState<"country" | "service" | null>(null);
  const [search, setSearch] = useState("");
  const [loadingServices, setLoadingServices] = useState(false);
  const priceRequest = useRef(0);

  useEffect(() => { setPremium(new URLSearchParams(window.location.search).get("premium") === "1"); }, []);

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams(window.location.search);
    const requestedCountry = params.get("country");
    const token = getSessionToken();
    if (premium) {
      setCountries([{ flag: "🇺🇸", name: "United States", code: "US", iso: "US" }]);
      setCountry("US");
      if (token) {
        setLoadingServices(true);
        api.numbers.premiumCatalog(token).then((data: any) => {
          if (cancelled) return;
          const next = normalizeServices(data);
          setServiceOptions(next);
          if (next.length) setService(next[0].name);
        }).catch((err) => { if (!cancelled) setMessage(err instanceof Error ? err.message : "Unable to load Premium USA services."); })
          .finally(() => { if (!cancelled) setLoadingServices(false); });
      }
    } else api.numbers.countries().then((data: any) => {
      if (cancelled) return;
      const next = normalizeCountries(data);
      if (!next.length) return;
      setCountries(next);
      const requested = String(requestedCountry || "").toLowerCase();
      const match = next.find((item) => item.code === requestedCountry || item.iso?.toLowerCase() === requested || item.name.toLowerCase() === requested || (requested === "usa" && item.iso === "US") || (requested === "uk" && item.iso === "GB"));
      setCountry(match?.code || next.find((item) => item.name.toLowerCase() === "nigeria")?.code || next[0].code);
    }).catch(() => {});
    if (token) {
      api.wallet.get(token).then((wallet: any) => {
        if (!cancelled) setBalance(money(walletBalance(wallet)));
      }).catch(() => {
        if (!cancelled) setBalance("—");
      });
    }
    return () => { cancelled = true; priceRequest.current++; };
  }, [premium]);

  useEffect(() => {
    if (premium || !country) return;
    let cancelled = false;
    setLoadingServices(true);
    api.numbers.services("", country).then((data: any) => {
      if (cancelled) return;
      const next = normalizeServices(data);
      if (!next.length) return;
      setServiceOptions(next);
      const requested = typeof window !== "undefined" ? String(new URLSearchParams(window.location.search).get("service") || "").toLowerCase() : "";
      setService((current) => {
        const currentMatch = next.find((item) => item.code.toLowerCase() === current.toLowerCase() || item.name.toLowerCase() === current.toLowerCase());
        const requestedMatch = requested ? next.find((item) => item.name.toLowerCase() === requested || item.code.toLowerCase() === requested) : undefined;
        return requestedMatch?.code || currentMatch?.code || next[0].code;
      });
    }).catch(() => {
      if (!cancelled) { setServiceOptions([]); setMessage("Unable to load services. Please try again."); }
    }).finally(() => {
      if (!cancelled) setLoadingServices(false);
    });
    return () => { cancelled = true; };
  }, [country, premium]);

  function currentServiceCode() {
    return service;
  }

  function resetSelection(next: "country" | "service", value: string) {
    priceRequest.current++;
    setPrices([]);
    setSheetOpen(false);
    setLoadingPrices(false);
    setMessage("");
    if (next === "country") setCountry(value); else setService(value);
  }

  function openPicker(type: "country" | "service") {
    if (buying || (premium && type === "country")) return;
    setSearch("");
    setPicker(type);
  }

  function closePicker() {
    setPicker(null);
    setSearch("");
  }

  function openPremiumFlow() {
    if (buying || loadingPrices) return;
    window.history.pushState({}, "", "/buy-number?country=USA&premium=1");
    setMessage("Loading Premium USA services…");
    setPrices([]);
    setSheetOpen(false);
    setServiceOptions([]);
    setCountry("US");
    setPremium(true);
  }

  async function load(e: FormEvent) {
    e.preventDefault();
    if (buying || loadingPrices) return;
    const requestId = ++priceRequest.current;
    const selectedCountryCode = country;
    const selectedServiceCode = currentServiceCode();
    setLoadingPrices(true);
    setSheetOpen(false);
    setMessage("Checking live prices…");
    try {
      const token = getSessionToken();
      if (premium && !token) throw new Error("Please sign in first");
      const data: any = premium ? await api.numbers.premiumCatalog(token!) : await api.numbers.prices("", selectedCountryCode, selectedServiceCode);
      if (requestId !== priceRequest.current) return;
      const parsed = normalizePrices(data).filter((item: any) => item != null && (!premium || String(item?.service_code || "").toLowerCase() === selectedServiceCode.toLowerCase()));
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

  async function buy(selectedOffer: any) {
    if (buying) return;
    setBuying(true);
    setMessage("Purchasing number…");
    try {
      const token = getSessionToken();
      if (!token) throw new Error("Please sign in first");
      const providerId = String(selectedOffer?.provider_id ?? "").trim();
      if (!premium && !providerId) throw new Error("This price is no longer available. Please refresh prices.");
      const result: any = premium
        ? await api.numbers.premiumBuy(token, { service_code: currentServiceCode() })
        : await api.numbers.buy(token, { country_code: country, service_code: currentServiceCode(), provider_id: providerId });
      const reference = result?.reference || result?.order?.reference || result?.data?.reference;
      setMessage("Number purchased successfully.");
      router.push(reference ? `/otp?reference=${encodeURIComponent(reference)}` : "/orders");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Unable to purchase this number");
    } finally {
      setBuying(false);
    }
  }

  const selectedCountry = countries.find((item) => item.code === country) || countries[0];
  const selectedService = serviceOptions.find((item) => item.code.toLowerCase() === service.toLowerCase());
  const query = search.trim().toLowerCase();
  const filteredCountries = countries.filter((item) => !query || item.name.toLowerCase().includes(query) || item.iso?.toLowerCase().includes(query));
  const filteredServices = serviceOptions.filter((item) => !query || item.name.toLowerCase().includes(query) || item.code.toLowerCase().includes(query));

  return (
    <PageShell title="Buy Number" subtitle={premium ? "Choose a Premium USA service" : "Choose a country and service"}>
      <form className="buyNumberPanel" onSubmit={load}>
        <button type="button" className="selectorCard" onClick={() => openPicker("country")}>
          <span className="selectorIcon">{selectedCountry?.flag || "🌐"}</span>
          <span className="selectorCopy"><small>Country</small><strong>{selectedCountry?.name || "Choose country"}</strong></span>
          <span className="selectorChevron">⌄</span>
        </button>

        <button type="button" className="selectorCard" onClick={() => openPicker("service")}>
          <span className="selectorIcon serviceSelectorIcon"><ServiceBrandIcon service={selectedService?.name || friendlyServiceName(service)}/></span>
          <span className="selectorCopy"><small>Service</small><strong>{loadingServices ? "Loading services…" : selectedService?.name || friendlyServiceName(service)}</strong></span>
          <span className="selectorChevron">⌄</span>
        </button>

        <div className="purchaseSummary">
          <div><small>Wallet</small><strong>{balance}</strong></div>
          <div><small>Validity</small><strong>20 min</strong></div>
          <div><small>Avg. wait</small><strong>1–5 min</strong></div>
        </div>

        <button className="buyNumberCta" type="submit" disabled={buying || loadingPrices || loadingServices}>{loadingPrices ? "Checking…" : "View Prices"}</button>
        <div style={{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:8}}>
          <button type="button" onClick={openPremiumFlow} style={{minHeight:58,border:"1px solid rgba(0,0,0,.08)",borderRadius:18,background:"#fff",boxShadow:"0 5px 16px rgba(0,0,0,.055)",padding:"10px 12px",display:"grid",gap:4,textAlign:"left"}}>
            <span style={{fontSize:8,color:"#6e6e73"}}>🇺🇸 Premium USA</span><strong style={{fontSize:10,lineHeight:1.25}}>Buy Premium USA Number</strong>
          </button>
          <button type="button" onClick={() => router.push("/rent-number?country=USA")} style={{minHeight:58,border:"1px solid rgba(0,0,0,.08)",borderRadius:18,background:"#fff",boxShadow:"0 5px 16px rgba(0,0,0,.055)",padding:"10px 12px",display:"grid",gap:4,textAlign:"left"}}>
            <span style={{fontSize:8,color:"#6e6e73"}}>🇺🇸 Long-term access</span><strong style={{fontSize:10,lineHeight:1.25}}>Rent USA Number</strong>
          </button>
        </div>
        {message && <p className="buyNumberMessage" role="status">{message}</p>}
      </form>

      {picker && (
        <div role="presentation" onClick={closePicker} style={{position:"fixed",inset:0,zIndex:120,background:"rgba(0,0,0,.22)",backdropFilter:"blur(8px)",WebkitBackdropFilter:"blur(8px)",display:"flex",alignItems:"flex-end",justifyContent:"center",padding:"0 12px calc(env(safe-area-inset-bottom) + 12px)"}}>
          <section role="dialog" aria-modal="true" aria-label={picker === "country" ? "Choose country" : "Choose service"} onClick={(e) => e.stopPropagation()} style={{width:"min(100%,540px)",maxHeight:"72vh",background:"rgba(255,255,255,.97)",border:"1px solid rgba(0,0,0,.08)",borderRadius:28,boxShadow:"0 24px 70px rgba(0,0,0,.2)",overflow:"hidden",display:"flex",flexDirection:"column"}}>
            <div style={{padding:"10px 16px 12px",borderBottom:"1px solid rgba(0,0,0,.06)",background:"rgba(255,255,255,.9)",position:"sticky",top:0,zIndex:2}}>
              <div style={{width:38,height:5,borderRadius:99,background:"rgba(0,0,0,.16)",margin:"0 auto 12px"}} />
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,marginBottom:10}}>
                <strong style={{fontSize:18}}>{picker === "country" ? "Choose country" : `Choose service${serviceOptions.length ? ` · ${serviceOptions.length}` : ""}`}</strong>
                <button type="button" onClick={closePicker} aria-label="Close" style={{width:32,height:32,border:0,borderRadius:16,background:"rgba(0,0,0,.06)",fontSize:18,lineHeight:1}}>×</button>
              </div>
              <label style={{height:46,border:"1px solid rgba(0,0,0,.1)",borderRadius:15,display:"flex",alignItems:"center",gap:9,padding:"0 13px",background:"#fff"}}>
                <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" style={{flex:"0 0 auto"}}><circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="2"/><path d="m16.5 16.5 4 4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                <input autoFocus value={search} onChange={(e) => setSearch(e.target.value)} placeholder={picker === "country" ? "Search countries" : "Search all services"} style={{border:0,outline:0,width:"100%",fontSize:16,background:"transparent",color:"#111"}} />
              </label>
            </div>
            <div style={{overflowY:"auto",WebkitOverflowScrolling:"touch",padding:"6px 10px 12px"}}>
              {picker === "country" ? filteredCountries.map((item) => (
                <button key={item.code} type="button" onClick={() => { resetSelection("country", item.code); closePicker(); }} style={{width:"100%",minHeight:54,border:0,borderBottom:"1px solid rgba(0,0,0,.055)",background:item.code === country ? "rgba(0,0,0,.05)" : "transparent",borderRadius:12,display:"flex",alignItems:"center",gap:12,padding:"8px 12px",textAlign:"left",fontSize:16}}>
                  <span style={{fontSize:24,width:30,textAlign:"center"}}>{item.flag}</span>
                  <span style={{flex:1}}>{item.name}</span>
                  {item.code === country && <span aria-hidden="true" style={{fontSize:18}}>✓</span>}
                </button>
              )) : filteredServices.map((item) => (
                <button key={item.code} type="button" onClick={() => { resetSelection("service", item.code); closePicker(); }} style={{width:"100%",minHeight:54,border:0,borderBottom:"1px solid rgba(0,0,0,.055)",background:item.code === service ? "rgba(0,0,0,.05)" : "transparent",borderRadius:12,display:"flex",alignItems:"center",gap:12,padding:"8px 12px",textAlign:"left",fontSize:16}}>
                  <span style={{width:30,height:30,display:"inline-flex"}}><ServiceBrandIcon service={item.name}/></span>
                  <span style={{flex:1}}>{item.name}</span>
                  {item.code === service && <span aria-hidden="true" style={{fontSize:18}}>✓</span>}
                </button>
              ))}
              {picker === "service" && loadingServices && <p style={{padding:"24px 12px",margin:0,textAlign:"center",color:"#6e6e73"}}>Loading all services…</p>}
              {((picker === "country" && filteredCountries.length === 0) || (picker === "service" && !loadingServices && filteredServices.length === 0)) && <p style={{padding:"24px 12px",margin:0,textAlign:"center",color:"#6e6e73"}}>No results found.</p>}
            </div>
          </section>
        </div>
      )}

      {sheetOpen && prices.length > 0 && (
        <div className="sheetBackdrop" role="presentation" onClick={() => !buying && setSheetOpen(false)}>
          <section className="priceSheet" role="dialog" aria-modal="true" aria-label="Choose a number" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="sheetHandle" aria-label="Close" disabled={buying} onClick={() => setSheetOpen(false)} />
            <div className="priceSheetHeading">
              <h2>Available prices</h2>
              <p>Live price and availability for {selectedCountry?.name || "your country"} · {selectedService?.name || friendlyServiceName(service)}.</p>
            </div>
            <div className="priceSheetList">
              {prices.map((p: any, i) => {
                const rawPrice = priceNgn(p);
                const formattedPrice = rawPrice != null && Number.isFinite(Number(rawPrice)) ? `₦${Number(rawPrice).toLocaleString()}` : "Price at checkout";
                const available = p?.available ?? p?.stock ?? p?.count ?? p?.quantity ?? p?.availability;
                return (
                  <div className="priceRow" key={p.id || p.price_id || p.provider_id || `${p.service_code || "offer"}-${i}`}>
                    <div>
                      <strong>{formattedPrice}</strong>
                      <small>{Number.isFinite(Number(available)) ? `${Number(available).toLocaleString()} numbers available` : "Available now"}</small>
                    </div>
                    <button className="priceBuyButton" type="button" disabled={buying} onClick={() => buy(p)}>{buying ? "Buying…" : "Buy"}</button>
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
