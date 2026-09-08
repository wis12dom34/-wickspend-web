"use client";

import {useEffect} from "react";
import {usePathname,useRouter} from "next/navigation";
import {api} from "@/lib/api";
import {getSessionToken} from "@/lib/session";

const MAIN_ROUTES=["/buy-number","/marketplace","/boostly","/wallet","/orders","/temp-mail"] as const;
const NEXT_ROUTES:Record<string,readonly string[]>={
  "/buy-number":["/buy-number/premium-usa","/otp","/orders"],
  "/marketplace":["/orders"],
  "/temp-mail":["/temp-mail/configure","/orders"],
  "/wallet":["/wallet/transactions","/add-funds"],
};

export function NavigationWarmup(){
  const router=useRouter();
  const pathname=usePathname();
  useEffect(()=>{
    let cancelled=false;
    const warm=()=>{
      if(cancelled)return;
      for(const route of MAIN_ROUTES)router.prefetch(route);
      for(const route of NEXT_ROUTES[pathname]||[])router.prefetch(route);
      const token=getSessionToken();
      if(token)void Promise.allSettled([api.wallet.get(token),api.orders(token),api.notifications.list(token)]);
    };
    const id=window.setTimeout(warm,250);
    const onVisible=()=>{if(document.visibilityState==="visible")warm()};
    window.addEventListener("online",warm,{passive:true});
    document.addEventListener("visibilitychange",onVisible,{passive:true});
    return()=>{cancelled=true;window.clearTimeout(id);window.removeEventListener("online",warm);document.removeEventListener("visibilitychange",onVisible)};
  },[pathname,router]);
  return null;
}
