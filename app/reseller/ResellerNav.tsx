"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  ["Overview", "/reseller"],
  ["Orders", "/reseller/orders"],
  ["Customers", "/reseller/customers"],
  ["Store", "/reseller/store"],
  ["Finance", "/reseller/finance"],
  ["Billing", "/reseller/billing"],
  ["Notifications", "/reseller/notifications"],
  ["API", "/reseller/developer"],
] as const;

export default function ResellerNav() {
  const pathname = usePathname();
  return (
    <nav className="resellerNav" aria-label="Reseller navigation">
      {links.map(([label, href]) => {
        const active = href === "/reseller" ? pathname === href : pathname.startsWith(href);
        return <Link key={href} href={href} className={active ? "active" : ""}>{label}</Link>;
      })}
      <Link href="/">WickSpend</Link>
    </nav>
  );
}
