"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { wickspendApi } from "@/lib/api";
import { getSessionToken } from "@/lib/session";
import styles from "./admin-marketplace.module.css";

type Mode = "products" | "add" | "orders";
type Audience = "admin" | "staff";
const categories = ["Facebook","Instagram","TikTok","Gmail","Telegram","X/Twitter","VPN","Proxy","Software","Digital Tools","E-books","Courses","Templates","Other"];
const deliveryTypes = [["manual_text","Manual Text Delivery"],["upload_file","Upload File"],["inventory","Item Delivery (one item per sale)"],["external_link","External Download Link"],["manual_fulfillment","Manual Fulfillment"]] as const;
const money = (v: any) => `₦${Number(v || 0).toLocaleString(undefined,{maximumFractionDigits:0})}`;
const readDataUrl = (file: File) => new Promise<string>((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result||""));r.onerror=()=>reject(r.error);r.readAsDataURL(file)});
const readText = (file: File) => new Promise<string>((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result||""));r.onerror=()=>reject(r.error);r.readAsText(file)});

async function adminApi(path:string,init:RequestInit={}) {
  const token=getSessionToken();
  if(!token) throw new Error("Please sign in with an authorized WickSpend account.");
  return wickspendApi(path,{...init,token,preserveSessionOn401:true});
}

async function marketplaceMutate(body:Record<string,unknown>) {
  const token=getSessionToken();
  if(!token) throw new Error("Please sign in with an authorized WickSpend account.");
  const response=await fetch("/api/admin/marketplace/product",{method:"POST",cache:"no-store",headers:{Accept:"application/json","Content-Type":"application/json",Authorization:`Bearer ${token}`},body:JSON.stringify(body)});
  const payload:any=await response.json().catch(()=>null);
  if(!response.ok||payload?.ok===false){
    const code=String(payload?.code||"").replaceAll("_"," ").toLowerCase();
    throw new Error(code?code.charAt(0).toUpperCase()+code.slice(1):"Unable to save Marketplace product.");
  }
  return payload;
}

