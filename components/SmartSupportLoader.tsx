"use client";

import dynamic from "next/dynamic";
import {useEffect} from "react";
import {SmartSupportContextEntry} from "@/components/SmartSupportContextEntry";

const SmartSupport=dynamic(()=>import("@/components/SmartSupport"),{ssr:false,loading:()=>null});
const SMARTSUPP_KEY="674ab7d0fa7495b8b776dcbd3d2ea12bb94cbce8";
const SMARTSUPP_SCRIPT_ID="wickspend-smartsupp-loader";

declare global {
  interface Window {
    _smartsupp?: {key?: string;hideWidget?: boolean;hideMobileWidget?: boolean;cookieDomain?: string};
    smartsupp?: any;
  }
}

export function SmartSupportLoader(){
  useEffect(()=>{
    if(typeof window==="undefined"||typeof document==="undefined")return;
    window._smartsupp=window._smartsupp||{};
    window._smartsupp.key=SMARTSUPP_KEY;
    window._smartsupp.hideWidget=true;
    window._smartsupp.hideMobileWidget=true;
    window._smartsupp.cookieDomain=".wickspend.com";

    if(!window.smartsupp){
      const queue:any=function(...args:any[]){queue._.push(args)};
      queue._=[];
      window.smartsupp=queue;
    }

    window.smartsupp("chat:hide");

    if(document.getElementById(SMARTSUPP_SCRIPT_ID))return;
    const loadScript=()=>{if(document.getElementById(SMARTSUPP_SCRIPT_ID))return;const script=document.createElement("script");script.id=SMARTSUPP_SCRIPT_ID;script.type="text/javascript";script.charset="utf-8";script.async=true;script.src="https://www.smartsuppchat.com/loader.js?";script.onload=()=>window.smartsupp?.("chat:hide");document.head.appendChild(script)};
    const timer=window.setTimeout(loadScript,8000);
    return()=>window.clearTimeout(timer);
  },[]);

  return <><SmartSupport/><SmartSupportContextEntry/></>;
}
