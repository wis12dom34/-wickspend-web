"use client";
import {useEffect,useMemo,useState} from "react";
import {PageShell} from "@/components/PageShell";
import {api,ApiError} from "@/lib/api";
import {clearSessionToken,getSessionToken} from "@/lib/session";

function valueOf(user:any,...keys:string[]){for(const key of keys){const v=user?.[key];if(v!==undefined&&v!==null&&String(v).trim())return String(v)}return ""}
function avatarOf(user:any){return user?.photo_url||user?.profile_photo_url||user?.avatar_url||user?.telegram_photo_url||user?.photoUrl||user?.avatarUrl||""}
function maskPhone(value:string){const digits=value.replace(/\D/g,"");if(!digits)return "+234 ••• ••• ••••";const prefix=value.startsWith("+")?`+${digits.slice(0,3)}`:"+234";return `${prefix} ••• ••• ••••`}

export default function PersonalInformation(){
  const[user,setUser]=useState<any>(null),[message,setMessage]=useState("Loading personal information…"),[loading,setLoading]=useState(true);
  useEffect(()=>{let active=true;const token=getSessionToken();if(!token){setMessage("Please sign in to view your personal information.");setLoading(false);return()=>{active=false}}api.auth.session(token).then((d:any)=>{if(!active)return;const next=d?.user||d?.session?.user||d?.data?.user||d?.data||d;setUser(next&&typeof next==="object"?next:null);setMessage("");setLoading(false)}).catch(e=>{if(!active)return;if(e instanceof ApiError&&(e.status===401||e.status===403)){clearSessionToken();setMessage("Your session has expired. Please sign in again.")}else setMessage(e instanceof Error?e.message:"Unable to load personal information");setLoading(false)});return()=>{active=false}},[]);
  const first=valueOf(user,"first_name","firstName"),last=valueOf(user,"last_name","lastName"),username=valueOf(user,"username","telegram_username"),email=valueOf(user,"email"),phone=valueOf(user,"phone_number","phone","mobile"),photo=avatarOf(user);
  const initials=useMemo(()=>{const raw=`${first} ${last}`.trim()||username||"WickSpend";return raw.split(/\s+/).slice(0,2).map(x=>x.charAt(0).toUpperCase()).join("")||"W"},[first,last,username]);
  return <PageShell title="Personal Information" subtitle="Manage your personal details" back="/profile">
    <div className="personalScreen">
      <section className="personalAvatarBlock" aria-busy={loading}><div className="personalAvatar">{photo?<img src={photo} alt="Profile" referrerPolicy="no-referrer"/>:<span aria-hidden="true">{initials}</span>}</div><button type="button" className="personalPhotoButton" disabled title="Photo update is not available yet">Change photo</button></section>
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
    </div>
    <style jsx>{`
      .personalScreen{margin-top:-2px}.personalAvatarBlock{display:grid;justify-items:center;gap:10px;margin:20px 0}.personalAvatar{width:94px;height:94px;border-radius:47px;background:#050505;color:#fff;display:grid;place-items:center;font-size:24px;font-weight:700;overflow:hidden}.personalAvatar img{width:100%;height:100%;object-fit:cover;display:block}.personalPhotoButton{width:132px;height:34px;border-radius:17px;border:1px solid #e0e0e5;background:#fff;font-size:11px;font-weight:600;opacity:1}.personalPhotoButton:disabled{color:#050505;cursor:not-allowed}.personalDetailsCard{border:1px solid #e0e0e5;border-radius:24px;background:#fff;box-shadow:0 8px 20px rgba(0,0,0,.08);padding:18px 15px 24px;display:grid;gap:8px}.personalDetailsCard label{display:grid;gap:5px}.personalDetailsCard small{font-size:10px;color:#6b6b73}.personalDetailsCard input{height:46px;border:1px solid #e0e0e5;border-radius:14px;background:#f9f9fa;padding:0 15px;font-size:12px;font-weight:600;color:#050505;outline:0}.personalDetailsCard input::placeholder{color:#9a9aa0}.personalSave{width:100%;height:50px;border:0;border-radius:25px;background:#050505;color:#fff;font-size:13px;font-weight:600;margin-top:30px;opacity:1}.personalSave:disabled{cursor:not-allowed}.personalPrivacy{text-align:center;color:#6b6b73;font-size:10px;margin:14px 0 0}@media(max-height:760px){.personalAvatarBlock{margin:8px 0 14px}.personalAvatar{width:78px;height:78px;border-radius:39px}.personalDetailsCard{gap:5px}.personalDetailsCard input{height:42px}.personalSave{margin-top:18px}}
    `}</style>
  </PageShell>
}