function Header({title,subtitle,backHref="/admin/menu"}:{title:string;subtitle:string;backHref?:string}) {
  return <div className={styles.top}><Link href={backHref} className={styles.back} aria-label="Back">‹</Link><div className={styles.heading}><h1>{title}</h1><p>{subtitle}</p></div></div>;
}
function Products({audience}:{audience:Audience}) {
  const base=audience==="staff"?"/staff/marketplace":"/admin/marketplace";
  const [products,setProducts]=useState<any[]>([]),[query,setQuery]=useState(""),[status,setStatus]=useState("all"),[category,setCategory]=useState("all"),[message,setMessage]=useState("Loading products…"),[busy,setBusy]=useState("");
  async function load(){try{const d:any=await adminApi(`wickspend/backend/admin/marketplace/products?search=${encodeURIComponent(query)}&status=${encodeURIComponent(status)}`);setProducts(Array.isArray(d?.products)?d.products:[]);setMessage("")}catch(e){setMessage(e instanceof Error?e.message:"Unable to load products")}}
  useEffect(()=>{void load()},[status]);
  const totals=useMemo(()=>({active:products.filter(p=>p.status==="active").length,out:products.filter(p=>p.status==="out_of_stock").length,draft:products.filter(p=>p.status==="draft").length,sold:products.reduce((n,p)=>n+Number(p.sold_quantity||0),0),revenue:products.reduce((n,p)=>n+Number(p.revenue_ngn||0),0)}),[products]);
  const visibleProducts=useMemo(()=>category==="all"?products:products.filter(p=>String(p.category||"")===category),[products,category]);
  async function changeStatus(p:any,nextStatus:string){setBusy(String(p.id));try{await adminApi("wickspend/backend/admin/marketplace/product",{method:"POST",body:JSON.stringify({action:"status",product_id:p.id,status:nextStatus})});await load()}catch(e){setMessage(e instanceof Error?e.message:"Unable to update product")}finally{setBusy("")}}
  return <><Header title="Marketplace Products" subtitle={audience==="staff"?"Manage the products you are authorized to maintain":"Manage manually uploaded WickSpend products"} backHref={audience==="staff"?"/staff/marketplace":"/admin/menu"}/>
    <div className={styles.actions}><Link className={styles.primary} href={`${base}/add?v=price-edit-20260922`}>Add Product</Link>{audience==="admin"&&<Link className={styles.secondary} href={`${base}/orders`}>Orders</Link>}</div>
    <section className={styles.summary}>{audience==="staff"?<><div className={styles.card}><strong>{products.length}</strong><span>Total products</span></div><div className={styles.card}><strong>{totals.active}</strong><span>Active</span></div><div className={styles.card}><strong>{totals.out}</strong><span>Out of stock</span></div><div className={styles.card}><strong>{totals.draft}</strong><span>Draft / unpublished</span></div></>:<><div className={styles.card}><strong>{products.length}</strong><span>Manual products</span></div><div className={styles.card}><strong>{totals.sold}</strong><span>Sold quantity</span></div><div className={styles.card}><strong>{money(totals.revenue)}</strong><span>Revenue</span></div></>}</section>
    <div className={styles.toolbar}><input className={styles.search} value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")void load()}} placeholder="Search products"/><select className={styles.select} value={category} onChange={e=>setCategory(e.target.value)}><option value="all">All categories</option>{categories.map(c=><option value={c} key={c}>{c}</option>)}</select><select className={styles.select} value={status} onChange={e=>setStatus(e.target.value)}><option value="all">All statuses</option><option value="active">Active</option><option value="draft">Draft</option><option value="out_of_stock">Out of Stock</option><option value="disabled">Disabled</option></select><button className={styles.secondary} onClick={()=>void load()}>Search</button></div>
    {message&&<p className={styles.message}>{message}</p>}<div className={styles.grid}>{visibleProducts.map(p=><article className={`${styles.card} ${styles.product}`} key={p.id}>{p.image_url?<img className={styles.thumb} src={p.image_url} alt=""/>:<div className={styles.thumbFallback}>WS</div>}<div className={styles.copy}><h3>{p.name}</h3><p>{p.category} · {money(p.price_ngn)}</p><div className={styles.meta}><span className={styles.pill}>{String(p.status).replaceAll("_"," ")}</span><span className={styles.pill}>{p.stock_type==="unlimited"?"Unlimited":`${p.remaining_stock??0} remaining`}</span>{audience==="admin"&&<span className={styles.pill}>{Number(p.sold_quantity||0)} sold</span>}</div></div><div className={styles.rowActions}><Link className={styles.secondary} href={`${base}/add?edit=${p.id}&v=price-edit-20260922`}>Edit</Link><Link className={styles.primary} href={`${base}/add?inventory=${p.id}&v=price-edit-20260922`}>Add Items</Link>{p.status==="draft"&&<button className={styles.primary} disabled={busy===String(p.id)} onClick={()=>void changeStatus(p,"active")}>Publish</button>}{p.status==="active"&&<button className={styles.secondary} disabled={busy===String(p.id)} onClick={()=>void changeStatus(p,"draft")}>Unpublish</button>}<button className={p.status==="disabled"?styles.primary:styles.danger} disabled={busy===String(p.id)} onClick={()=>void changeStatus(p,p.status==="disabled"?"active":"disabled")}>{p.status==="disabled"?"Enable":"Disable"}</button></div></article>)}{!message&&!products.length&&<div className={`${styles.card} ${styles.empty}`}><strong>No manual products</strong><span>Create the first product from Add Product.</span></div>}</div>
  </>;
}

