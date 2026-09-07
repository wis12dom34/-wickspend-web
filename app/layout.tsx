import type { Metadata, Viewport } from "next";
import dynamic from "next/dynamic";
import { AppTestimonials } from "@/components/AppTestimonials";
import "./globals.css";
import "./home-promo-fix.css";
import "./responsive.css";
import "./account-responsive.css";
import "./brand-theme.css";
import "@/components/smart-support.css";

const SmartSupport = dynamic(() => import("@/components/SmartSupport"), { ssr: false });

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
        <SmartSupport />
      </body>
    </html>
  );
}
