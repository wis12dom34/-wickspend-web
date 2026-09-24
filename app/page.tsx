import type { Metadata } from "next";
import HomeClient from "./HomeClient";

export const metadata: Metadata = {
  title: { absolute: "WickSpend | Virtual Numbers & Digital Services" },
  description: "Access virtual numbers, number rentals, digital products, social-media services, temporary email and reseller tools through WickSpend.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "WickSpend | Virtual Numbers & Digital Services",
    description: "Access WickSpend virtual numbers, rentals, Marketplace, Boostly, Temp Mail and reseller tools.",
    url: "/",
    type: "website",
  },
};

export default function HomePage(){return <HomeClient/>;}
