"use client";

import Link from "next/link";
import {useEffect,useMemo,useState} from "react";
import {BottomNav} from "@/components/BottomNav";
import {api} from "@/lib/api";
import {getSessionToken} from "@/lib/session";
import styles from "./marketplace.module.css";

const idOf=(p:any)=>String(p?.product_id??p?.id??p?.code??"");
const nameOf=(p:any)=>String(p?.name??p?.title??p?.product_name??"Product");
const stockOf=(p:any)=>{const raw=p?.stock??p?.quantity_available??p?.available_stock??p?.available??null;const n=Number(raw);return raw!==null&&Number.isFinite(n)?n:null};
const priceOf=(p:any)=>{const raw=p?.price_ngn??p?.final_price_ngn??p?.customer_price_ngn??null;const n=Number(raw);return raw!==null&&Number.isFinite(n)?n:null};
const imageUrlOf=(p:any)=>typeof p?.imageUrl==="string"&&p.imageUrl.trim()?p.imageUrl.trim():null;
const money=(n:number|null)=>n===null?"—":`₦${n.toLocaleString(undefined,{maximumFractionDigits:0})}`;
const statusOf=(x:any)=>String(x?.status??x?.state??x?.order_status??"").toLowerCase();
const refOf=(x:any)=>String(x?.reference??x?.order_reference??x?.order_id??x?.id??"");
const listOf=(x:any)=>Array.isArray(x)?x:Array.isArray(x?.products)?x.products:Array.isArray(x?.items)?x.items:Array.isArray(x?.data)?x.data:Array.isArray(x?.data?.products)?x.data.products:[];

const categoryLabel=(p:any)=>{
 const c=String(p?.category??"").toLowerCase();
 if(["facebook","instagram","tiktok","x","reddit","dating"].includes(c))return"SOCIAL ACCOUNTS";
 if(c==="email")return"DIGITAL ACCOUNTS";
 if(c==="vpn_proxy")return"TOOLS";
 return"MARKETPLACE";
};

const countryOf=(p:any)=>{
 const s=nameOf(p).toUpperCase();
 const known:[RegExp,string][]=[
  [/\bUSA\b|UNITED STATES|🇺🇸/,"United States"],[/\bUK\b|UNITED KINGDOM|🇬🇧/,"United Kingdom"],
  [/NIGERIA|🇳🇬/,"Nigeria"],[/CANADA|🇨🇦/,"Canada"],[/GERMANY|🇩🇪/,"Germany"],[/POLAND|🇵🇱/,"Poland"],
  [/AUSTRALIA|🇦🇺/,"Australia"],[/JAPAN|🇯🇵/,"Japan"],[/INDIA|🇮🇳/,"India"],[/ITALY|🇮🇹/,"Italy"],
  [/SPAIN|🇪🇸/,"Spain"],[/THAILAND|🇹🇭/,"Thailand"],[/VIETNAM|🇻🇳/,"Vietnam"],[/INDONESIA|🇮🇩/,"Indonesia"],
  [/CZECH REPUBLIC|🇨🇿/,"Czech Republic"],[/PHILIPPINES|🇵🇭/,"Philippines"],[/TAIWAN|🇹🇼/,"Taiwan"],[/KOREA|🇰🇷/,"Korea"]
 ];
 return known.find(([re])=>re.test(s))?.[1]??null;
};

function ProductFallbackIcon(){
 return <span className={styles.fallbackIcon} aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><path d="M5.5 7.5 12 4l6.5 3.5v9L12 20l-6.5-3.5v-9Z"/><path d="m5.8 7.6 6.2 3.5 6.2-3.5M12 11.1V20"/></svg></span>;
}

function ProductVisual({product}:{product:any}){
 const[srcFailed,setSrcFailed]=useState(false),src=imageUrlOf(product);
 if(!src||srcFailed)return <div className={styles.productIcon}><ProductFallbackIcon/></div>;
 return <div className={styles.productIcon}><img src={src} alt="" onError={()=>setSrcFailed(true)}/></div>;
}

function ProductCard({product,busy,onView}:{product:any;busy:boolean;onView:(p:any)=>void}){
 const stock=stockOf(product),price=priceOf(product),country=countryOf(product);
 return <article className={styles.productCard}>
  <div className={styles.cardTop}>
   <ProductVisual product={product}/>
   <div className={styles.cardCopy}>
    <span>{categoryLabel(product)}</span>
    <h3 title={nameOf(product)}>{nameOf(product)}</h3>
    {country&&<p>{country}</p>}
    <p className={stock===0?styles.stockOut:styles.stockLine}><i/>{stock===null?"Live stock":stock>0?`${stock} in stock`:"Out of stock"}</p>
   </div>
  </div>
  <div className={styles.cardBottom}>
   <strong>{money(price)}</strong>
   <button type="button" disabled={busy} onClick={()=>onView(product)}>View</button>
  </div>
 </article>;
}

