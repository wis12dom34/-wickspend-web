"use client";

import dynamic from "next/dynamic";

const SmartSupport=dynamic(()=>import("@/components/SmartSupport"),{ssr:false,loading:()=>null});
export function SmartSupportLoader(){return <SmartSupport/>}
