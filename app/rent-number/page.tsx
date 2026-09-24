import type { Metadata } from "next";
import RentNumberClient from "./RentNumberClient";

export const metadata: Metadata = {
  title: "Rent Virtual Numbers Online",
  description: "Rent virtual numbers for longer-term SMS access through WickSpend. View currently supported rental services, durations and availability.",
  alternates: { canonical: "/rent-number" },
  openGraph: {
    title: "Rent Virtual Numbers Online | WickSpend",
    description: "View currently supported virtual-number rental services, periods and live availability on WickSpend.",
    url: "/rent-number",
    type: "website",
  },
};

export const dynamic = "force-dynamic";

const API_BASE = (process.env.NEXT_PUBLIC_WICKSPEND_API_BASE || "https://n8n.wickspend.com/webhook").replace(/\/$/, "");
let periodCache: { expires: number; values: string[] } | null = null;
async function rentalPeriods(): Promise<string[]> {
  if (periodCache && periodCache.expires > Date.now()) return periodCache.values;
  try {
    const response = await fetch(`${API_BASE}/wickspend/backend/rentals/catalog`, { cache: "no-store" });
    if (!response.ok) return [];
    const payload: any = await response.json();
    const services = Array.isArray(payload?.services) ? payload.services : [];
    const periods = new Map<number, string>();
    for (const service of services) for (const country of Array.isArray(service?.countries) ? service.countries : []) for (const period of Array.isArray(country?.periods) ? country.periods : []) {
      const minutes = Number(period?.duration_minutes);
      const label = String(period?.duration_label || period?.period || "").trim();
      if (Number.isFinite(minutes) && minutes > 0 && label) periods.set(minutes, label);
    }
    const values = [...periods.entries()].sort((a, b) => a[0] - b[0]).map(([, label]) => label);
    periodCache = { expires: Date.now() + 300_000, values };
    return values;
  } catch { return periodCache?.values || []; }
}

export default async function RentNumberPage() {
  const supportedPeriods = await rentalPeriods();
  const breadcrumb = { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [
    { "@type": "ListItem", position: 1, name: "WickSpend", item: "https://wickspend.com/" },
    { "@type": "ListItem", position: 2, name: "Rent Number", item: "https://wickspend.com/rent-number" },
  ] };
  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
    <RentNumberClient supportedPeriods={supportedPeriods} />
  </>;
}
