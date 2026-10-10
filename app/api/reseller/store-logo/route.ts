import { mkdir, unlink, writeFile } from "fs/promises";
import path from "path";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const API_BASE = (process.env.NEXT_PUBLIC_WICKSPEND_API_BASE || "https://n8n.wickspend.com/webhook").replace(/\/$/, "");
const MEDIA_ROOT = "/var/lib/wickspend/media/store-logos";
const MAX_BYTES = 2 * 1024 * 1024;
const PNG_SIGNATURE = Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]);

function json(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

function oldUploadedLogoPath(url: unknown) {
  const value = String(url || "");
  try {
    const parsed = new URL(value, "https://wickspend.com");
    const match = parsed.pathname.match(/^\/media\/store-logos\/([A-Za-z0-9._-]+\.png)$/);
    return match ? path.join(MEDIA_ROOT, path.basename(match[1])) : "";
  } catch {
    return "";
  }
}

export async function POST(request: NextRequest) {
  const authorization = request.headers.get("authorization") || "";
  if (!/^Bearer\s+\S+/i.test(authorization)) return json({ ok: false, code: "UNAUTHORIZED" }, 401);

  const contentType = (request.headers.get("content-type") || "").split(";", 1)[0].trim().toLowerCase();
  if (contentType !== "image/png") return json({ ok: false, code: "PNG_REQUIRED", message: "Upload a PNG image." }, 415);
  const announced = Number(request.headers.get("content-length") || 0);
  if (announced > MAX_BYTES) return json({ ok: false, code: "FILE_TOO_LARGE", max_bytes: MAX_BYTES }, 413);

  let profileResponse: Response;
  try {
    profileResponse = await fetch(`${API_BASE}/wickspend/backend/reseller/profile`, {
      headers: { Accept: "application/json", Authorization: authorization },
      cache: "no-store",
      signal: AbortSignal.timeout(12000),
    });
  } catch {
    return json({ ok: false, code: "PROFILE_UNAVAILABLE" }, 503);
  }
  const profile = await profileResponse.json().catch(() => null) as any;
  if (!profileResponse.ok || profile?.ok !== true) return json({ ok: false, code: profile?.code || "UNAUTHORIZED" }, profileResponse.status === 429 ? 429 : 401);
  if (profile?.reseller?.status !== "active" || profile?.subscription?.active !== true) return json({ ok: false, code: "SUBSCRIPTION_INACTIVE" }, 403);
  const resellerId = Number(profile?.reseller?.id);
  if (!Number.isSafeInteger(resellerId) || resellerId <= 0) return json({ ok: false, code: "RESELLER_NOT_FOUND" }, 404);

  const bytes = Buffer.from(await request.arrayBuffer());
  if (!bytes.length) return json({ ok: false, code: "FILE_REQUIRED" }, 400);
  if (bytes.length > MAX_BYTES) return json({ ok: false, code: "FILE_TOO_LARGE", max_bytes: MAX_BYTES }, 413);
  if (bytes.length < PNG_SIGNATURE.length || !bytes.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE)) {
    return json({ ok: false, code: "INVALID_PNG", message: "The selected file is not a valid PNG image." }, 415);
  }

  await mkdir(MEDIA_ROOT, { recursive: true, mode: 0o755 });
  const filename = `reseller-${resellerId}-${Date.now()}.png`;
  const disk = path.join(MEDIA_ROOT, filename);
  await writeFile(disk, bytes, { flag: "wx", mode: 0o644 });
  const publicUrl = `https://wickspend.com/media/store-logos/${filename}`;
  const store = profile?.store || {};

  try {
    const update = await fetch(`${API_BASE}/wickspend/backend/reseller/store`, {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json", Authorization: authorization },
      body: JSON.stringify({
        store_name: store.store_name || "Store",
        store_slug: store.slug || "store",
        logo_url: publicUrl,
        primary_color: store.primary_color || "#0866F5",
        support_email: store.support_email || "",
        support_phone: store.support_phone || "",
        custom_domain: store.custom_domain || "",
        enabled: Boolean(store.enabled),
        rent_number_enabled: store.rent_number_enabled !== false,
        landing_config: store.landing_config && typeof store.landing_config === "object" ? store.landing_config : {},
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(12000),
    });
    const payload = await update.json().catch(() => null) as any;
    if (!update.ok || payload?.ok !== true) {
      await unlink(disk).catch(() => undefined);
      return json({ ok: false, code: payload?.code || "LOGO_SAVE_FAILED" }, update.status || 502);
    }
  } catch {
    await unlink(disk).catch(() => undefined);
    return json({ ok: false, code: "LOGO_SAVE_FAILED" }, 503);
  }

  const previous = oldUploadedLogoPath(store.logo_url);
  if (previous && previous !== disk) await unlink(previous).catch(() => undefined);
  return json({ ok: true, url: publicUrl, bytes: bytes.length });
}
