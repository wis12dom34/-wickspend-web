"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import RentalIcon from "../rentals/RentalIcon";
import styles from "../rentals/rentals.module.css";
import {
  moneyNgn,
  newStoreRentalRequestKey,
  rentalExpiry,
  rentalReference,
  remainingLabel,
  StoreRental,
  StoreRentalError,
  StoreRentalPeriod,
  StoreRentalService,
  storeRentalRequest,
  storeToken,
} from "@/lib/store-rentals";

type CatalogPayload = { ok?:boolean; services?:StoreRentalService[]; items?:StoreRentalService[]; countries?:Array<{country_code:string;country_name?:string;flag?:string}> };

function servicesFrom(payload: CatalogPayload) {
  return Array.isArray(payload.services) ? payload.services : Array.isArray(payload.items) ? payload.items : [];
}

function purchaseRental(payload:any): StoreRental {
  return payload?.rental || payload?.order || payload?.data || payload;
}

const POPULAR_SERVICES = ["whatsapp","telegram","instagram","facebook","tiktok","gmail","google","twitter","snapchat","discord"];
function serviceRank(item:StoreRentalService) {
  const text = `${item.service_code || ""} ${item.service_name || ""}`.toLowerCase();
  const index = POPULAR_SERVICES.findIndex(value => text.includes(value));
  return index < 0 ? 999 : index;
}
function countryFlag(code:string) {
  const value=String(code||"").trim().toUpperCase();
  if(!/^[A-Z]{2}$/.test(value)) return "🌐";
  return String.fromCodePoint(...[...value].map(char=>127397+char.charCodeAt(0)));
}
function lowestPrice(item:StoreRentalService) {
  const values=(item.periods||[]).filter(p=>p.is_available!==false).map(p=>Number(p.price_ngn)).filter(Number.isFinite);
  return values.length?Math.min(...values):null;
}

