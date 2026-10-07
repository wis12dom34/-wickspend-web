"use client";

import {useEffect,useRef} from "react";
import {usePathname,useRouter} from "next/navigation";

const NEXT_ROUTES:Record<string,readonly string[]>={
  "/buy-number":["/buy-number/premium-usa","/otp","/orders"],
  "/marketplace":["/orders"],
  "/temp-mail":["/temp-mail/configure","/orders"],
  "/wallet":["/wallet/transactions","/add-funds"],
};

export function NavigationWarmup(){
  const router=useRouter();
  const pathname=usePathname();
  const warmed=useRef(new Set<string>());
  useEffect(()=>{
    let cancelled=false;
    const warm=()=>{
      if(cancelled||document.visibilityState!=="visible"||!navigator.onLine)return;
      for(const route of NEXT_ROUTES[pathname]||[]){
        if(warmed.current.has(route))continue;
        warmed.current.add(route);
        router.prefetch(route);
      }
    };
    const id=window.setTimeout(warm,250);
    const onVisible=()=>{if(document.visibilityState==="visible")warm()};
    window.addEventListener("online",warm,{passive:true});
    document.addEventListener("visibilitychange",onVisible,{passive:true});
    return()=>{cancelled=true;window.clearTimeout(id);window.removeEventListener("online",warm);document.removeEventListener("visibilitychange",onVisible)};
  },[pathname,router]);
  return null;
}
