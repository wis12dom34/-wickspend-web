export type DeliveryEntry={label:string;value:string;url?:boolean};

const BLOCKED_KEY=/(^|_)(provider|providerid|provider_id|providername|provider_name|metadata|meta|internal|debug|raw|request|request_id|webhook|api_key|secret_key|access_token)(_|$)/i;
const URL_RE=/^https?:\/\//i;
const LABELS:Record<string,string>={delivery_text:"Delivery",content:"Content",credentials:"Credentials",username:"Username",email:"Email",login:"Login",password:"Password",pass:"Password",url:"Link",link:"Link",code:"Code",pin:"PIN",license:"License",license_key:"License key",key:"Key",text:"Delivery"};
const pretty=(key:string)=>LABELS[key.toLowerCase()]||key.replace(/[_-]+/g," ").replace(/\b\w/g,c=>c.toUpperCase());

export function marketplaceDeliveryEntries(order:any):DeliveryEntry[]{
 const roots=[order?.delivery,order?.delivery_text,order?.content,order?.credentials,order?.account_details,order?.details];
 const out:DeliveryEntry[]=[];const seen=new Set<string>();
 const add=(label:string,value:any)=>{if(value==null)return;const text=String(value).trim();if(!text||text==="[object Object]")return;const sig=`${label}:${text}`;if(seen.has(sig))return;seen.add(sig);out.push({label:pretty(label||"Delivery"),value:text,url:URL_RE.test(text)});};
 const walk=(value:any,label="Delivery",depth=0)=>{if(value==null||depth>5)return;if(typeof value==="string"||typeof value==="number"||typeof value==="boolean"){add(label,value);return}if(Array.isArray(value)){value.forEach((item,i)=>walk(item,value.length>1?`${label} ${i+1}`:label,depth+1));return}if(typeof value==="object"){const entries=Object.entries(value).filter(([key])=>!BLOCKED_KEY.test(key));if(!entries.length)return;entries.forEach(([key,val])=>walk(val,pretty(key),depth+1));}};
 roots.forEach((root,i)=>walk(root,i===1?"Delivery":i===2?"Content":i===3?"Credentials":"Delivery"));
 return out;
}

export function marketplaceDeliveryText(order:any){return marketplaceDeliveryEntries(order).map(x=>`${x.label}: ${x.value}`).join("\n");}
