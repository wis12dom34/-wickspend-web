import Link from "next/link";

const items = [
  ["⌂", "Home", "/"],
  ["☎", "Buy Number", "/buy-number"],
  ["▢", "Marketplace", "/marketplace"],
  ["↗", "Boostly", "/boostly"],
  ["▰", "Wallet", "/wallet"],
] as const;

export function BottomNav() {
  return (
    <nav className="bottomNav" aria-label="Primary navigation">
      {items.map(([icon, label, href]) => (
        <Link href={href} className="navItem" key={href}>
          <span className="navIcon" aria-hidden>{icon}</span>
          <span>{label}</span>
        </Link>
      ))}
    </nav>
  );
}
