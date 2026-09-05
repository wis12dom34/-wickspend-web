"use client";
import Link from "next/link";
import {useRouter} from "next/navigation";
import {PageShell} from "@/components/PageShell";
import {api} from "@/lib/api";
import {clearSessionToken,getSessionToken} from "@/lib/session";

export default function Settings(){
  const router=useRouter();
  async function signOut(){
    const token=getSessionToken();
    try{if(token)await api.auth.logout(token)}catch{}finally{clearSessionToken();router.replace("/login")}
  }
  return <PageShell title="Settings" subtitle="Preferences, connections and privacy">
    <section className="profileGroup">
      <p>Preferences</p>
      <div className="profileRows">
        <Link className="profileRow settingsRow" href="/notifications"><span aria-hidden="true">🔔</span><span><b>Notifications</b><small>Choose what WickSpend sends</small></span><i aria-hidden="true">›</i></Link>
        <div className="profileRow settingsRow" aria-disabled="true"><span aria-hidden="true">◎</span><span><b>Language</b><small>English</small></span><em>English</em><i aria-hidden="true">›</i></div>
        <div className="profileRow settingsRow" aria-disabled="true"><span aria-hidden="true">◐</span><span><b>Appearance</b><small>Light</small></span><em>Light</em><i aria-hidden="true">›</i></div>
        <Link className="profileRow settingsRow" href="/wallet"><span aria-hidden="true">$</span><span><b>Currency</b><small>NGN</small></span><em>NGN</em><i aria-hidden="true">›</i></Link>
      </div>
    </section>
    <section className="profileGroup settingsSupportGroup">
      <p>Connections &amp; support</p>
      <div className="profileRows">
        <div className="profileRow settingsRow" aria-disabled="true"><span aria-hidden="true">▣</span><span><b>Telegram</b><small>Connection controls coming soon</small></span><i aria-hidden="true">›</i></div>
        <Link className="profileRow settingsRow" href="/support"><span aria-hidden="true">?</span><span><b>Help &amp; Support</b><small>Get assistance</small></span><i aria-hidden="true">›</i></Link>
        <div className="profileRow settingsRow" aria-disabled="true"><span aria-hidden="true">≡</span><span><b>Privacy &amp; Terms</b><small>Review our policies</small></span><i aria-hidden="true">›</i></div>
      </div>
    </section>
    <button type="button" className="settingsSignOut" onClick={signOut}><span aria-hidden="true">↗</span><b>Sign out</b><i aria-hidden="true">›</i></button>
  </PageShell>
}