function SkeletonCard(){return <article className={`${styles.productCard} ${styles.skeletonCard}`}><div className={styles.cardTop}><div className={`${styles.productIcon} ${styles.skeleton}`}/><div className={styles.cardCopy}><span className={`${styles.skeleton} ${styles.skCategory}`}/><h3 className={`${styles.skeleton} ${styles.skTitle}`}/><p className={`${styles.skeleton} ${styles.skMeta}`}/><p className={`${styles.skeleton} ${styles.skStock}`}/></div></div><div className={styles.cardBottom}><strong className={`${styles.skeleton} ${styles.skPrice}`}/><span className={`${styles.skeleton} ${styles.skButton}`}/></div></article>}

export default function Marketplace(){
 const[products,setProducts]=useState<any[]>([]),[selected,setSelected]=useState<any|null>(null),[query,setQuery]=useState(""),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[message,setMessage]=useState(""),[confirm,setConfirm]=useState(false),[result,setResult]=useState<any|null>(null);
 useEffect(()=>{let cancelled=false;(async()=>{setLoading(true);try{const d:any=await api.marketplace.products({page:1,limit:50});if(cancelled)return;setProducts(listOf(d).filter((p:any)=>idOf(p)));setMessage("")}catch(e){if(!cancelled){setProducts([]);setMessage(e instanceof Error?e.message:"Marketplace unavailable right now.")}}finally{if(!cancelled)setLoading(false)}})();return()=>{cancelled=true}},[]);
 const shown=useMemo(()=>{const q=query.trim().toLowerCase();return q?products.filter(p=>[nameOf(p),p?.category,p?.description].filter(Boolean).join(" ").toLowerCase().includes(q)):products},[products,query]);
 const sections=useMemo(()=>{
  if(query.trim())return[{title:"Search results",subtitle:`${shown.length} matching live product${shown.length===1?"":"s"}`,items:shown}];
  const byStock=[...shown].sort((a,b)=>(stockOf(b)??0)-(stockOf(a)??0));
  const used=new Set<string>();
  const take=(source:any[],count=6)=>source.filter(p=>!used.has(idOf(p))).slice(0,count).map(p=>(used.add(idOf(p)),p));
  const featured=take(byStock);
  const popular=take(shown);
  const newest=take([...shown].sort((a,b)=>Number(idOf(b))-Number(idOf(a))));
  const recommended=take([...shown].sort((a,b)=>categoryLabel(a).localeCompare(categoryLabel(b))||nameOf(a).localeCompare(nameOf(b))));
  return [
   {title:"Featured",subtitle:"Premium picks with strong live availability",items:featured},
   {title:"Popular",subtitle:"More live picks from the current catalog",items:popular},
   {title:"New",subtitle:"Recently listed live inventory",items:newest},
   {title:"Recommended",subtitle:"More products you may like",items:recommended}
  ].filter(s=>s.items.length);
 },[shown,query]);
 async function open(p:any){if(busy)return;setBusy(true);setMessage("");try{const d:any=await api.marketplace.product(idOf(p));setSelected(d?.product??d?.data?.product??d?.data??d??p)}catch(e){setMessage(e instanceof Error?e.message:"Unable to load product details.")}finally{setBusy(false)}}
 async function purchase(){if(!selected||busy)return;const token=getSessionToken();if(!token){setConfirm(false);setMessage("Please sign in before purchasing.");return}setBusy(true);setMessage("");try{const r:any=await api.marketplace.reserve(token,{product_id:idOf(selected),quantity:1});setResult(r);setConfirm(false)}catch(e){setConfirm(false);setMessage(e instanceof Error?e.message:"Unable to submit this Marketplace order.")}finally{setBusy(false)}}
 const resultStatus=statusOf(result),resultRef=refOf(result),pending=!!result&&(result?.provider_pending===true||/processing|pending|queued|confirming/.test(resultStatus)),failed=!!result&&/failed|rejected|cancelled|canceled|error/.test(resultStatus),confirmed=!!result&&!pending&&!failed&&(!!resultRef||/success|successful|completed|delivered|active/.test(resultStatus));
 if(result)return <main className={`${styles.screen} ${styles.stateScreen}`}><header className={styles.topHeader}><div><h1>Marketplace</h1><p>Order status</p></div><Link href="/orders" className={styles.ordersButton}>Orders</Link></header><section className={styles.stockCard}><span>{pending?"PROCESSING":failed?"NOT COMPLETED":confirmed?"ORDER SUBMITTED":"STATUS"}</span><h2>{pending?"We’re confirming your order":failed?"Marketplace order not completed":confirmed?"Order submitted":"Order status unavailable"}</h2><b>{nameOf(selected)}</b><strong>{money(priceOf(selected))}</strong></section><section className={styles.detailCopy}><h3>{pending?"Provider confirmation pending":failed?"No success claimed":"Track this order"}</h3><p>{pending?"Your request was accepted and is still being confirmed. Do not place a duplicate order.":failed?"The provider did not confirm a successful order. Check Orders and your wallet before trying again.":confirmed?`Reference${resultRef?` • ${resultRef}`:" available in Orders"}. Delivery status will be shown from the backend.`:"The backend response did not contain enough information to confirm completion."}</p></section><Link href={resultRef?`/orders?reference=${encodeURIComponent(resultRef)}`:"/orders"} className={styles.notifyButton}>View Orders</Link><button className={styles.notifyButton} type="button" onClick={()=>{setResult(null);setSelected(null)}}>Back to Marketplace</button><BottomNav/></main>;
 if(selected){const stock=stockOf(selected),price=priceOf(selected);return <main className={`${styles.screen} ${styles.detailScreen}`}><header className={styles.topHeader}><div><h1>Marketplace</h1><p>Product details</p></div><Link href="/orders" className={styles.ordersButton}>Orders</Link></header><button className={styles.backLink} type="button" onClick={()=>setSelected(null)}>‹ Back to Marketplace</button><section className={styles.heroCard}><span>LIVE PRODUCT</span><h2>{nameOf(selected)}</h2><p>{categoryLabel(selected)}</p><div><strong>{money(price)}</strong><b>{stock===null?"Stock from provider":stock>0?`${stock} in stock`:"Out of stock"}</b></div></section><section className={styles.detailCopy}><h3>About this product</h3><p>{selected?.description||"Live Marketplace product details supplied by the WickSpend backend."}</p></section><section className={styles.detailCopy}><h3>Live pricing & availability</h3><p>Price and stock are loaded from the verified Marketplace backend before purchase. Final order status is confirmed by the provider workflow.</p></section><div className={styles.purchaseRow}><div className={styles.qtyBlock}><label>Quantity</label><div><button disabled>−</button><strong>1</strong><button disabled>＋</button></div></div><button className={styles.saveButton} type="button" onClick={()=>setSelected(null)}>Cancel</button><button className={styles.buyNow} type="button" disabled={busy||price===null||stock===0} onClick={()=>setConfirm(true)}>{busy?"Loading…":"Buy now"}</button></div>{message&&<p className={styles.centerNotice}>{message}</p>}{confirm&&<div className={styles.confirmBackdrop}><section className={styles.confirmSheet}><h2>Confirm purchase</h2><div className={styles.confirmRows}><div><span>Product</span><strong>{nameOf(selected)}</strong></div><div><span>Quantity</span><strong>1</strong></div><div><span>Total</span><strong>{money(price)}</strong></div><div><span>Stock</span><strong>{stock===null?"Provider checked":`${stock} in stock`}</strong></div></div><button className={styles.confirmButton} type="button" disabled={busy} onClick={purchase}>{busy?"Processing…":"Confirm & Pay"}</button><button className={styles.cancelButton} type="button" disabled={busy} onClick={()=>setConfirm(false)}>Cancel</button></section></div>}<BottomNav/></main>}
 return <main className={styles.screen}><header className={styles.topHeader}><div><h1>Marketplace</h1><p>Premium digital products, one clean checkout.</p></div><Link href="/orders" className={styles.ordersButton}>Orders</Link></header><label className={styles.searchBox}><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search live Marketplace products" aria-label="Search Marketplace"/></label>{loading?<section className={styles.productSection}><div className={styles.sectionTitle}><h2>Loading Marketplace</h2><p>Checking current products, prices and stock.</p></div><div className={styles.productGrid}>{Array.from({length:6}).map((_,i)=><SkeletonCard key={i}/>)}</div></section>:message?<div className={styles.emptyState}><strong>Marketplace unavailable</strong><p>{message}</p></div>:shown.length?sections.map(section=><section className={styles.productSection} key={section.title}><div className={styles.sectionTitle}><h2>{section.title}</h2><p>{section.subtitle}</p></div><div className={styles.productGrid}>{section.items.map(p=><ProductCard key={idOf(p)} product={p} busy={busy} onView={open}/>)}</div></section>):<div className={styles.emptyState}><strong>No products found</strong><p>{query?"Try another search.":"No live Marketplace products are available right now."}</p></div>}<BottomNav/></main>;
}
