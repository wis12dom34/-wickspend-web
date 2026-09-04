"use client";
import Link from "next/link";
import { useEffect,useState } from "react";
import { useRouter } from "next/navigation";
import { PageShell } from "@/components/PageShell";
import { api,ApiError } from "@/lib/api";
import { clearSessionToken,getSessionToken } from "@/lib/session";
export default function Profile(){
 const router=useRouter();
 const[user,setUser]=useState<any>(null);
 const[message,setMessage]=useState("Checking account…");
 const[busy,setBusy]=useState(false);
 const[signedIn,setSignedIn]=useState(false);
 useEffect(()=>{let active=true;const token=getSessionToken();if(!token){setSignedIn(false);setMessage("You are not signed in.");return}setSignedIn(true);api.auth.session(token).then((data:any)=>{if(!active)return;setUser(data?.user||data?.session?.user||data?.data?.user||data?.data||data);setMessage("")}).catch((error)=>{if(!active)return;if(error instanceof ApiError&&(error.status===401||error.status===403)){clearSessionToken();setSignedIn(false);setUser(null);setMessage("Your session has expired. Please sign in again.");return}setMessage("Couldn’t verify your account right now. Please try again.")});return()=>{active=false}},[]);
 async function logout(){const token=getSessionToken();setBusy(true);try{if(token)await api.auth.logout(token)}catch{}finally{clearSessionToken();setSignedIn(false);setUser(null);setBusy(false);router.replace("/login")}}
 const name=user?.first_name||user?.name||user?.username||user?.telegram_username||"WickSpend account";
 return <PageShell title="Profile" subtitle="Account and preferences"><div className="panel"><h3>{name}</h3>{user?.telegram_user_id&&<p>Telegram ID: {user.telegram_user_id}</p>}{user?.username&&<p>@{String(user.username).replace(/^@/,"")}</p>}{message&&<p className="statusText">{message}</p>}{!signedIn&&<Link className="secondaryButton" href="/login" style={{marginTop:12}}>Sign in</Link>}</div><div className="list"><Link className="listItem" href="/orders"><span>Orders</span><span>›</span></Link><Link className="listItem" href="/notifications"><span>Notifications</span><span>›</span></Link><Link className="listItem" href="/support"><span>AI Support</span><span>›</span></Link></div>{signedIn&&<div className="panel"><button className="secondaryButton" type="button" disabled={busy} onClick={logout}>{busy?"Signing out…":"Sign out"}</button></div>}</PageShell>
}
