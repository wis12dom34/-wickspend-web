import { NextResponse } from "next/server";
import { NUMBER_SERVICE_ICON_SOURCES } from "@/lib/number-service-icon-sources";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const code = new URL(request.url).searchParams.get("code")?.trim().toLowerCase() || "";
  const source = NUMBER_SERVICE_ICON_SOURCES[code];
  if (!source) return new NextResponse(null, { status: 404 });

  try {
    const response = await fetch(source, { next: { revalidate: 604800 } });
    if (!response.ok) return new NextResponse(null, { status: 404 });
    const contentType = response.headers.get("content-type") || "image/svg+xml";
    if (!contentType.startsWith("image/")) return new NextResponse(null, { status: 404 });
    return new NextResponse(await response.arrayBuffer(), {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400, s-maxage=604800, stale-while-revalidate=2592000",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new NextResponse(null, { status: 404 });
  }
}
