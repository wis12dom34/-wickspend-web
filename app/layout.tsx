import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { AppTestimonials } from "@/components/AppTestimonials";
import { SmartSupportLoader } from "@/components/SmartSupportLoader";
import "./globals.css";
import "./home-promo-fix.css";
import "./responsive.css";
import "./account-responsive.css";
import "./brand-theme.css";
import "./marketplace-home-responsive.css";
import "@/components/smart-support.css";

export const metadata: Metadata = {
  title: "WickSpend",
  description: "WickSpend digital services",
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
        {children}
        <AppTestimonials />
        <Suspense fallback={null}>
          <SmartSupportLoader />
        </Suspense>
      </body>
    </html>
  );
}
