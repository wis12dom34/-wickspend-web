import type { Metadata } from "next";
import BuyNumberClient from "./BuyNumberClient";

export const metadata: Metadata = {
  title: "Buy Virtual Numbers Online",
  description: "Buy virtual numbers for supported services and countries on WickSpend. Check current availability and live pricing before purchase.",
  alternates: { canonical: "/buy-number" },
  openGraph: {
    title: "Buy Virtual Numbers Online | WickSpend",
    description: "Check supported countries, services, current availability and live pricing before buying a virtual number on WickSpend.",
    url: "/buy-number",
    type: "website",
  },
};

type SearchParams = Record<string, string | string[] | undefined>;
const countryNames: Record<string, { code: string; label: string }> = {
  "19": { code: "19", label: "Nigeria" }, ng: { code: "19", label: "Nigeria" }, nigeria: { code: "19", label: "Nigeria" },
  "187": { code: "187", label: "United States" }, us: { code: "187", label: "United States" }, usa: { code: "187", label: "United States" }, "united states": { code: "187", label: "United States" },
  "12": { code: "12", label: "United States (virtual)" }, "16": { code: "16", label: "United Kingdom" }, uk: { code: "16", label: "United Kingdom" },
  "43": { code: "43", label: "Germany" }, germany: { code: "43", label: "Germany" }, "36": { code: "36", label: "Canada" }, canada: { code: "36", label: "Canada" },
  "15": { code: "15", label: "Poland" }, poland: { code: "15", label: "Poland" },
};
function first(value: string | string[] | undefined) { return Array.isArray(value) ? value[0] : value; }
function clean(value?: string) { return String(value || "").trim(); }
function serviceLabel(value?: string) {
  const raw = clean(value);
  if (!raw) return "";
  const known: Record<string, string> = { whatsapp: "WhatsApp", telegram: "Telegram", instagram: "Instagram", facebook: "Facebook", tiktok: "TikTok", google: "Google", gmail: "Google / Gmail" };
  return known[raw.toLowerCase()] || raw.replace(/[_-]+/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

export default async function BuyNumberPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const requestedCountry = clean(first(params.country));
  const requestedService = clean(first(params.service));
  const premium = first(params.premium) === "1";
  const country = countryNames[requestedCountry.toLowerCase()];
  const selectedCountry = premium ? "US" : (country?.code || requestedCountry || "19");
  const selectedService = requestedService || "telegram";
  const service = serviceLabel(requestedService);
  const countryLabel = country?.label || "";
  const seoTitle = premium
    ? "Buy a Premium USA Virtual Number"
    : service && countryLabel
      ? `Buy ${service} Virtual Numbers in ${countryLabel}`
      : service
        ? `Buy ${service} Virtual Numbers Online`
        : countryLabel
          ? `Buy Virtual Numbers in ${countryLabel}`
          : "Buy Virtual Numbers Online";
  const seoIntro = premium
    ? "Choose a supported Premium USA service, then check the current live availability and price before purchase."
    : `Buy virtual numbers for supported services and countries on WickSpend${service ? `, including the selected ${service} service` : ""}${countryLabel ? ` in ${countryLabel}` : ""}. Current availability and pricing are loaded live before purchase.`;
  const breadcrumb = { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [
    { "@type": "ListItem", position: 1, name: "WickSpend", item: "https://wickspend.com/" },
    { "@type": "ListItem", position: 2, name: "Buy Number", item: "https://wickspend.com/buy-number" },
  ] };
  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
    <BuyNumberClient initialCountry={selectedCountry} initialService={selectedService} initialPremium={premium} seoTitle={seoTitle} seoIntro={seoIntro} />
  </>;
}
