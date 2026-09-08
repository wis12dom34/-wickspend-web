"use client";

import dynamic from "next/dynamic";
import {SmartSupportContextEntry} from "@/components/SmartSupportContextEntry";

const SmartSupport=dynamic(()=>import("@/components/SmartSupport"),{ssr:false,loading:()=>null});

export function SmartSupportLoader(){
  return <><SmartSupport/><SmartSupportContextEntry/></>;
}
