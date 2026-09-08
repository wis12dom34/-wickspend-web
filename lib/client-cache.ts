const BALANCE_PREFIX="wickspend:verified-balance:v1:";
const MARKETPLACE_KEY="wickspend:marketplace:v7";
function tokenKey(token:string){let h=2166136261;for(let i=0;i<token.length;i++){h^=token.charCodeAt(i);h=Math.imul(h,16777619)}return(h>>>0).toString(36)}
export function readVerifiedBalance(token:string,maxAgeMs=7*24*60*60*1000):number|null{if(typeof window==="undefined")return null;try{const raw=localStorage.getItem(BALANCE_PREFIX+tokenKey(token));if(!raw)return null;const v=JSON.parse(raw),n=Number(v?.balance),ts=Number(v?.ts);return Number.isFinite(n)&&Number.isFinite(ts)&&Date.now()-ts<=maxAgeMs?n:null}catch{return null}}
export function writeVerifiedBalance(token:string,balance:number){if(typeof window==="undefined"||!Number.isFinite(balance))return;try{localStorage.setItem(BALANCE_PREFIX+tokenKey(token),JSON.stringify({balance,ts:Date.now()}))}catch{}}
export function clearVerifiedBalance(token:string){if(typeof window==="undefined")return;try{localStorage.removeItem(BALANCE_PREFIX+tokenKey(token))}catch{}}
export function readMarketplaceCache(maxAgeMs=7*24*60*60*1000):any[]{if(typeof window==="undefined")return[];try{const raw=localStorage.getItem(MARKETPLACE_KEY);if(!raw)return[];const v=JSON.parse(raw);return Array.isArray(v?.products)&&Date.now()-Number(v?.ts||0)<=maxAgeMs?v.products:[]}catch{return[]}}
export function writeMarketplaceCache(products:any[]){if(typeof window==="undefined"||!Array.isArray(products)||!products.length)return;try{localStorage.setItem(MARKETPLACE_KEY,JSON.stringify({products,ts:Date.now()}))}catch{}}
