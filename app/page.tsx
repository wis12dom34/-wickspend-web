import Link from "next/link";
import { BottomNav } from "@/components/BottomNav";

const actions = [
  ["☎️", "Buy Number", "/buy-number"],
  ["📱", "Rent Number", "/rent-number"],
  ["🛍️", "Marketplace", "/marketplace"],
  ["📋", "Orders", "/orders"],
  ["💰", "Add Funds", "/add-funds"],
  ["📩", "Temp Mail", "/temp-mail"],
  ["📈", "Boostly", "/boostly"],
  ["💳", "Wallet", "/wallet"],
] as const;

export default function Home() {
  return (
    <main className="shell">
      <header className="header">
        <div><p className="eyebrow">Good morning, Wisdom</p><h1>WickSpend</h1></div>
        <div className="headerActions"><Link href="/notifications" className="circle">🔔</Link><Link href="/profile" className="avatar" aria-label="Profile">W</Link></div>
      </header>

      <section className="balanceCard">
        <p>Wallet balance</p><strong>—</strong>
        <Link href="/add-funds" className="primaryButton">Add funds</Link>
      </section>

      <section><div className="sectionTitle"><h2>Quick actions</h2></div><div className="actionGrid">
        {actions.map(([icon, label, href]) => <Link href={href} className="glassCard" key={href}><span>{icon}</span><b>{label}</b></Link>)}
      </div></section>

      <section><div className="sectionTitle"><h2>Popular countries</h2></div><div className="chips">
        {[["🇺🇸","USA"],["🇬🇧","UK"],["🇩🇪","Germany"],["🇳🇬","Nigeria"],["🇨🇦","Canada"],["🇵🇱","Poland"]].map(([flag,name]) => <Link href={`/buy-number?country=${encodeURIComponent(name)}`} className="chip" key={name}>{flag} {name}</Link>)}
      </div></section>

      <BottomNav />
    </main>
  );
}
