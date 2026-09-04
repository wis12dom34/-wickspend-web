import { PageShell } from "@/components/PageShell";
const platforms=["Instagram","TikTok","Facebook","YouTube","X","Telegram"];
export default function Boostly(){return <PageShell title="Boostly" subtitle="Social media growth services"><div className="actionGrid">{platforms.map(x=><div className="glassCard" key={x}><span>📈</span><b>{x}</b></div>)}</div></PageShell>}
