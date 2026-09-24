import type { Metadata } from "next";
import TempMailClient from "./TempMailClient";

export const metadata: Metadata = {
  title: "Temporary Email Services",
  description: "Use WickSpend Temp Mail to create supported temporary verification inboxes, receive messages and manage the resulting mailbox from your WickSpend account.",
  alternates: { canonical: "/temp-mail" },
  openGraph: {
    title: "Temporary Email Services | WickSpend",
    description: "Browse supported temporary email services and create a WickSpend Temp Mail inbox.",
    url: "/temp-mail",
    type: "website",
  },
};

export default function TempMailPage(){return <TempMailClient/>;}
