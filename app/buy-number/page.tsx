"use client";
import { FormEvent, useState } from "react";
import { PageShell } from "@/components/PageShell";
import { api } from "@/lib/api";

export default function BuyNumberPage(){
 const [country,setCountry]=useState("Nigeria"),[service,setService]=useState("Telegram"),[prices,setPrices]=useState<any[]>([]),[message,setMessage]=useState("");
 async function load(e:FormEvent){e.preventDefault();setMessage("Checking live prices…");try{const token=localStorage.getItem("wickspend_token")||"";if(!token)throw new Error("Please sign in first");const data:any=await api.numbers.prices(token,country,service);setPrices(Array.isArray(data)?data:(data?.prices||data?.data||[]));setMessage("")}catch(err){setMessage(err instanceof Error?err.message:"Unable to load prices")}}
 return <PageShell title="Buy Number" subtitle="Choose a country and service"><form className="panel formGrid" onSubmit={load}><div className="field"><label>Country</label><select value={country} onChange={e=>setCountry(e.target.value)}><option>Nigeria</option><option>USA</option><option>UK</option><option>Germany</option><option>Canada</option><option>Poland</option></select></div><div className="field"><label>Service</label><select value={service} onChange={e=>setService(e.target.value)}><option>Telegram</option><option>WhatsApp</option><option>Instagram</option><option>TikTok</option><option>Facebook</option><option>Google</option></select></div><button className="secondaryButton">View prices</button>{message&&<p className="statusText">{message}</p>}</form>{prices.length>0&&<section><div className="sectionTitle"><h2>Choose a number</h2></div><div className="list">{prices.map((p:any,i)=><div className="listItem" key={p.id||i}><div><div className="price">₦{Number(p.price_ngn??p.price??0).toLocaleString()}</div><small>{p.available??p.stock??"Available"}</small></div><button className="primaryButton" style={{border:"1px solid #ddd"}}>Buy</button></div>)}</div></section>}</PageShell>
}
