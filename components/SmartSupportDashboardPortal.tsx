"use client";

import {useEffect,useState} from "react";
import {createPortal} from "react-dom";
import {usePathname} from "next/navigation";
import {openSmartSupport} from "@/components/SmartSupport";

export function SmartSupportDashboardPortal(){
 const pathname=usePathname(),[target,setTarget]=useState<Element|null>(null);
 useEffect(()=>{if(pathname!=="/"){setTarget(null);return}const find=()=>setTarget(document.querySelector(".homeActionGrid"));find();const id=window.setTimeout(find,250);return()=>window.clearTimeout(id)},[pathname]);
 if(!target)return null;
 return createPortal(<button type="button" className="quickActionCard smartSupportQuick" onClick={()=>openSmartSupport()}><span aria-hidden="true">💬</span><b>Smart Support</b></button>,target);
}
