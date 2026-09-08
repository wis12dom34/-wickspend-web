"use client";

import {useEffect} from "react";

declare global {
  interface Window {
    _smartsupp?: {key?: string};
    smartsupp?: any;
  }
}

const SMARTSUPP_KEY="674ab7d0fa7495b8b776dcbd3d2ea12bb94cbce8";
const SMARTSUPP_SCRIPT_ID="wickspend-smartsupp-loader";

export function SmartSupportLoader(){
  useEffect(()=>{
    if(typeof window==="undefined"||typeof document==="undefined")return;
    window._smartsupp=window._smartsupp||{};
    window._smartsupp.key=SMARTSUPP_KEY;
    if(window.smartsupp||document.getElementById(SMARTSUPP_SCRIPT_ID))return;
    const queue:any=function(...args:any[]){queue._.push(args)};
    queue._=[];
    window.smartsupp=queue;
    const script=document.createElement("script");
    script.id=SMARTSUPP_SCRIPT_ID;
    script.type="text/javascript";
    script.charset="utf-8";
    script.async=true;
    script.src="https://www.smartsuppchat.com/loader.js?";
    document.head.appendChild(script);
  },[]);
  return null;
}
