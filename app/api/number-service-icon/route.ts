import { NextResponse } from "next/server";
import { NUMBER_SERVICE_ICON_SOURCES } from "@/lib/number-service-icon-sources";

export const runtime = "nodejs";

const DOMAIN_OVERRIDES: Readonly<Record<string, string>> = {
  "1040com": "1040.com",
  "1688": "1688.com",
  "1stopmove": "1stopmove.com",
  "3fun": "go3fun.co",
  "5miles": "help.5miles.com",
  "7eleven": "7-eleven.com",
  "aarp": "aarp.org",
  "abra": "abra.com",
  "academysportsoutdoors": "academy.com",
  "freshbooks": "freshbooks.com",
  "whatsapp": "whatsapp.com",
  "telegram": "telegram.org",
  "instagram": "instagram.com",
  "facebook": "facebook.com",
  "tiktok": "tiktok.com",
  "google": "google.com",
  "gmail": "gmail.com",
  "microsoft": "microsoft.com",
  "apple": "apple.com",
  "tinder": "tinder.com",
  "snapchat": "snapchat.com",
  "discord": "discord.com",
  "reddit": "reddit.com",
  "netflix": "netflix.com",
  "paypal": "paypal.com",
  "spotify": "spotify.com",
  "youtube": "youtube.com",
  "uber": "uber.com",
  "pinterest": "pinterest.com",
  "twitter": "x.com",
  "xtwitter": "x.com",
  "x": "x.com",
  "gmailgooglevoice": "google.com",
  "googlevoice": "voice.google.com",
  "linkedin": "linkedin.com",
  "amazon": "amazon.com",
  "airbnb": "airbnb.com",
  "linkedincom": "linkedin.com",
};

function normalize(value: string) {
  return value.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "");
}

function serviceDomain(name: string) {
  const raw = name.trim().toLowerCase();
  const explicit = raw.match(/\b(?:[a-z0-9-]+\.)+[a-z]{2,}\b/i)?.[0];
  if (explicit) return explicit.replace(/^www\./, "");

  const pieces = raw.split(/[\/|(),]+/).map(part => part.trim()).filter(Boolean);
  for (const piece of pieces) {
    const key = normalize(piece);
    if (DOMAIN_OVERRIDES[key]) return DOMAIN_OVERRIDES[key];
  }

  const key = normalize(raw);
  if (DOMAIN_OVERRIDES[key]) return DOMAIN_OVERRIDES[key];

  const compact = normalize(pieces[0] || raw);
  return compact && compact.length >= 2 && compact.length <= 48 ? `${compact}.com` : "";
}

async function fetchImage(source: string) {
  try {
    const response = await fetch(source, {
      next: { revalidate: 604800 },
      headers: { "User-Agent": "WickSpend/2.0 (+https://wickspend.com)" },
    });
    if (!response.ok) return null;
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.startsWith("image/")) return null;
    const body = await response.arrayBuffer();
    if (!body.byteLength) return null;
    return { body, contentType };
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code")?.trim().toLowerCase() || "";
  const name = url.searchParams.get("name")?.trim() || "";
  const normalizedName = normalize(name);

  const mapped =
    NUMBER_SERVICE_ICON_SOURCES[normalizedName] ||
    NUMBER_SERVICE_ICON_SOURCES[code];

  const candidates: string[] = [];
  if (mapped) candidates.push(mapped);

  const domain = serviceDomain(name);
  if (domain) {
    candidates.push(`https://icons.duckduckgo.com/ip3/${encodeURIComponent(domain)}.ico`);
    candidates.push(`https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128`);
  }
  if (normalizedName) candidates.push(`https://cdn.simpleicons.org/${encodeURIComponent(normalizedName)}`);

  for (const source of candidates) {
    const image = await fetchImage(source);
    if (!image) continue;
    return new NextResponse(image.body, {
      headers: {
        "Content-Type": image.contentType,
        "Cache-Control": "public, max-age=86400, s-maxage=604800, stale-while-revalidate=2592000",
        "X-Content-Type-Options": "nosniff",
      },
    });
  }

  const words = String(name || code || "S").trim().split(/\s+|[\/_-]+/).filter(Boolean);
  const label = (words.length > 1 ? `${words[0][0] || ""}${words[1][0] || ""}` : String(words[0] || "S").slice(0,2)).toUpperCase().replace(/[^A-Z0-9]/g, "") || "S";
  const fallback = `<svg xmlns="http://www.w3.org/2000/svg" width="72" height="72" viewBox="0 0 72 72"><rect width="72" height="72" rx="20" fill="#EEF5FF"/><text x="36" y="43" text-anchor="middle" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif" font-size="24" font-weight="800" fill="#0866F5">${label}</text></svg>`;
  return new NextResponse(fallback, {
    status: 200,
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=86400, s-maxage=604800, stale-while-revalidate=2592000",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
