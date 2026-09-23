import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { AppTestimonials } from "@/components/AppTestimonials";
import { SmartSupportLoader } from "@/components/SmartSupportLoader";
import { NavigationWarmup } from "@/components/NavigationWarmup";
import "./globals.css";
import "./home-promo-fix.css";
import "./responsive.css";
import "./account-responsive.css";
import "./brand-theme.css";
import "./marketplace-home-responsive.css";
import "@/components/smart-support.css";
import "@/components/smart-support-icon.css";
import "./mobile-viewport-fix.css";
import "./bottom-nav-fix.css";
import "./dashboard-quick-actions.css";
import "./seo-content.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://wickspend.com"),
  title: {
    default: "WickSpend | Virtual Numbers & Digital Services",
    template: "%s | WickSpend",
  },
  description: "Access virtual numbers, number rentals, digital products, social-media services, temporary email and reseller tools through WickSpend.",
  applicationName: "WickSpend",
  openGraph: {
    type: "website",
    siteName: "WickSpend",
    title: "WickSpend | Virtual Numbers & Digital Services",
    description: "Access virtual numbers, number rentals, digital products, social-media services, temporary email and reseller tools through WickSpend.",
  },
  twitter: {
    card: "summary",
    title: "WickSpend | Virtual Numbers & Digital Services",
    description: "Virtual numbers, rentals and digital services through WickSpend.",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ "@context": "https://schema.org", "@graph": [
          { "@type": "Organization", "@id": "https://wickspend.com/#organization", name: "WickSpend", url: "https://wickspend.com/" },
          { "@type": "WebSite", "@id": "https://wickspend.com/#website", url: "https://wickspend.com/", name: "WickSpend", publisher: { "@id": "https://wickspend.com/#organization" } }
        ] }) }} />
        {children}
        <NavigationWarmup />
        <AppTestimonials />
        <Suspense fallback={null}>
          <SmartSupportLoader />
        </Suspense>
      </body>
    </html>
  );
}
