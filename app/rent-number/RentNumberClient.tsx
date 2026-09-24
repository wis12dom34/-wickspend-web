"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BottomNav } from "@/components/BottomNav";
import { ApiError, api, newRequestKey } from "@/lib/api";
import { getSessionToken } from "@/lib/session";
import styles from "./rent-number.module.css";

type Tab = "browse" | "favorites" | "rentals";
type Period = {
  period?: string;
  duration_minutes: number;
  duration_label?: string;
  price_ngn: number;
  renew_price_ngn?: number | null;
  renewable?: boolean;
  is_available?: boolean;
  max_quantity?: number;
  supports_carrier?: boolean;
  supports_area_code?: boolean;
};
type Country = {
  country_id?: string;
  country_code: string;
  country_name: string;
  min_price_ngn?: number;
  available?: boolean;
  periods: Period[];
};
type Service = {
  service_code: string;
  service_name: string;
  min_price_ngn?: number;
  available?: boolean;
  countries: Country[];
};
type Carrier = { id: string; name: string };
type RentalItem = {
  reference: string;
  phone_number?: string;
  status?: string;
  item_index?: number;
  created_at?: string;
  expires_at?: string;
  renewable?: boolean;
  amount_paid_ngn?: number;
  message_count?: number;
  last_message?: Message;
};
type RentalGroup = {
  order_reference: string;
  service_name?: string;
  service_code?: string;
  country_name?: string;
  country_code?: string;
  provider?: string;
  duration_minutes?: number;
  requested_quantity?: number;
  quantity?: number;
  amount_paid_ngn?: number;
  status?: string;
  created_at?: string;
  expires_at?: string;
  renewable?: boolean;
  items?: RentalItem[];
};
type Message = { message?: string; otp_code?: string; sender?: string; received_at?: string };
type PurchaseAttempt = { fingerprint: string; requestKey: string; startedAt: number; reference?: string };
const RENTAL_ATTEMPT_STORAGE = "wickspend:rental:purchase-attempt";
function readPurchaseAttempt(): PurchaseAttempt | null {
  if (typeof window === "undefined") return null;
  try { const raw = window.sessionStorage.getItem(RENTAL_ATTEMPT_STORAGE); if (!raw) return null; const value = JSON.parse(raw); return value?.fingerprint && value?.requestKey ? value as PurchaseAttempt : null; } catch { return null; }
}
function writePurchaseAttempt(value: PurchaseAttempt) { if (typeof window !== "undefined") window.sessionStorage.setItem(RENTAL_ATTEMPT_STORAGE, JSON.stringify(value)); }
function clearPurchaseAttempt() { if (typeof window !== "undefined") window.sessionStorage.removeItem(RENTAL_ATTEMPT_STORAGE); }
type RentalStatus = RentalItem & {
  order_reference?: string;
  provider?: string;
  service_name?: string;
  country_name?: string;
  duration_minutes?: number;
  price_ngn?: number;
  created_at?: string;
  active_from?: string;
  renewable?: boolean;
  renew_price_ngn?: number;
  should_poll?: boolean;
  messages?: Message[];
};

type IconName = "back" | "search" | "star" | "clock" | "history" | "chevron" | "plus" | "minus" | "copy" | "message" | "refresh" | "check" | "phone";
function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  const common = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.9, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };
  if (name === "back") return <svg {...common}><path d="m15 18-6-6 6-6" /></svg>;
  if (name === "search") return <svg {...common}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>;
  if (name === "star") return <svg {...common}><path d="m12 3 2.7 5.5 6 .9-4.4 4.2 1 6-5.3-2.8-5.3 2.8 1-6-4.4-4.2 6-.9L12 3Z" /></svg>;
  if (name === "clock") return <svg {...common}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>;
  if (name === "history") return <svg {...common}><path d="M3 12a9 9 0 1 0 3-6.7" /><path d="M3 4v5h5" /></svg>;
  if (name === "chevron") return <svg {...common}><path d="m9 6 6 6-6 6" /></svg>;
  if (name === "plus") return <svg {...common}><path d="M12 5v14M5 12h14" /></svg>;
  if (name === "minus") return <svg {...common}><path d="M5 12h14" /></svg>;
  if (name === "copy") return <svg {...common}><rect x="9" y="9" width="10" height="10" rx="2" /><path d="M15 9V7a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" /></svg>;
  if (name === "message") return <svg {...common}><path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v8Z" /></svg>;
  if (name === "refresh") return <svg {...common}><path d="M20 7v5h-5" /><path d="M4 17v-5h5" /><path d="M6.1 8A7 7 0 0 1 18 6l2 1M18 16a7 7 0 0 1-12 2l-2-1" /></svg>;
  if (name === "check") return <svg {...common}><path d="m5 12 4 4L19 6" /></svg>;
  return <svg {...common}><path d="M7 3h3l1.5 4-2 1.5a15 15 0 0 0 6 6l1.5-2 4 1.5v3a3 3 0 0 1-3 3C10.3 20 4 13.7 4 6a3 3 0 0 1 3-3Z" /></svg>;
}

