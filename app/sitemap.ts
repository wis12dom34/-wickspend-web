import type { MetadataRoute } from "next";
import { getPublishedTutorials } from "@/lib/tutorials-server";
import { tutorialDate, tutorialSlug } from "@/lib/tutorials";

export const revalidate = 120;
const routes = ["/", "/buy-number", "/rent-number", "/marketplace", "/boostly", "/temp-mail", "/tutorials", "/reseller"] as const;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pages: MetadataRoute.Sitemap = routes.map((path) => ({
    url: `https://wickspend.com${path === "/" ? "" : path}`,
    changeFrequency: path === "/" ? "daily" : "weekly",
    priority: path === "/" ? 1 : 0.8,
  }));
  const tutorials = await getPublishedTutorials();
  const seen = new Set<string>();
  for (const tutorial of tutorials) {
    const url = `https://wickspend.com/tutorials/${tutorialSlug(tutorial)}`;
    if (seen.has(url)) continue;
    seen.add(url);
    const value = tutorialDate(tutorial);
    const modified = value ? new Date(value) : null;
    pages.push({
      url,
      ...(modified && Number.isFinite(modified.getTime()) ? { lastModified: modified } : {}),
      changeFrequency: "weekly",
      priority: 0.7,
    });
  }
  return pages;
}
