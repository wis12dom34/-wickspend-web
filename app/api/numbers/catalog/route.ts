import { NextRequest, NextResponse } from "next/server";
import { getCatalogCached } from "@/lib/server/catalog-cache";

export const dynamic = "force-dynamic";

const API_BASE = (process.env.NEXT_PUBLIC_WICKSPEND_API_BASE || "https://n8n.wickspend.com/webhook").replace(/\/$/, "");
const CATALOG_PATH = "wickspend/backend/numbers/catalog";

async function fetchCountryCatalog(countryCode: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25_000);
  try {
    const response = await fetch(`${API_BASE}/${CATALOG_PATH}?country_code=${encodeURIComponent(countryCode)}`, {
      cache: "no-store",
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    const text = await response.text();
    if (!response.ok || !text) throw new Error(`Catalog upstream failed (${response.status})`);
    return JSON.parse(text);
  } finally {
    clearTimeout(timeout);
  }
}

function filterService(payload: any, serviceCode: string) {
  if (!serviceCode || !Array.isArray(payload?.items)) return payload;
  const wanted = serviceCode.toLowerCase();
  return {
    ...payload,
    items: payload.items.filter((item: any) => String(item?.service_code || "").toLowerCase() === wanted),
  };
}

export async function GET(request: NextRequest) {
  const countryCode = request.nextUrl.searchParams.get("country_code")?.trim() || "19";
  const serviceCode = request.nextUrl.searchParams.get("service_code")?.trim() || "";

  try {
    const cached = await getCatalogCached(`numbers:${countryCode}`, () => fetchCountryCatalog(countryCode));
    return NextResponse.json(filterService(cached.value, serviceCode), {
      headers: {
        "Cache-Control": "private, no-store",
        "X-WickSpend-Cache": cached.state,
        "X-WickSpend-Cache-Age": String(Math.round(cached.ageMs)),
      },
    });
  } catch {
    return NextResponse.json({ ok: false, error: "CATALOG_UNAVAILABLE" }, { status: 503 });
  }
}