export default function StoreRentNumberPage() {
  const { slug: rawSlug } = useParams<{slug:string}>();
  const slug = String(rawSlug || "").toLowerCase();
  const router = useRouter();
  const [services,setServices] = useState<StoreRentalService[]>([]);
  const [countries,setCountries] = useState<Array<{country_code:string;country_name?:string;flag?:string}>>([]);
  const [country,setCountry] = useState("");
  const [selectedCode,setSelectedCode] = useState("");
  const [duration,setDuration] = useState(0);
  const [search,setSearch] = useState("");
  const [balance,setBalance] = useState<number|null>(null);
  const [loading,setLoading] = useState(true);
  const [busy,setBusy] = useState(false);
  const [message,setMessage] = useState("");
  const [isError,setIsError] = useState(false);
  const [rental,setRental] = useState<StoreRental|null>(null);
  const [now,setNow] = useState(Date.now());
  const requestKey = useRef("");

  const loadCatalog = useCallback(async (targetCountry="",includeSession=false) => {
    setLoading(true); setMessage(""); setIsError(false);
    try {
      const catalogPath = `catalog/rentals?store_slug=${encodeURIComponent(slug)}${targetCountry?`&country_code=${encodeURIComponent(targetCountry)}`:""}`;
      const sessionPromise = includeSession && storeToken(slug)
        ? storeRentalRequest<any>(slug,"auth/session").catch(() => null)
        : Promise.resolve(null);
      const [catalog,session] = await Promise.all([storeRentalRequest<CatalogPayload>(slug,catalogPath),sessionPromise]);
      const nextServices = servicesFrom(catalog);
      const nextCountries = Array.isArray(catalog.countries) ? catalog.countries : [];
      const nextCountry = targetCountry || nextCountries[0]?.country_code || nextServices[0]?.country_code || "US";
      setServices(nextServices);
      setCountries(nextCountries);
      setCountry(nextCountry);
      setSelectedCode(current => {
        const first = nextServices.find(item => item.service_code === current) || [...nextServices].sort((a,b)=>serviceRank(a)-serviceRank(b))[0];
        const nextPeriods = Array.isArray(first?.periods) ? first.periods.filter(p=>p.is_available!==false) : [];
        setDuration(currentDuration => nextPeriods.some(p => Number(p.duration_minutes) === currentDuration) ? currentDuration : Number(nextPeriods[0]?.duration_minutes || 0));
        return first?.service_code || "";
      });
      if (includeSession) {
        const walletBalance = session?.wallet?.balance ?? session?.wallet?.balance_ngn ?? session?.balance_ngn;
        setBalance(Number.isFinite(Number(walletBalance)) ? Number(walletBalance) : null);
      }
    } catch (error) {
      setIsError(true);
      setMessage(error instanceof Error ? error.message : "Rent Number is temporarily unavailable.");
    } finally { setLoading(false); }
  },[slug]);

  useEffect(() => { void loadCatalog("",true); },[loadCatalog]);
  useEffect(() => { const timer=setInterval(()=>setNow(Date.now()),1000); return()=>clearInterval(timer); },[]);

  const visibleServices = useMemo(() => {
    const query = search.trim().toLowerCase();
    return services
      .filter(item => !query || `${item.service_name || ""} ${item.service_code}`.toLowerCase().includes(query))
      .sort((a,b) => serviceRank(a)-serviceRank(b) || String(a.service_name||a.service_code).localeCompare(String(b.service_name||b.service_code)));
  },[services,search]);
  const displayedServices = visibleServices.slice(0,36);
  const selected = services.find(item => item.service_code === selectedCode) || null;
  const periods = (selected?.periods || []).filter(item => item.is_available !== false);
  const selectedPeriod = periods.find(item => Number(item.duration_minutes) === duration) || periods[0] || null;

  function chooseService(item:StoreRentalService) {
    setSelectedCode(item.service_code);
    const first = (item.periods || []).find(period => period.is_available !== false);
    setDuration(Number(first?.duration_minutes || 0));
    requestKey.current = "";
  }

  async function submit(event:FormEvent) {
    event.preventDefault();
    if (busy || !selected || !selectedPeriod) return;
    if (!storeToken(slug)) { router.push(`/store/${slug}`); return; }
    setBusy(true); setMessage(""); setIsError(false);
    if (!requestKey.current) requestKey.current = newStoreRentalRequestKey(slug);
    try {
      const result = await storeRentalRequest<any>(slug,"rentals/buy",{
        method:"POST",
        body:JSON.stringify({
          store_slug:slug,
          country_code:selected.country_code || country,
          service_code:selected.service_code,
          duration_minutes:Number(selectedPeriod.duration_minutes),
          request_key:requestKey.current,
        }),
      });
      const completed = purchaseRental(result);
      if (!completed?.phone_number) throw new StoreRentalError(502,"RENTAL_NUMBER_MISSING",result);
      setRental(completed);
      const nextBalance = result?.wallet?.balance ?? result?.wallet_balance_ngn ?? result?.balance_ngn;
      if (Number.isFinite(Number(nextBalance))) setBalance(Number(nextBalance));
      requestKey.current = "";
    } catch (error) {
      setIsError(true);
      setMessage(error instanceof Error ? error.message : "Unable to rent this number right now. Please try again.");
      if (error instanceof StoreRentalError && error.code !== "PROVIDER_TIMEOUT") requestKey.current = "";
    } finally { setBusy(false); }
  }

  if (rental) {
    const reference = rentalReference(rental);
    const expires = rentalExpiry(rental);
    return <main className={`${styles.page} storeRentalPage`}><div className={styles.shell}>
      <header className={styles.topbar}><button className={styles.back} onClick={()=>setRental(null)} aria-label="Back">‹</button><div><h1>Rental Active</h1><p>Your number is ready</p></div><div className={styles.wallet}><small>Balance</small><b>{balance===null?"—":moneyNgn(balance)}</b></div></header>
      <section className={styles.success}><div className={styles.successMark}>✓</div><h2>Rental Active</h2><p>The number was saved under My Rentals.</p><div className={styles.number}>{rental.phone_number}</div><div className={styles.facts}><div className={styles.fact}><span>Service</span><b>{rental.service_name||selected?.service_name||rental.service_code}</b></div><div className={styles.fact}><span>Country</span><b>{rental.country_name||selected?.country_name||rental.country_code}</b></div><div className={styles.fact}><span>Expires</span><b>{expires?new Date(expires).toLocaleString():"—"}</b></div><div className={styles.fact}><span>Time remaining</span><b>{remainingLabel(expires,now)}</b></div></div><div className={styles.actions}><button className={styles.primary} onClick={()=>navigator.clipboard?.writeText(String(rental.phone_number||""))}>Copy Number</button><button className={styles.ghost} onClick={()=>router.push(`/store/${slug}/rentals/${encodeURIComponent(reference)}`)}>Check SMS</button><button className={styles.secondary} onClick={()=>router.push(`/store/${slug}/rentals/${encodeURIComponent(reference)}`)}>View Rental</button></div></section>
      <div className={styles.navLinks}><Link href={`/store/${slug}`}>Store home</Link><Link href={`/store/${slug}/rentals`}>My Rentals</Link></div>
    </div></main>;
  }

  return <main className={`${styles.page} storeRentalPage`}><div className={styles.shell}>
    <header className={styles.topbar}><button className={styles.back} onClick={()=>router.push(`/store/${slug}`)} aria-label="Back">‹</button><div><h1>Rent Number</h1><p>Longer-term SMS access</p></div><button className={styles.wallet} onClick={()=>router.push(`/store/${slug}`)}><small>Wallet</small><b>{balance===null?"Sign in":moneyNgn(balance)}</b></button></header>
    <div className={styles.navLinks}><Link href={`/store/${slug}`}>Store home</Link><Link href={`/store/${slug}/rentals`}>My Rentals</Link></div>
    {message&&<div className={`${styles.notice} ${isError?styles.error:""}`} role="status">{message}</div>}
    <form onSubmit={submit}>
      <section className={styles.panel}><div className={styles.split}><label><span className={styles.label}>Country</span><div className={styles.countryField}><span aria-hidden="true">{countryFlag(country||"US")}</span><select className={styles.select} value={country} onChange={event=>{const next=event.target.value;setCountry(next);setSelectedCode("");requestKey.current="";void loadCatalog(next,false)}} disabled={loading}>{countries.length?countries.map(item=><option key={item.country_code} value={item.country_code}>{item.country_name||item.country_code}</option>):<option value={country||"US"}>USA</option>}</select></div></label><label><span className={styles.label}>Search service</span><div className={styles.searchField}><span aria-hidden="true">⌕</span><input className={styles.search} value={search} onChange={event=>setSearch(event.target.value)} placeholder="WhatsApp, Telegram, Instagram…" /></div></label></div>
        <div className={styles.panelHead}><div><span className={styles.label}>Services</span><small>{loading?"Loading live services…":`${visibleServices.length.toLocaleString()} available`}</small></div>{!loading&&search&&<button type="button" onClick={()=>setSearch("")}>Clear</button>}</div>
        {loading?<div className={styles.services}>{Array.from({length:6}).map((_,index)=><div className={styles.serviceSkeleton} key={index}><span/><div><i/><i/></div></div>)}</div>:visibleServices.length?<><div className={styles.services}>{displayedServices.map(item=>{const price=lowestPrice(item);const optionCount=(item.periods||[]).filter(p=>p.is_available!==false).length;return <button type="button" key={`${item.country_code||country}-${item.service_code}`} className={`${styles.serviceCard} ${selectedCode===item.service_code?styles.active:""}`} onClick={()=>chooseService(item)}><RentalIcon code={item.service_code} name={item.service_name} url={item.icon_url}/><span><b>{item.service_name||item.service_code}</b><small>{item.available===false?"Unavailable":`${price!==null?`From ${moneyNgn(price)} · `:""}${optionCount} option${optionCount===1?"":"s"}`}</small></span><em aria-hidden="true">›</em></button>})}</div>{visibleServices.length>displayedServices.length&&<p className={styles.muted}>Showing 36 services. Search the platform name to find any of the other supported services.</p>}</>:<div className={styles.empty}>No rental services match your search.</div>}
      </section>
      {selected&&<section className={styles.panel}><div className={styles.durationHead}><div><span className={styles.label}>Rental duration</span><small>{selected.service_name||selected.service_code}</small></div><RentalIcon code={selected.service_code} name={selected.service_name} url={selected.icon_url}/></div>{periods.length?<div className={styles.periods}>{periods.map((period:StoreRentalPeriod)=><button type="button" key={period.duration_minutes} className={`${styles.period} ${Number(period.duration_minutes)===Number(selectedPeriod?.duration_minutes)?styles.active:""}`} onClick={()=>{setDuration(Number(period.duration_minutes));requestKey.current=""}}><b>{period.duration_label||`${period.duration_minutes} minutes`}</b><small>{moneyNgn(period.price_ngn)}</small></button>)}</div>:<div className={styles.empty}>No rental duration is currently available.</div>}</section>}
      <div className={`${styles.purchaseBar} storeRentalPurchaseBar`}><div><span>Customer price</span><strong>{moneyNgn(selectedPeriod?.price_ngn)}</strong></div><button className={styles.primary} disabled={busy||loading||!selectedPeriod} type="submit">{busy?"Renting…":storeToken(slug)?"Rent Number":"Sign in to rent"}</button></div>
    </form>
  </div></main>;
}
