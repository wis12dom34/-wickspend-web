"use client";

import Link from "next/link";
import { useEffect } from "react";
import { usePathname } from "next/navigation";

type IconName = "home" | "phone" | "bag" | "rocket" | "wallet";
const items: readonly [IconName,string,string][] = [
  ["home", "Home", "/"],
  ["phone", "Buy Number", "/buy-number"],
  ["bag", "Marketplace", "/marketplace"],
  ["rocket", "Boostly", "/boostly"],
  ["wallet", "Wallet", "/wallet"],
];

function NavIcon({name,active}:{name:IconName;active:boolean}) {
  const common={width:22,height:22,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:active?2.2:1.8,strokeLinecap:"round" as const,strokeLinejoin:"round" as const,"aria-hidden":true};
  if(name==="home") return <svg {...common} fill={active?"currentColor":"none"}><path d="M3.5 10.7 12 3.8l8.5 6.9v8.1a1.7 1.7 0 0 1-1.7 1.7H5.2a1.7 1.7 0 0 1-1.7-1.7z"/><path d="M9.2 20.5v-6.2h5.6v6.2" stroke={active?"white":"currentColor"}/></svg>;
  if(name==="phone") return <svg {...common}><path d="M7.1 3.8 4.5 5a2 2 0 0 0-1 2.3c1.6 6.5 6.7 11.6 13.2 13.2a2 2 0 0 0 2.3-1l1.2-2.6-4.6-2.1-1.4 2.1a14.4 14.4 0 0 1-7.1-7.1l2.1-1.4z"/></svg>;
  if(name==="bag") return <svg {...common}><path d="M5.2 8.1h13.6l1 12H4.2z"/><path d="M8.6 8.1V6.4a3.4 3.4 0 0 1 6.8 0v1.7"/></svg>;
  if(name==="rocket") return <svg {...common}><path d="M14.4 4.1c2.3-1.1 4.2-.9 5.5-.6.3 1.3.5 3.2-.6 5.5-1.1 2.4-3.4 4.6-6.7 6.5l-4.1-4.1c1.8-3.3 4.1-5.6 5.9-7.3Z"/><circle cx="15.6" cy="7.7" r="1.5"/><path d="m8.8 11-3.6.7-1.7 1.7 4.2.8M13 15.2l-.7 3.6-1.7 1.7-.8-4.2M7.4 16.6l-2.7 2.7"/></svg>;
  return <svg {...common}><path d="M3.5 7.2h15.2a1.8 1.8 0 0 1 1.8 1.8v9.3a1.8 1.8 0 0 1-1.8 1.8H5.3a1.8 1.8 0 0 1-1.8-1.8z"/><path d="M3.8 7.3 16.6 4a1.5 1.5 0 0 1 1.9 1.5v1.7M15.7 12.1h4.8v4.1h-4.8a2 2 0 0 1 0-4.1Z"/></svg>;
}

export function BottomNav() {
  const pathname = usePathname();

  useEffect(()=>{
    if(pathname!=="/profile") return;
    const button=document.querySelector<HTMLButtonElement>(".referButton");
    if(!button) return;
    button.disabled=false;
    button.removeAttribute("title");
    button.setAttribute("aria-label","Open Refer & Earn");
    const openReferral=()=>window.location.assign("/refer-earn");
    button.addEventListener("click",openReferral);
    return()=>button.removeEventListener("click",openReferral);
  },[pathname]);

  return <nav className="bottomNav" aria-label="Primary navigation">{items.map(([icon,label,href])=>{const active=href==="/"?pathname==="/":pathname===href||pathname.startsWith(`${href}/`);return <Link href={href} className={`navItem${active?" active":""}`} aria-current={active?"page":undefined} key={href}><span className="navIcon"><NavIcon name={icon} active={active}/></span><span className="navLabel">{label}</span></Link>})}</nav>;
}
