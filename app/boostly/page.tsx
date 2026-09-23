import type { Metadata } from "next";
import BoostlyClient from "./BoostlyClient";

export const metadata: Metadata = {
  title: "Boostly Social Media Services",
  description: "Browse WickSpend Boostly social-media services with live service details, pricing, quantity limits and order-status tracking.",
  alternates: { canonical: "/boostly" },
  openGraph: {
    title: "Boostly Social Media Services | WickSpend",
    description: "Browse live Boostly service options and place tracked social-media service orders through WickSpend.",
    url: "/boostly",
    type: "website",
  },
};

export default function BoostlyPage(){return <BoostlyClient/>;}
