import type { Metadata } from "next";
import TutorialsClient from "./TutorialsClient";
import { getPublishedTutorials } from "@/lib/tutorials-server";

export const metadata: Metadata = {
  title: "Tutorials",
  description: "Watch published WickSpend tutorials for virtual numbers, rentals, wallet funding and other supported WickSpend services.",
  alternates: { canonical: "/tutorials" },
  openGraph: {
    title: "WickSpend Tutorials",
    description: "Published walkthroughs for using WickSpend services.",
    url: "/tutorials",
    type: "website",
  },
};

export default async function TutorialsPage() {
  const tutorials = await getPublishedTutorials();
  return <>
    <TutorialsClient initialTutorials={tutorials} />
  </>;
}