const money = (n?: number | null) => Number.isFinite(Number(n)) ? `₦${Number(n).toLocaleString("en-NG", { maximumFractionDigits: 0 })}` : "—";
const clean = (v: unknown) => String(v ?? "").trim();
const isLegacyProvider = (provider?: string) => { const value = clean(provider).toLowerCase(); return value.includes("getatext") || value.includes("legacy"); };
const rentalDisplayName = (group: RentalGroup) => isLegacyProvider(group.provider) ? "Legacy Rental" : (group.service_name || group.service_code || "Rental service");
function flag(code?: string) {
  const c = clean(code).toUpperCase();
  if (!/^[A-Z]{2}$/.test(c)) return "";
  return String.fromCodePoint(...[...c].map(x => 127397 + x.charCodeAt(0)));
}
function durationText(minutes?: number, provided?: string) {
  if (provided) return provided;
  const m = Number(minutes || 0);
  if (m >= 525600 && m % 525600 === 0) return `${m / 525600} year${m === 525600 ? "" : "s"}`;
  if (m >= 43200 && m % 43200 === 0) return `${m / 43200} month${m === 43200 ? "" : "s"}`;
  if (m >= 10080 && m % 10080 === 0) return `${m / 10080} week${m === 10080 ? "" : "s"}`;
  if (m >= 1440 && m % 1440 === 0) return `${m / 1440} day${m === 1440 ? "" : "s"}`;
  if (m >= 60 && m % 60 === 0) return `${m / 60} hour${m === 60 ? "" : "s"}`;
  return `${m} min`;
}
function dateText(value?: string) {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleString("en-NG", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
function remaining(value?: string) {
  if (!value) return "—";
  const diff = new Date(value).getTime() - Date.now();
  if (diff <= 0) return "Expired";
  const days = Math.floor(diff / 86400000), hours = Math.floor((diff % 86400000) / 3600000), mins = Math.max(0, Math.floor((diff % 3600000) / 60000));
  if (days) return `${days}d ${hours}h`;
  return `${hours}h ${mins}m`;
}
function firstLetter(name: string) { return (clean(name)[0] || "R").toUpperCase(); }

function RentalServiceIcon({ service, code, large = false }: { service: string; code?: string; large?: boolean }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => { setFailed(false); }, [service, code]);
  const className = large ? styles.serviceMarkLarge : styles.serviceMark;
  if (failed) return <span className={className}>{firstLetter(service)}</span>;
  const src = `/api/number-service-icon?code=${encodeURIComponent(clean(code).toLowerCase())}&name=${encodeURIComponent(service)}`;
  return <span className={`${className} ${styles.serviceLogo}`} aria-hidden="true"><img src={src} alt="" loading="lazy" onError={() => setFailed(true)} /></span>;
}

export default function RentNumberClient({ supportedPeriods = [] }: { supportedPeriods?: string[] }) {
  const router = useRouter();
  const detailRef = useRef<HTMLDivElement | null>(null);
  const purchaseAttemptRef = useRef<PurchaseAttempt | null>(null);
  const [tab, setTab] = useState<Tab>("browse");
  const [services, setServices] = useState<Service[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState("");
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [visibleCount, setVisibleCount] = useState(40);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [favoriteBusy, setFavoriteBusy] = useState("");
  const [selectedCode, setSelectedCode] = useState("");
  const [countryCode, setCountryCode] = useState("");
  const [duration, setDuration] = useState(0);
  const [carriers, setCarriers] = useState<Carrier[]>([]);
  const [carriersLoaded, setCarriersLoaded] = useState(false);
  const [carrierId, setCarrierId] = useState("");
  const [areaCode, setAreaCode] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [buying, setBuying] = useState(false);
  const [slowProcessing, setSlowProcessing] = useState(false);
  const [notice, setNotice] = useState("");
  const [success, setSuccess] = useState<any>(null);
  const [rentals, setRentals] = useState<RentalGroup[]>([]);
  const [rentalsLoading, setRentalsLoading] = useState(false);
  const [rentalError, setRentalError] = useState("");
  const [otpRef, setOtpRef] = useState("");
  const [otpStatus, setOtpStatus] = useState<RentalStatus | null>(null);
  const [otpLoading, setOtpLoading] = useState(false);
  const [actionBusy, setActionBusy] = useState("");

  useEffect(() => { const id = window.setTimeout(() => setSearch(query.trim().toLowerCase()), 220); return () => window.clearTimeout(id); }, [query]);

  async function loadCatalog() {
    setCatalogLoading(true); setCatalogError("");
    try {
      const data: any = await api.rentals.catalog();
      const list = Array.isArray(data?.services) ? data.services : [];
      const safe = list.filter((s: any) => clean(s?.service_code) && clean(s?.service_name) && Array.isArray(s?.countries)) as Service[];
      setServices(safe);
      if (!selectedCode && safe[0]) setSelectedCode(safe[0].service_code);
    } catch (e) { setCatalogError(e instanceof Error ? e.message : "Unable to load rental services."); }
    finally { setCatalogLoading(false); }
  }
  async function loadPrivate() {
    const token = getSessionToken(); if (!token) return;
    const [fav, list] = await Promise.allSettled([api.rentals.favorites(token), api.rentals.list(token)]);
    if (fav.status === "fulfilled") setFavorites(new Set(Array.isArray((fav.value as any)?.favorites) ? (fav.value as any).favorites.map(String) : []));
    if (list.status === "fulfilled") setRentals(Array.isArray((list.value as any)?.rentals) ? (list.value as any).rentals : []);
  }
  async function loadRentals(fresh = false, quiet = false) {
    const token = getSessionToken(); if (!token) { if (!quiet) setRentalError("Sign in to view your rentals."); return; }
    if (!quiet) { setRentalsLoading(true); setRentalError(""); }
    try { const data: any = await api.rentals.list(token, fresh); setRentals(Array.isArray(data?.rentals) ? data.rentals : []); }
    catch (e) { if (!quiet) setRentalError(e instanceof Error ? e.message : "Unable to load rentals."); }
    finally { if (!quiet) setRentalsLoading(false); }
  }
  useEffect(() => { loadCatalog(); loadPrivate(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (tab === "rentals") loadRentals(); }, [tab]); // eslint-disable-line react-hooks/exhaustive-deps
  const hasProcessingRentals = useMemo(() => rentals.some(group => clean(group.status).toLowerCase() === "processing" || (group.items || []).some(item => ["processing", "pending_provider", "provider_unknown"].includes(clean(item.status).toLowerCase()))), [rentals]);
  useEffect(() => {
    if (tab !== "rentals" || !hasProcessingRentals) return;
    let cancelled = false, timer = 0, attempt = 0;
    const schedule = () => { if (cancelled) return; timer = window.setTimeout(refresh, attempt < 3 ? 2500 : 5000); };
    const refresh = async () => {
      if (cancelled) return;
      if (document.hidden) { schedule(); return; }
      attempt++;
      await loadRentals(true, true);
      if (!cancelled && attempt < 12) schedule();
    };
    const onVisibility = () => { window.clearTimeout(timer); if (!document.hidden) refresh(); };
    document.addEventListener("visibilitychange", onVisibility);
    schedule();
    return () => { cancelled = true; window.clearTimeout(timer); document.removeEventListener("visibilitychange", onVisibility); };
  }, [tab, hasProcessingRentals]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectedService = useMemo(() => services.find(s => s.service_code === selectedCode) || null, [services, selectedCode]);
  const countries = selectedService?.countries || [];
  useEffect(() => {
    if (!selectedService) return;
    if (!countries.some(c => c.country_code === countryCode)) setCountryCode(countries[0]?.country_code || "");
  }, [selectedService, countries, countryCode]);
  const selectedCountry = useMemo(() => countries.find(c => c.country_code === countryCode) || countries[0] || null, [countries, countryCode]);
  const periods = selectedCountry?.periods || [];
  useEffect(() => {
    if (!selectedCountry) return;
    if (!periods.some(p => Number(p.duration_minutes) === duration)) setDuration(Number(periods[0]?.duration_minutes || 0));
  }, [selectedCountry, periods, duration]);
  const selectedPeriod = useMemo(() => periods.find(p => Number(p.duration_minutes) === duration) || periods[0] || null, [periods, duration]);
  const maxQuantity = Math.max(1, Math.min(25, Number(selectedPeriod?.max_quantity || 1)));
  useEffect(() => { if (quantity > maxQuantity) setQuantity(maxQuantity); }, [maxQuantity, quantity]);
  useEffect(() => { setCarrierId(""); setAreaCode(""); setQuantity(1); }, [selectedCode, countryCode, duration]);
  useEffect(() => {
    if (!selectedPeriod?.supports_carrier || carriersLoaded) return;
    api.rentals.carriers().then((data: any) => { setCarriers(Array.isArray(data?.carriers) ? data.carriers : []); setCarriersLoaded(true); }).catch(() => setCarriersLoaded(true));
  }, [selectedPeriod?.supports_carrier, carriersLoaded]);

  const filtered = useMemo(() => {
    const base = tab === "favorites" ? services.filter(s => favorites.has(s.service_code)) : services;
    if (!search) return base;
    return base.filter(s => `${s.service_name} ${s.service_code} ${s.countries?.map(c => `${c.country_name} ${c.country_code}`).join(" ")}`.toLowerCase().includes(search));
  }, [services, favorites, tab, search]);
  const shown = filtered.slice(0, visibleCount);
  const total = selectedPeriod ? Number(selectedPeriod.price_ngn || 0) * quantity : 0;

  async function toggleFavorite(service: Service, e: React.MouseEvent) {
    e.stopPropagation();
    const token = getSessionToken();
    if (!token) { setNotice("Sign in to save favorites."); return; }
    const code = service.service_code, next = !favorites.has(code);
    setFavoriteBusy(code); setFavorites(prev => { const n = new Set(prev); next ? n.add(code) : n.delete(code); return n; });
    try { await api.rentals.setFavorite(token, code, next); }
    catch (e) { setFavorites(prev => { const n = new Set(prev); next ? n.delete(code) : n.add(code); return n; }); setNotice(e instanceof Error ? e.message : "Unable to update favorite."); }
    finally { setFavoriteBusy(""); }
  }

  async function placeRental() {
    if (buying || !selectedService || !selectedCountry || !selectedPeriod) return;
    const token = getSessionToken(); if (!token) { router.push("/login?next=/rent-number"); return; }
    const fingerprint = [selectedService.service_code, selectedCountry.country_code, selectedPeriod.duration_minutes, carrierId, areaCode, quantity].join("|");
    const storedAttempt = readPurchaseAttempt();
    if (!purchaseAttemptRef.current || purchaseAttemptRef.current.fingerprint !== fingerprint) {
      purchaseAttemptRef.current = storedAttempt?.fingerprint === fingerprint
        ? storedAttempt
        : { fingerprint, requestKey: newRequestKey("rent"), startedAt: Date.now() };
      writePurchaseAttempt(purchaseAttemptRef.current);
    }
    const requestKey = purchaseAttemptRef.current.requestKey;
    setBuying(true); setSlowProcessing(false); setNotice("");
    const slowTimer = window.setTimeout(() => setSlowProcessing(true), 5000);
    try {
      const data: any = await api.rentals.create(token, {
        service_code: selectedService.service_code,
        country_code: selectedCountry.country_code,
        duration_minutes: selectedPeriod.duration_minutes,
        carrier_id: carrierId || undefined,
        area_code: areaCode || undefined,
        quantity,
        request_key: requestKey,
        expected_price_ngn: selectedPeriod.price_ngn
      });
      if (data?.reference && purchaseAttemptRef.current) {
        purchaseAttemptRef.current = { ...purchaseAttemptRef.current, reference: String(data.reference) };
        writePurchaseAttempt(purchaseAttemptRef.current);
      }
      await loadRentals(true);
      if (data?.provider_pending === true || String(data?.status || "").toLowerCase() === "processing") {
        setTab("rentals");
        setNotice("Your rental is still being confirmed. Check My Rentals shortly.");
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      const items = Array.isArray(data?.items) ? data.items : data?.phone_number ? [{ reference: data.reference, phone_number: data.phone_number, expires_at: data.expires_at }] : [];
      if (!items.some((item: any) => clean(item?.phone_number))) throw new Error("The provider did not return a phone number. Your rental was not marked successful.");
      const confirmed: any = items[0]?.reference ? await api.rentals.status(token, items[0].reference).catch(() => null) : null;
      purchaseAttemptRef.current = null;
      clearPurchaseAttempt();
      setSuccess({ ...data, created_at: confirmed?.created_at || data?.created_at, active_from: confirmed?.active_from || data?.active_from, expires_at: confirmed?.expires_at || data?.expires_at, service_name: data?.service_name || selectedService.service_name, country_name: data?.country_name || selectedCountry.country_name, country_code: data?.country_code || selectedCountry.country_code, duration_minutes: data?.duration_minutes || selectedPeriod.duration_minutes, renewable: data?.renewable ?? selectedPeriod.renewable, price_per_number_ngn: data?.price_per_number_ngn || selectedPeriod.price_ngn });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      const code = e instanceof ApiError ? clean(e.code).toUpperCase() : "";
      if (code === "PRICE_CHANGED" && e instanceof ApiError) {
        const payload = e.payload as any;
        const nextPrice = Number(payload?.price_per_number_ngn || payload?.amount_ngn || 0) / (Number(payload?.price_per_number_ngn) ? 1 : Math.max(1, quantity));
        if (nextPrice > 0) setServices(prev => prev.map(service => service.service_code !== selectedService.service_code ? service : { ...service, countries: service.countries.map(country => country.country_code !== selectedCountry.country_code ? country : { ...country, periods: country.periods.map(period => Number(period.duration_minutes) === Number(selectedPeriod.duration_minutes) ? { ...period, price_ngn: nextPrice } : period) }) }));
      }
      if (["PROVIDER_REJECTED", "PROVIDER_NO_STOCK", "REQUEST_KEY_CONFLICT"].includes(code)) { purchaseAttemptRef.current = null; clearPurchaseAttempt(); }
      const message = e instanceof Error ? e.message : "Unable to rent this number.";
      setNotice(message);
      if (code === "PROVIDER_STATUS_UNKNOWN" || message.includes("Check My Rentals before trying again")) { await loadRentals(true); setTab("rentals"); window.scrollTo({ top: 0, behavior: "smooth" }); }
    }
    finally { window.clearTimeout(slowTimer); setSlowProcessing(false); setBuying(false); }
  }

  useEffect(() => {
    if (!otpRef) { setOtpStatus(null); return; }
    let cancelled = false, timer = 0, attempt = 0;
    const schedule = () => { if (cancelled || document.hidden) return; timer = window.setTimeout(run, attempt < 3 ? 2500 : 5000); };
    const run = async () => {
      const token = getSessionToken(); if (!token || cancelled || document.hidden) return;
      setOtpLoading(true);
      try {
        const data: any = await api.rentals.status(token, otpRef);
        if (cancelled) return;
        setOtpStatus(data);
        const status = clean(data?.status).toLowerCase();
        const provider = clean(data?.provider).toLowerCase();
        const hasMessage = Array.isArray(data?.messages) && data.messages.length > 0;
        const ended = ["expired", "cancelled", "failed", "refunded"].includes(status);
        const legacy = provider.includes("getatext") || provider.includes("legacy");
        attempt++;
        if (!hasMessage && !ended && !legacy && data?.should_poll !== false) schedule();
      } catch (e) { if (!cancelled) setNotice(e instanceof Error ? e.message : "Unable to check messages."); }
      finally { if (!cancelled) setOtpLoading(false); }
    };
    const onVisibility = () => { window.clearTimeout(timer); if (!document.hidden) run(); };
    document.addEventListener("visibilitychange", onVisibility);
    run();
    return () => { cancelled = true; window.clearTimeout(timer); document.removeEventListener("visibilitychange", onVisibility); };
  }, [otpRef]);

  async function cancelRental(reference: string) {
    const token = getSessionToken(); if (!token || !reference || actionBusy) return;
    setActionBusy(reference); setNotice("");
    try { await api.rentals.cancel(token, reference); await loadRentals(true); if (otpRef === reference) setOtpRef(""); }
    catch (e) { setNotice(e instanceof Error ? e.message : "Unable to cancel rental."); }
    finally { setActionBusy(""); }
  }
  if (success) {
    const items: RentalItem[] = Array.isArray(success.items) ? success.items : success.phone_number ? [{ reference: success.reference, phone_number: success.phone_number, status: success.status, expires_at: success.expires_at }] : [];
    return <main className={styles.page}>
      <header className={styles.header}><button className={styles.iconButton} onClick={() => setSuccess(null)} aria-label="Back"><Icon name="back" /></button><div><h1>Rental Successful</h1><p>Your rental is ready</p></div><span className={styles.headerSpacer} /></header>
      <section className={styles.successHero}><span className={styles.successIcon}><Icon name="check" size={30} /></span><h2>Rental Successful</h2><p>{success.service_name} · {flag(success.country_code)} {success.country_name}</p></section>
      <section className={styles.summaryCard}>
        <SummaryRow label="Service" value={success.service_name} /><SummaryRow label="Country" value={`${flag(success.country_code)} ${success.country_name}`} />{items.length === 1 && <SummaryRow label="Phone number" value={items[0]?.phone_number || "—"} />}<SummaryRow label="Duration" value={durationText(success.duration_minutes)} /><SummaryRow label="Amount paid" value={money(success.amount_ngn ?? Number(success.price_per_number_ngn || 0) * Math.max(1, items.length))} /><SummaryRow label="Start date" value={dateText(success.active_from || success.created_at)} /><SummaryRow label="Expiry date" value={dateText(success.expires_at || items[0]?.expires_at)} />
      </section>
      <section id="rental-number" className={styles.successNumbers}><div className={styles.sectionHeading}><div><h3>{items.length > 1 ? `${items.length} rented numbers` : "Your number"}</h3><p>Tap a number to view its OTP messages.</p></div></div>{items.map((item, i) => <button key={item.reference || i} className={styles.numberCard} onClick={() => { setSuccess(null); setTab("rentals"); if (item.reference) setOtpRef(item.reference); }}><span className={styles.serviceMark}><Icon name="phone" size={19} /></span><span><strong>{item.phone_number || "Number assigned"}</strong><small>{dateText(item.expires_at)}</small></span><Icon name="chevron" size={18} /></button>)}</section>
      <div className={styles.successActions}><button className={styles.primaryButton} onClick={() => document.getElementById("rental-number")?.scrollIntoView({ behavior: "smooth", block: "center" })}>View Number</button><button className={styles.secondaryButton} onClick={() => { setSuccess(null); setTab("rentals"); if (items[0]?.reference) setOtpRef(items[0].reference); }}>View OTP</button><button className={styles.secondaryButton} onClick={() => { setSuccess(null); setTab("rentals"); }}>My Rentals</button><button className={styles.textButton} onClick={() => setSuccess(null)}>Rent another number</button></div>
      <BottomNav />
    </main>;
  }

  return <main className={styles.page}>
    <header className={styles.header}>
      <button className={styles.iconButton} onClick={() => router.back()} aria-label="Back"><Icon name="back" /></button>
      <div><h1>Rent a Virtual Number</h1><p>Rent a virtual number for longer-term SMS access on WickSpend. Choose from currently supported rental services and available rental periods.</p></div>
      <button className={styles.iconButton} onClick={() => setTab("rentals")} aria-label="My rentals"><Icon name="history" /></button>
    </header>


    <section className="seoIntroCard" aria-label="About virtual number rentals">
      <p>Rental services and prices load from WickSpend’s existing live rental catalog. If availability changes or the provider is temporarily unavailable, this guide remains available while you retry the catalog.</p>
    </section>

    <nav className={styles.tabs} aria-label="Rental sections">
      <button className={tab === "browse" ? styles.activeTab : ""} onClick={() => { setTab("browse"); setVisibleCount(40); }}>All Services</button>
      <button className={tab === "favorites" ? styles.activeTab : ""} onClick={() => { setTab("favorites"); setVisibleCount(40); }}>Favorites <span>{favorites.size}</span></button>
      <button className={tab === "rentals" ? styles.activeTab : ""} onClick={() => setTab("rentals")}>My Rentals</button>
    </nav>

    {tab !== "rentals" ? <>
      <div className={styles.searchBox}><Icon name="search" size={19} /><input value={query} onChange={e => { setQuery(e.target.value); setVisibleCount(40); }} placeholder="Search rental services" aria-label="Search rental services" />{query && <button onClick={() => setQuery("")} aria-label="Clear search">×</button>}</div>
      <div className={styles.catalogMeta}><span>{filtered.length.toLocaleString()} service{filtered.length === 1 ? "" : "s"}</span><button onClick={loadCatalog} disabled={catalogLoading}><Icon name="refresh" size={16} /> Refresh</button></div>
      {catalogLoading ? <div className={styles.skeletonGrid}>{Array.from({ length: 8 }).map((_, i) => <div className={styles.skeleton} key={i} />)}</div> : catalogError ? <EmptyState title="Rental services couldn't load" text={catalogError} action="Try again" onAction={loadCatalog} /> : shown.length === 0 ? <EmptyState title={tab === "favorites" ? "No favorites yet" : "No services found"} text={tab === "favorites" ? "Save services with the star so you can find them quickly." : "Try a different search."} /> : <div className={styles.serviceGrid}>{shown.map(service => {
        const active = selectedCode === service.service_code;
        return <button className={`${styles.serviceCard} ${active ? styles.serviceCardActive : ""}`} key={service.service_code} onClick={() => { setSelectedCode(service.service_code); window.setTimeout(() => detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 30); }}>
          <RentalServiceIcon service={service.service_name} code={service.service_code} /><span className={styles.serviceBody}><strong>{service.service_name}</strong><small>From {money(service.min_price_ngn)} · {service.countries?.length || 0} location{service.countries?.length === 1 ? "" : "s"}</small></span><span className={`${styles.favoriteButton} ${favorites.has(service.service_code) ? styles.favoriteOn : ""}`} role="button" aria-label={favorites.has(service.service_code) ? "Remove favorite" : "Add favorite"} aria-disabled={favoriteBusy === service.service_code} onClick={e => toggleFavorite(service, e)}><Icon name="star" size={19} /></span><Icon name="chevron" size={18} />
        </button>;
      })}</div>}
      {shown.length < filtered.length && <button className={styles.loadMore} onClick={() => setVisibleCount(v => v + 40)}>Load more services</button>}

      {selectedService && selectedCountry && selectedPeriod && <section className={styles.configSection} ref={detailRef}>
        <div className={styles.sectionHeading}><div><h2>{selectedService.service_name}</h2><p>Choose the rental options you need.</p></div><RentalServiceIcon service={selectedService.service_name} code={selectedService.service_code} large /></div>
        <div className={styles.field}><label htmlFor="country">Country / Location</label><div className={styles.selectWrap}><span className={styles.countryFlag}>{flag(selectedCountry.country_code)}</span><select id="country" value={selectedCountry.country_code} onChange={e => setCountryCode(e.target.value)}>{countries.map(c => <option key={`${c.country_code}-${c.country_id || ""}`} value={c.country_code}>{c.country_name} ({c.country_code})</option>)}</select></div></div>
        <div className={styles.field}><div className={styles.labelLine}><label>Rental duration</label>{selectedPeriod.renewable && <span className={styles.renewable}>Renewable</span>}</div><div className={styles.durationGrid}>{periods.map(p => <button className={`${styles.durationCard} ${Number(p.duration_minutes) === Number(selectedPeriod.duration_minutes) ? styles.durationActive : ""}`} key={`${p.duration_minutes}-${p.period}`} onClick={() => setDuration(Number(p.duration_minutes))}><strong>{durationText(p.duration_minutes, p.duration_label)}</strong><span>{money(p.price_ngn)}</span></button>)}</div></div>
        {selectedPeriod.supports_carrier && <div className={styles.field}><label htmlFor="carrier">Carrier <span>Optional</span></label><div className={styles.selectWrap}><select id="carrier" value={carrierId} onChange={e => setCarrierId(e.target.value)}><option value="">Any Carrier</option>{carriers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div></div>}
        {selectedPeriod.supports_area_code && <div className={styles.field}><label htmlFor="area">Area Code <span>Optional</span></label><input id="area" className={styles.input} inputMode="numeric" maxLength={6} value={areaCode} onChange={e => setAreaCode(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="Any Area Code" /><small className={styles.helpText}>Leave blank for any available area code.</small></div>}
        <div className={styles.field}><div className={styles.labelLine}><label>Quantity</label><span className={styles.limit}>Max per rent: {maxQuantity}</span></div><div className={styles.quantity}><button disabled={quantity <= 1} onClick={() => setQuantity(q => Math.max(1, q - 1))} aria-label="Decrease quantity"><Icon name="minus" /></button><strong>{quantity}</strong><button disabled={quantity >= maxQuantity} onClick={() => setQuantity(q => Math.min(maxQuantity, q + 1))} aria-label="Increase quantity"><Icon name="plus" /></button></div></div>
        <section className={styles.summaryCard}><h3>Order Summary</h3><SummaryRow label="Service" value={selectedService.service_name} /><SummaryRow label="Country" value={`${flag(selectedCountry.country_code)} ${selectedCountry.country_name}`} /><SummaryRow label="Duration" value={durationText(selectedPeriod.duration_minutes, selectedPeriod.duration_label)} /><SummaryRow label="Carrier" value={carrierId ? carriers.find(c => c.id === carrierId)?.name || "Selected carrier" : "Any Carrier"} /><SummaryRow label="Area Code" value={areaCode || "Any Area Code"} /><SummaryRow label="Quantity" value={String(quantity)} /><SummaryRow label="Price per number" value={money(selectedPeriod.price_ngn)} /><div className={styles.totalRow}><span>Total</span><strong>{money(total)}</strong></div></section>
        <button className={styles.primaryButton} disabled={buying || selectedPeriod.is_available === false} onClick={placeRental}>{buying ? (slowProcessing ? "Still contacting the rental provider…" : "Processing rental…") : quantity > 1 ? `Rent ${quantity} Numbers · ${money(total)}` : `Rent Number · ${money(total)}`}</button>
        <p className={styles.secureNote}>Price and wallet balance are rechecked securely before purchase.</p>
      </section>}
    </> : <section className={styles.rentalsSection}>
      <div className={styles.sectionHeading}><div><h2>My Rentals</h2><p>Your numbers, expiry and messages in one place.</p></div><button className={styles.smallRefresh} onClick={() => loadRentals(true)} disabled={rentalsLoading}><Icon name="refresh" size={17} /></button></div>
      {rentalsLoading && rentals.length === 0 ? <div className={styles.skeletonGrid}>{Array.from({ length: 4 }).map((_, i) => <div className={styles.skeleton} key={i} />)}</div> : rentalError ? <EmptyState title="Couldn't load rentals" text={rentalError} action="Try again" onAction={() => loadRentals(true)} /> : rentals.length === 0 ? <EmptyState title="No rentals yet" text="Your rented numbers will appear here." action="Browse services" onAction={() => setTab("browse")} /> : <div className={styles.rentalList}>{rentals.map(group => <article className={styles.rentalGroup} key={group.order_reference}>
        <div className={styles.rentalTop}><RentalServiceIcon service={rentalDisplayName(group)} code={isLegacyProvider(group.provider) ? undefined : group.service_code} /><div><strong>{rentalDisplayName(group)}</strong><small>{flag(group.country_code)} {group.country_name || group.country_code} · {durationText(group.duration_minutes)}</small></div><Status value={group.status} /></div>
        <div className={styles.rentalFacts}><span><small>Numbers</small><strong>{group.quantity || group.items?.length || 0}</strong></span><span><small>Amount</small><strong>{money(group.amount_paid_ngn)}</strong></span><span><small>Expiration</small><strong>{dateText(group.expires_at)}</strong></span><span><small>Time remaining</small><strong>{remaining(group.expires_at)}</strong></span></div>
        <div className={styles.itemList}>{(group.items || []).map((item, index) => <div className={styles.rentalItem} key={item.reference || index}><div className={styles.phoneBlock}><strong>{item.phone_number || "Processing number"}</strong><small>{dateText(item.expires_at)}</small></div><div className={styles.itemActions}><button onClick={() => navigator.clipboard?.writeText(item.phone_number || "")} disabled={!item.phone_number}><Icon name="copy" size={16} /> Copy Number</button><button onClick={() => setOtpRef(item.reference)} disabled={!item.reference || !item.phone_number || clean(item.status).toLowerCase() !== "active"}><Icon name="message" size={16} /> View OTP{item.message_count ? ` (${item.message_count})` : ""}</button>{String(item.status).toLowerCase() === "active" && !isLegacyProvider(group.provider) && <button className={styles.dangerLink} onClick={() => cancelRental(item.reference)} disabled={actionBusy === item.reference}>Cancel</button>}</div></div>)}</div>
      </article>)}</div>}
    </section>}

    <section className="seoContent" aria-label="Virtual number rental guide">
      <h2>What number rental means</h2>
      <p>A rental keeps a supported virtual number active for the selected rental period so you can receive SMS during that rental. Availability, supported services and prices come from the live WickSpend rental catalog.</p>
      <h2>Buying vs. renting a number</h2>
      <p><a href="/buy-number">Buy Number</a> is intended for the standard number-purchase flow and OTP receipt. Rent Number is for services and periods currently offered by the rental provider when you need longer access.</p>
      <h2>Currently supported rental periods</h2>
      <p>{supportedPeriods.length ? `The live catalog currently includes: ${supportedPeriods.join(", ")}. Availability can differ by service and country.` : "Rental periods vary by service and country. Check the live catalog above for the periods currently available."}</p>
      <h2>Receiving SMS and extending a rental</h2>
      <p>Active rentals show their messages in My Rentals. Extension is only available when the existing rental and provider support renewal; WickSpend rechecks the live rental state before an extension.</p>
      <h2>Cancellation, refunds and availability</h2>
      <p>Cancellation and refund outcomes depend on the rental state and provider response. WickSpend shows the confirmed result in the rental flow rather than promising a refund before the provider state is known.</p>
      <h2>Rental FAQ</h2>
      <details><summary>Are all durations available for every service?</summary><p>No. Periods can vary by service, country and current provider availability.</p></details>
      <details><summary>Can I receive more than one SMS?</summary><p>The My Rentals view shows messages returned for an active rental. The provider and service determine what can be received during the rental period.</p></details>
      <details><summary>Where can I find rental walkthroughs?</summary><p>Visit <a href="/tutorials">WickSpend Tutorials</a> for published rental and number guides.</p></details>
      <nav className="seoRelatedLinks" aria-label="Related WickSpend pages"><a href="/buy-number">Buy a virtual number</a><a href="/tutorials">View tutorials</a><a href="/">WickSpend home</a></nav>
    </section>

    {notice && <div className={styles.notice} role="status">{notice}<button onClick={() => setNotice("")}>×</button></div>}
    {otpRef && <div className={styles.modal} role="presentation" onClick={() => setOtpRef("")}><section className={styles.sheet} role="dialog" aria-modal="true" aria-label="Rental messages" onClick={e => e.stopPropagation()}><div className={styles.sheetHandle} /><div className={styles.sheetHeader}><div><h2>Messages</h2><p>{otpStatus?.phone_number || "Rental number"}</p></div><button onClick={() => setOtpRef("")}>×</button></div><div className={styles.otpMeta}><span><small>Status</small><Status value={otpStatus?.status} /></span><span><small>Time remaining</small><strong>{remaining(otpStatus?.expires_at)}</strong></span></div>{otpLoading && !otpStatus ? <div className={styles.messageSkeleton} /> : Array.isArray(otpStatus?.messages) && otpStatus!.messages!.length ? <div className={styles.messageList}>{otpStatus!.messages!.map((m, i) => <article className={styles.messageCard} key={`${m.received_at}-${i}`}><div><strong>{m.sender || "SMS"}</strong><small>{dateText(m.received_at)}</small></div>{m.otp_code && <button className={styles.otpCode} onClick={() => navigator.clipboard?.writeText(m.otp_code || "")}><span>{m.otp_code}</span><Icon name="copy" size={16} /></button>}<p>{m.message}</p></article>)}</div> : <div className={styles.waiting}><Icon name="message" size={28} /><h3>Waiting for SMS</h3><p>WickSpend checks this rental with safe backoff and stops when a message arrives.</p></div>}<button className={styles.secondaryButton} onClick={async () => { const token = getSessionToken(); if (!token) return; setOtpLoading(true); try { const data: any = await api.rentals.status(token, otpRef); setOtpStatus(data); } finally { setOtpLoading(false); } }}><Icon name="refresh" size={17} /> {otpLoading ? "Checking…" : "Check again"}</button></section></div>}
    <BottomNav />
  </main>;
}

function SummaryRow({ label, value }: { label: string; value: string }) { return <div className={styles.summaryRow}><span>{label}</span><strong>{value}</strong></div>; }
function Status({ value }: { value?: string }) { const s = clean(value || "processing").toLowerCase(); return <span className={`${styles.status} ${s === "active" ? styles.statusActive : s === "failed" || s === "cancelled" || s === "expired" ? styles.statusEnded : styles.statusPending}`}>{s.charAt(0).toUpperCase() + s.slice(1)}</span>; }
function EmptyState({ title, text, action, onAction }: { title: string; text: string; action?: string; onAction?: () => void }) { return <div className={styles.empty}><span><Icon name="phone" size={24} /></span><h3>{title}</h3><p>{text}</p>{action && onAction && <button onClick={onAction}>{action}</button>}</div>; }