function AddProduct({audience}:{audience:Audience}) {
  type InventoryKind="text"|"license_key"|"redeem_code"|"link"|"file";
  type StagedItem={kind:InventoryKind;value:string};
  const base=audience==="staff"?"/staff/marketplace":"/admin/marketplace";
  const productsHref=audience==="staff"?"/staff/marketplace/products":"/admin/marketplace";
  const [form,setForm]=useState<any>({name:"",category:"Facebook",short_description:"",description:"",image_url:"",price_ngn:"",stock_type:"unlimited",stock_quantity:"0",delivery_type:"manual_text",status:"draft",delivery_text:"",external_url:"",inventory_kind:"text",item_text:"",file_name:"",file_type:"",file_data:""});
  const [message,setMessage]=useState(""),[itemError,setItemError]=useState(""),[busy,setBusy]=useState(false),[editId,setEditId]=useState(""),[inventoryId,setInventoryId]=useState("");
  const [stagedItems,setStagedItems]=useState<StagedItem[]>([]),[targetProduct,setTargetProduct]=useState<any>(null);
  const addLockRef=useRef(false),saveLockRef=useRef(false);
  const set=(k:string,v:any)=>setForm((f:any)=>({...f,[k]:v}));
  const setPrice=(raw:string)=>{const cleaned=raw.replace(/[^0-9.]/g,"");const [whole,...rest]=cleaned.split(".");set("price_ngn",rest.length?`${whole}.${rest.join("").slice(0,2)}`:whole)};
  const itemKind=String(form.inventory_kind||"text") as InventoryKind;
  function validateItem(value:string,_kind:InventoryKind,_isCsv=false){const v=value.trim();if(!v)return "Item text is required.";return ""}
  const pendingValues=()=>String(form.item_text||"").split(/\r?\n/).map((x:string)=>x.trim()).filter(Boolean);
  const detectedCount=pendingValues().length;
  function toInventoryPayload(item:StagedItem){return item.kind==="link"?{type:"link",url:item.value}:item.kind==="file"?{type:"file",url:item.value}:{type:item.kind,value:item.value}}
  const inventoryItems=()=>stagedItems.map(toInventoryPayload);

  async function loadProduct(id:string,forEdit=false){const d:any=await adminApi("wickspend/backend/admin/marketplace/products");const p=(d?.products||[]).find((x:any)=>String(x.id)===id);if(!p)throw new Error("Marketplace product not found.");if(forEdit){const dp=audience==="admin"?(p.delivery_payload||{}):{};setForm((f:any)=>({...f,...p,price_ngn:String(p.price_ngn??0),stock_quantity:String(p.remaining_stock??p.stock_quantity??0),delivery_text:String(dp.text||""),external_url:String(dp.url||""),file_name:String(dp.filename||""),file_type:String(dp.mime_type||""),file_data:String(dp.data_url||"")}))}else setTargetProduct(p);return p}
  useEffect(()=>{const q=new URLSearchParams(window.location.search),edit=q.get("edit")||"",inventory=q.get("inventory")||"";setEditId(edit);setInventoryId(inventory);if(edit||inventory){void loadProduct(edit||inventory,!!edit).catch(e=>setMessage(e instanceof Error?e.message:"Unable to load product"))}},[]);
  async function imageFile(file?:File){if(!file)return;if(file.size>2_000_000){setMessage("Product image must be 2 MB or smaller.");return}set("image_url",await readDataUrl(file))}
  async function deliveryFile(file?:File){if(!file)return;if(file.size>8_000_000){setMessage("Digital file must be 8 MB or smaller for secure database delivery.");return}set("file_name",file.name);set("file_type",file.type||"application/octet-stream");set("file_data",await readDataUrl(file))}
  async function inventoryFile(file?:File){if(!file)return;setItemError("");setMessage("");try{const lower=file.name.toLowerCase();if(!lower.endsWith(".txt")&&!lower.endsWith(".csv"))throw new Error("Choose a .txt or .csv file.");if(file.size>1_000_000)throw new Error("Inventory file must be 1 MB or smaller.");const raw=await readText(file);let lines=raw.split(/\r?\n/).map(x=>x.trim()).filter(Boolean);if(lines.length&&/^(value|code|key|url)$/i.test(lines[0].replace(/[\"']/g,"")))lines=lines.slice(1);const next:StagedItem[]=[];for(const line of lines){const value=line.replace(/^\"|\"$/g,"").trim();const err=validateItem(value,itemKind,lower.endsWith(".csv"));if(err)throw new Error(err);next.push({kind:itemKind,value})}if(!next.length)throw new Error("No valid inventory items were found in that file.");setStagedItems(prev=>[...prev,...next]);setMessage(`${next.length} entr${next.length===1?"y":"ies"} imported.`)}catch(e){setMessage(e instanceof Error?e.message:"Unable to import inventory file")}}
  function addItem(){if(addLockRef.current)return;const values=pendingValues();if(!values.length){setItemError("Item text is required.");return}addLockRef.current=true;setStagedItems(prev=>[...prev,...values.map(value=>({kind:itemKind,value}))]);setForm((f:any)=>({...f,item_text:""}));setItemError("");setMessage(`${values.length} item${values.length===1?"":"s"} staged.`);window.setTimeout(()=>{addLockRef.current=false},250)}
  function removeItem(index:number){setStagedItems(prev=>prev.filter((_,i)=>i!==index));setMessage("")}
  const typeLabel=(kind:InventoryKind)=>({text:"Text item",license_key:"License key",redeem_code:"Redeem code",link:"Download link",file:"File URL"}[kind]);
  const itemComposer=<div className={styles.itemComposer}>
    <label>Add Items</label>
    <textarea className={styles.textarea} value={form.item_text} onChange={e=>{set("item_text",e.target.value);if(e.target.value.trim()){addLockRef.current=false;setItemError("")}}} placeholder={"Paste one or many items — one item per line\nItem 1\nItem 2\nItem 3"} rows={5} autoComplete="off"/>
    <div className={styles.detectRow}><span>{detectedCount} item{detectedCount===1?"":"s"} detected</span><button type="button" className={styles.primary} disabled={detectedCount===0} onClick={addItem}>+ Add{detectedCount>1?` ${detectedCount} Items`:""}</button></div>
    {itemError&&<p className={styles.fieldError} role="alert">{itemError}</p>}
    {stagedItems.length>0&&<><div className={styles.stagedHeader}><label>Added Items</label><span>{stagedItems.length} staged</span></div><div className={styles.stagedList}>{stagedItems.map((item,index)=><div className={styles.stagedItem} key={`${item.kind}-${index}-${item.value}`}><div><strong>{index+1}. {typeLabel(item.kind)}</strong><span className={styles.stagedValue}>{item.value}</span></div><button type="button" className={styles.removeItem} onClick={()=>removeItem(index)} aria-label={`Remove item ${index+1}`}>Remove</button></div>)}</div></>}
    <p className={styles.help}>Paste multiple items together. Every non-empty line is automatically counted as one item, and each staged item keeps the selected type.</p>
  </div>;

  async function save(){
    if(saveLockRef.current)return;
    saveLockRef.current=true;setBusy(true);setMessage("");setItemError("");
    try{
      const items=inventoryItems();
      if(inventoryId){
        if(!items.length)throw new Error("Add at least one item first.");
        const d:any=await marketplaceMutate({action:"update",product_id:inventoryId,delivery_type:"inventory",stock_type:"limited",inventory_items:items});
        if(!d?.ok)throw new Error(d?.code||"Unable to add items.");
        const added=Number(d.inventory_added||0),available=Number(d.available_inventory||0);
        setStagedItems([]);setMessage(`${added} item${added===1?"":"s"} added successfully. ${available} available for sale.`);
        try{await loadProduct(inventoryId,false)}catch{}
        return;
      }
      if(!form.name.trim())throw new Error("Product name is required.");
      const effectiveDeliveryType=items.length?"inventory":form.delivery_type;
      let delivery_payload:any={};if(effectiveDeliveryType==="manual_text")delivery_payload={text:form.delivery_text};if(effectiveDeliveryType==="external_link")delivery_payload={url:form.external_url};if(effectiveDeliveryType==="upload_file")delivery_payload={filename:form.file_name,mime_type:form.file_type,data_url:form.file_data};
      const parsedPrice=Number(form.price_ngn);if(form.price_ngn===""||!Number.isFinite(parsedPrice)||parsedPrice<0)throw new Error("Enter a valid selling price.");
      const body:any={action:editId?"update":"create",product_id:editId||undefined,name:form.name,category:form.category,short_description:form.short_description,description:form.description,image_url:form.image_url,price_ngn:parsedPrice,stock_type:items.length?"limited":form.stock_type,stock_quantity:Number(form.stock_quantity||0),delivery_type:effectiveDeliveryType,status:form.status};
      if(!editId||form.delivery_text||form.external_url||form.file_data)body.delivery_payload=delivery_payload;if(effectiveDeliveryType==="inventory"&&items.length)body.inventory_items=items;
      const d:any=await marketplaceMutate(body);if(!d?.ok)throw new Error(d?.code||"Unable to save product");
      const persistedPrice=Number(d?.product?.price_ngn);
      if(!Number.isFinite(persistedPrice)||Math.abs(persistedPrice-parsedPrice)>0.009)throw new Error("The selling price was not persisted by the backend. Please retry.");
      const savedId=String(editId||d.product?.id||"");const added=Number(d.inventory_added||0),available=Number(d.available_inventory||0);
      setMessage(`${editId?"Product updated successfully.":"Product created successfully."}${effectiveDeliveryType==="inventory"&&items.length?` ${added} item${added===1?"":"s"} added; ${available} available.`:""}`);if(!editId)setEditId(savedId);if(effectiveDeliveryType==="inventory"&&items.length)setStagedItems([]);
    }catch(e){setMessage(e instanceof Error?e.message:"Unable to save product")}
    finally{saveLockRef.current=false;setBusy(false)}
  }
  const inventoryUpload=<label className={`${styles.secondary} ${styles.fileButton}`}>Upload CSV / Text List<input type="file" accept=".csv,.txt,text/csv,text/plain" onChange={e=>{const input=e.currentTarget,file=input.files?.[0];void inventoryFile(file).finally(()=>{input.value=""})}}/></label>;
  const itemTypeSelect=<><label>Item Type</label><select className={styles.select} value={form.inventory_kind} onChange={e=>set("inventory_kind",e.target.value)}><option value="text">Text item</option><option value="license_key">License key</option><option value="redeem_code">Redeem code</option><option value="link">Download link</option><option value="file">File URL</option></select></>;

  if(inventoryId) return <><Header title="Add Items" subtitle="Add more one-time delivery items to this product" backHref={productsHref}/><section className={styles.formCard}>
    {targetProduct&&<div className={styles.productContext}><strong>{targetProduct.name}</strong><span>{Number(targetProduct.remaining_stock??targetProduct.stock_quantity??0)} available now</span></div>}
    <div className={styles.field}>{itemTypeSelect}{itemComposer}{inventoryUpload}<p className={styles.help}>Upload .txt or .csv files. Any non-empty line is accepted and appended to anything already staged.</p></div>
    {message&&<p className={styles.message} role="status">{message}</p>}
    <div className={styles.actions}><button type="button" className={styles.primary} disabled={busy||stagedItems.length===0} onClick={()=>void save()}>{busy?"Adding…":"Add Items"}</button><Link className={styles.secondary} href={productsHref}>Back to Products</Link></div>
  </section></>;

  return <><Header title={editId?"Edit Product":"Add Product"} subtitle="Create and manage a manual digital Marketplace product" backHref={productsHref}/><section className={styles.formCard}><div className={styles.formGrid}>
    <div className={styles.field}><label>Product Name</label><input className={styles.input} value={form.name} onChange={e=>set("name",e.target.value)}/></div>
    <div className={styles.field}><label>Category</label><select className={styles.select} value={form.category} onChange={e=>set("category",e.target.value)}>{categories.map(c=><option key={c}>{c}</option>)}</select></div>
    <div className={`${styles.field} ${styles.full}`}><label>Product Image</label>{form.image_url&&<img className={styles.preview} src={form.image_url} alt="Product preview"/>}<input className={styles.input} value={form.image_url?.startsWith("data:")?"":form.image_url} onChange={e=>set("image_url",e.target.value)} placeholder="Image URL"/><label className={`${styles.secondary} ${styles.fileButton}`}>Upload image<input type="file" accept="image/*" onChange={e=>void imageFile(e.target.files?.[0])}/></label></div>
    <div className={`${styles.field} ${styles.full}`}><label>Short Description</label><input className={styles.input} value={form.short_description} onChange={e=>set("short_description",e.target.value)}/></div>
    <div className={`${styles.field} ${styles.full}`}><label>Full Description</label><textarea className={styles.textarea} value={form.description} onChange={e=>set("description",e.target.value)}/></div>
    <div className={styles.field}><label htmlFor="marketplace-selling-price">Selling Price (NGN)</label><input id="marketplace-selling-price" className={styles.input} type="text" inputMode="decimal" autoComplete="off" value={form.price_ngn} onFocus={e=>e.currentTarget.select()} onChange={e=>setPrice(e.target.value)} placeholder="Enter selling price" aria-label="Selling Price in NGN"/><p className={styles.help}>Tap and type any NGN selling price. You can change it again when editing the product.</p></div>
    <div className={styles.field}><label>Status</label><select className={styles.select} value={form.status} onChange={e=>set("status",e.target.value)}><option value="active">Active</option><option value="draft">Draft</option><option value="out_of_stock">Out of Stock</option><option value="disabled">Disabled</option></select></div>
    <div className={styles.field}><label>Stock Type</label><select className={styles.select} value={form.stock_type} onChange={e=>set("stock_type",e.target.value)}><option value="unlimited">Unlimited</option><option value="limited">Limited Stock</option></select></div>
    {form.stock_type==="limited"&&form.delivery_type!=="inventory"&&<div className={styles.field}><label>Stock Quantity</label><input className={styles.input} type="number" min="0" value={form.stock_quantity} onChange={e=>set("stock_quantity",e.target.value)}/></div>}
    <div className={`${styles.field} ${styles.full}`}><label>Delivery Type</label><select className={styles.select} value={form.delivery_type} onChange={e=>set("delivery_type",e.target.value)}>{deliveryTypes.map(([v,l])=><option value={v} key={v}>{l}</option>)}</select></div>
    <div className={`${styles.field} ${styles.full}`}>{itemTypeSelect}{itemComposer}{inventoryUpload}</div>
    {form.delivery_type==="manual_text"&&<div className={`${styles.field} ${styles.full}`}><label>Manual Text Delivery</label><textarea className={styles.textarea} value={form.delivery_text} onChange={e=>set("delivery_text",e.target.value)} placeholder="Delivery instructions or authorized digital content"/><p className={styles.help}>This is never returned before a successful purchase.</p></div>}
    {form.delivery_type==="external_link"&&<div className={`${styles.field} ${styles.full}`}><label>External Delivery URL</label><input className={styles.input} value={form.external_url} onChange={e=>set("external_url",e.target.value)} placeholder="https://..."/></div>}
    {form.delivery_type==="upload_file"&&<div className={`${styles.field} ${styles.full}`}><label>Secure Digital File</label><label className={`${styles.secondary} ${styles.fileButton}`}>{form.file_name||"Choose file"}<input type="file" onChange={e=>void deliveryFile(e.target.files?.[0])}/></label><p className={styles.help}>Stored in protected delivery data; no permanent public download URL is created.</p></div>}
    {form.delivery_type==="manual_fulfillment"&&<div className={`${styles.field} ${styles.full}`}><p className={styles.help}>{audience==="staff"?"Orders are created as Pending Delivery for the owner/admin to fulfill.":"Orders are created as Pending Delivery. Deliver them from Admin Marketplace Orders."}</p></div>}
  </div>{message&&<p className={styles.message} role="status">{message}</p>}<div className={styles.actions}><button type="button" className={styles.primary} disabled={busy} onClick={()=>void save()}>{busy?"Saving…":editId?"Save Changes":"Create Product"}</button><Link className={styles.secondary} href={productsHref}>Products</Link></div></section></>;
}
function Orders(){
  const [orders,setOrders]=useState<any[]>([]),[message,setMessage]=useState("Loading orders…"),[delivery,setDelivery]=useState<Record<string,string>>({}),[busy,setBusy]=useState("");
  async function load(){try{const d:any=await adminApi("wickspend/backend/admin/marketplace/orders");setOrders(Array.isArray(d?.orders)?d.orders:[]);setMessage("")}catch(e){setMessage(e instanceof Error?e.message:"Unable to load orders")}}
  useEffect(()=>{void load()},[]);
  async function fulfill(o:any){setBusy(o.reference);try{const text=delivery[o.reference]?.trim();if(!text)throw new Error("Enter delivery details first.");await adminApi("wickspend/backend/admin/marketplace/fulfill",{method:"POST",body:JSON.stringify({reference:o.reference,delivery_payload:{text}})});setDelivery(d=>({...d,[o.reference]:""}));await load()}catch(e){setMessage(e instanceof Error?e.message:"Unable to deliver order")}finally{setBusy("")}}
  return <><Header title="Marketplace Orders" subtitle="Manual product purchases and fulfillment"/><div className={styles.actions}><Link className={styles.secondary} href="/admin/marketplace">Products</Link><Link className={styles.primary} href="/admin/marketplace/add">Add Product</Link></div>{message&&<p className={styles.message}>{message}</p>}<div className={styles.grid}>{orders.map(o=><article className={`${styles.card} ${styles.order}`} key={o.reference}><div className={styles.orderHead}><h3>{o.product_name||"Marketplace Product"}</h3><span>{String(o.status||"pending").replaceAll("_"," ")}</span></div><p>#{o.reference}</p><p>User #{o.user_id} · {money(o.price_ngn)} · {new Date(o.created_at).toLocaleString()}</p>{o.status==="pending_delivery"&&<div className={styles.fulfillBox}><textarea className={styles.textarea} placeholder="Legitimate delivery details / instructions" value={delivery[o.reference]||""} onChange={e=>setDelivery(d=>({...d,[o.reference]:e.target.value}))}/><button className={styles.primary} disabled={busy===o.reference} onClick={()=>void fulfill(o)}>{busy===o.reference?"Delivering…":"Mark Delivered"}</button></div>}</article>)}{!message&&!orders.length&&<div className={`${styles.card} ${styles.empty}`}><strong>No manual Marketplace orders</strong><span>New purchases will appear here.</span></div>}</div></>;
}

export default function MarketplaceAdmin({mode,audience="admin"}:{mode:Mode;audience?:Audience}){
  if(audience==="staff"&&mode==="orders") return null;
  return <main className={styles.page}><div className={styles.shell}>{mode==="products"?<Products audience={audience}/>:mode==="add"?<AddProduct audience={audience}/>:<Orders/>}</div></main>;
}
