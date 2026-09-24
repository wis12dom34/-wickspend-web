import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getCatalogCached } from "@/lib/server/catalog-cache";

export const dynamic = "force-dynamic";

const API_BASE = (process.env.NEXT_PUBLIC_WICKSPEND_API_BASE || "https://n8n.wickspend.com/webhook").replace(/\/$/, "");
const CATALOG_PATH = "wickspend/backend/numbers/premium-usa/catalog";

async function fetchPremiumCatalog(authorization: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25_000);
  try {
    const response = await fetch(`${API_BASE}/${CATALOG_PATH}`, {
      cache: "no-store",
      signal: controller.signal,
      headers: { Accept: "application/json", ...(authorization ? { Authorization: authorization } : {}) },
    });
    const text = await response.text();
    if (!response.ok || !text) {
      const error = new Error(`Premium catalog upstream failed (${response.status})`);
      (error as Error & { status?: number }).status = response.status;
      throw error;
    }
    return JSON.parse(text);
  } finally {
    clearTimeout(timeout);
  }
}

export async function GET(request: NextRequest) {
  const authorization = request.headers.get("authorization") || "";
  const authScope = createHash("sha256").update(authorization || "anonymous").digest("hex");
  try {
    const cached = await getCatalogCached(
      `premium-usa:${authScope}`,
      () => fetchPremiumCatalog(authorization),
    );
    const response = NextResponse.json(cached.value);
    response.headers.set("X-WickSpend-Cache", cached.state);
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  } catch (error) {
    const upstreamStatus = Number((error as Error & { status?: number })?.status || 0);
    const status = upstreamStatus === 401 || upstreamStatus === 403 ? upstreamStatus : 502;
    return NextResponse.json(
      { ok: false, code: status === 401 || status === 403 ? "UNAUTHORIZED" : "UPSTREAM_UNAVAILABLE" },
      { status },
    );
  }
}
