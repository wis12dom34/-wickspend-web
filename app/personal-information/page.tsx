"use client";
import {useEffect,useMemo,useState} from "react";
import {PageShell} from "@/components/PageShell";
import {api,ApiError} from "@/lib/api";
import {clearSessionToken,getSessionToken} from "@/lib/session";

function valueOf(user:any,...keys:string[]){for(const key of keys){const v=user?.[key];if(v!==undefined&&v!==null&&String(v).trim())return String(v)}return ""}
function maskPhone(value:string){const digits=value.replace(/\D/g,"");if(!digits)return "+234 ••• ••• ••••";const prefix=value.startsWith("+")?`+${digits.slice(0,3)}`:"+234";return `${prefix} ••• ••• ••••`}

export default function PersonalInformation(){
  const[user,setUser]=useState<any>(null),[message,setMessage]=useState("Loading personal information…"),[loading,setLoading]=useState(true);
  useEffect(()=>{let active=true;const token=getSessionToken();if(!token){setMessage("Please sign in to view your personal information.");setLoading(false);return()=>{active=false}}api.auth.session(token).then((d:any)=>{if(!active)return;const next=d?.user||d?.session?.user||d?.data?.user||d?.data||d;setUser(next&&typeof next==="object"?next:null);setMessage("");setLoading(false)}).catch(e=>{if(!active)return;if(e instanceof ApiError&&(e.status===401||e.status===403)){clearSessionToken();setMessage("Your session has expired. Please sign in again.")}else setMessage(e instanceof Error?e.message:"Unable to load personal information");setLoading(false)});return()=>{active=false}},[]);
  const first=valueOf(user,"first_name","firstName"),last=valueOf(user,"last_name","lastName"),username=valueOf(user,"username","telegram_username"),email=valueOf(user,"email"),phone=valueOf(user,"phone_number","phone","mobile");
  const initials=useMemo(()=>{const raw=`${first} ${last}`.trim()||username||"WickSpend";return raw.split(/\s+/).slice(0,2).map(x=>x.charAt(0).toUpperCase()).join("")||"W"},[first,last,username]);
  return <PageShell title="Personal Information" subtitle="Manage your personal details" back="/profile">
    <section className="personalAvatarBlock" aria-busy={loading}><div className="personalAvatar" aria-hidden="true">{initials}</div><button type="button" className="personalPhotoButton" disabled title="Photo update is not available yet">Change photo</button></section>
    <section className="personalDetailsCard">
      <label><small>First name</small><input value={first} readOnly placeholder="—"/></label>
      <label><small>Last name</small><input value={last} readOnly placeholder="—"/></label>
      <label><small>Username</small><input value={username?`@${username.replace(/^@/,"")}`:""} readOnly placeholder="—"/></label>
      <label><small>Email</small><input value={email} readOnly placeholder="—"/></label>
      <label><small>Phone number</small><input value={maskPhone(phone)} readOnly/></label>
    </section>
    <button type="button" className="personalSave" disabled title="Profile editing backend is not available yet">Save changes</button>
    <p className="personalPrivacy">Your information is encrypted and kept private.</p>
    {message&&<p className="screenMessage" role="status">{message}</p>}
  </PageShell>
}
