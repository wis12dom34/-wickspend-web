import type { Metadata, Viewport } from "next";
import { AppTestimonials } from "@/components/AppTestimonials";
import "./globals.css";

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
      </body>
    </html>
  );
}
