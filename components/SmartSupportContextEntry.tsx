"use client";

import {usePathname,useSearchParams} from "next/navigation";
import {openSmartSupport} from "@/components/SmartSupport";

function moduleFor(path:string){if(path.includes("marketplace"))return "Marketplace";if(path.includes("boostly"))return "Boostly";if(path.includes("temp-mail"))return "Temp Mail";if(path.includes("wallet")||path.includes("payment"))return "Wallet";if(path.includes("rent"))return "Rent Number";if(path.includes("number")||path.includes("otp"))return "Buy Number";return "Orders"}
export function SmartSupportContextEntry(){
 const path=usePathname()||"/",q=useSearchParams();
 const relevant=/\/(orders\/result|marketplace\/(status|order)|numbers\/history|wallet\/payment|boostly\/|temp-mail\/|rent-number\/)/.test(path);
 if(!relevant)return null;
 const reference=String(q.get("reference")||q.get("ref")||q.get("order")||"").slice(0,120);
 return <button type="button" className="smartSupportContextEntry" onClick={()=>openSmartSupport({module:moduleFor(path),reference})}>Get help</button>
}
