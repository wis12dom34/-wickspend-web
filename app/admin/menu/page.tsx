import Link from "next/link";

const items = [
  ["Dashboard", "Live revenue, activity and platform statistics", "/admin"],
  ["Marketplace Products", "Create, edit, stock and publish manual products", "/admin/marketplace"],
  ["Marketplace Orders", "Review manual orders and legitimate fulfillment", "/admin/marketplace/orders"],
  ["Support", "View and reply to Smart Support conversations", "/admin/support"],
  ["Analytics", "Live revenue and transaction aggregates", "/admin#analytics"],
] as const;

export default function AdminMenuPage() {
  return <main className="ws-admin-menu-page"><section className="ws-admin-menu-shell"><header><Link href="/admin" aria-label="Back to admin">‹</Link><div><h1>Admin Menu</h1><p>Only production-backed modules are shown.</p></div></header><nav>{items.map(([title, subtitle, href]) => <Link href={href} key={title}><div><strong>{title}</strong><span>{subtitle}</span></div><b>›</b></Link>)}</nav></section></main>;
}
