import type { Metadata } from "next";
import MarketplaceClient from "./MarketplaceClient";

export const metadata: Metadata = {
  title: "Digital Products Marketplace",
  description: "Browse currently available digital products on the WickSpend Marketplace. Product availability, pricing and delivery status are checked through the live marketplace system.",
  alternates: { canonical: "/marketplace" },
  openGraph: {
    title: "Digital Products Marketplace | WickSpend",
    description: "Browse currently available WickSpend Marketplace products with live price and availability checks.",
    url: "/marketplace",
    type: "website",
  },
};

const API_BASE=(process.env.NEXT_PUBLIC_WICKSPEND_API_BASE||"https://n8n.wickspend.com/webhook").replace(/\/$/,"");
function listOf(x:any){return Array.isArray(x)?x:Array.isArray(x?.products)?x.products:Array.isArray(x?.items)?x.items:Array.isArray(x?.data)?x.data:Array.isArray(x?.data?.products)?x.data.products:[]}
function idOf(p:any){return String(p?.product_id??p?.id??p?.code??"")}
function stockOf(p:any){const raw=p?.remaining_stock??p?.available_inventory??p?.inventory_available??p?.stock??p?.quantity_available??p?.available_stock??p?.stock_quantity??p?.available??null;const n=Number(raw);return raw!==null&&raw!==undefined&&raw!==""&&Number.isFinite(n)?n:null}
function isInStock(p:any){if(p?.in_stock===false||p?.inStock===false||p?.available===false)return false;const stock=stockOf(p);if(stock!==null)return stock>0;return true}
async function getJson(path:string){try{const r=await fetch(`${API_BASE}/${path}`,{next:{revalidate:120}});return r.ok?await r.json():null}catch{return null}}
async function initialMarketplaceProducts(){
  const [provider,manual]=await Promise.all([
    getJson("wickspend/backend/marketplace/products?page=1&limit=40"),
    getJson("wickspend/backend/marketplace/manual-products?page=1&limit=40"),
  ]);
  const seen=new Set<string>(),out:any[]=[];
  for(const p of [...listOf(manual),...listOf(provider)]){const id=idOf(p);if(!id||seen.has(id)||!isInStock(p))continue;seen.add(id);out.push(p);if(out.length>=40)break}
  return out;
}

export default async function MarketplacePage(){
  const products=await initialMarketplaceProducts();
  const breadcrumb={"@context":"https://schema.org","@type":"BreadcrumbList",itemListElement:[
    {"@type":"ListItem",position:1,name:"WickSpend",item:"https://wickspend.com/"},
    {"@type":"ListItem",position:2,name:"Marketplace",item:"https://wickspend.com/marketplace"},
  ]};
  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(breadcrumb)}}/>
    <MarketplaceClient initialProducts={products}/>
    <section className="seoContent" aria-label="Marketplace guide">
      <h2>What to expect from the Marketplace</h2>
      <p>WickSpend combines provider-backed and Admin-managed digital products in the existing Marketplace catalog. Categories and current products can change as inventory changes.</p>
      <h2>Purchasing and delivery</h2>
      <p>Open a product to review its current details. WickSpend verifies live data before purchase, records the order, and shows delivery or provider-confirmation status in Orders. Manual-delivery products remain tied to the purchasing account.</p>
      <h2>Marketplace availability</h2>
      <p>If the live catalog is temporarily unavailable, this page remains readable without claiming that any particular item is in stock. Refresh the catalog before relying on price or availability.</p>
      <h2>Marketplace FAQ</h2>
      <details><summary>Are Marketplace prices permanent?</summary><p>No. Product pricing is supplied by the existing live catalog and can change.</p></details>
      <details><summary>Where do I track an order?</summary><p>Use <a href="/orders">Orders</a> after purchase to follow the recorded order and delivery state.</p></details>
      <nav className="seoRelatedLinks" aria-label="Related WickSpend pages"><a href="/tutorials">View tutorials</a><a href="/buy-number">Buy Number</a><a href="/boostly">Boostly</a></nav>
    </section>
  </>;
}
