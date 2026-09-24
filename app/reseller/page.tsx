import type { Metadata } from "next";
import ResellerClient from "./ResellerClient";

export const metadata: Metadata = {
  title: "Reseller & Mini Store",
  description: "Learn about WickSpend Reseller, Mini Stores, customer management, reseller API access, configurable plans and supported custom-domain tools.",
  alternates: { canonical: "/reseller" },
  openGraph: {
    title: "WickSpend Reseller & Mini Store",
    description: "Run a WickSpend-powered Mini Store and manage reseller customers, services, API access and store settings.",
    url: "/reseller",
    type: "website",
  },
};

export default function ResellerPage(){return <ResellerClient/>;}
