import { randomUUID } from "crypto";
import { createWriteStream } from "fs";
import { mkdir, rename, unlink } from "fs/promises";
import path from "path";
import { Readable, Transform } from "stream";
import { pipeline } from "stream/promises";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const API_BASE = (process.env.NEXT_PUBLIC_WICKSPEND_API_BASE || "https://n8n.wickspend.com/webhook").replace(/\/$/, "");
const MEDIA_ROOT = "/var/lib/wickspend/media/tutorials";
const LIMITS = { video: 750 * 1024 * 1024, thumbnail: 12 * 1024 * 1024 } as const;
const MIME = {
  video: new Map([["video/mp4", "mp4"], ["video/webm", "webm"]]),
  thumbnail: new Map([["image/jpeg", "jpg"], ["image/png", "png"], ["image/webp", "webp"]]),
} as const;

type MediaKind = keyof typeof LIMITS;

function json(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

async function isAuthorized(request: NextRequest) {
  const authorization = request.headers.get("authorization") || "";
  if (!/^Bearer\s+\S+/i.test(authorization)) return false;
  try {
    const response = await fetch(`${API_BASE}/wickspend/backend/admin/dashboard`, {
      method: "GET",
      headers: { Accept: "application/json", Authorization: authorization },
      cache: "no-store",
      signal: AbortSignal.timeout(12000),
    });
    const payload = await response.json().catch(() => null) as { authorized?: boolean; ok?: boolean } | null;
    return response.ok && payload?.authorized === true && payload?.ok !== false;
  } catch {
    return false;
  }
}

function kindFrom(request: NextRequest): MediaKind | null {
  const value = request.nextUrl.searchParams.get("kind");
  return value === "video" || value === "thumbnail" ? value : null;
}

function mediaPath(kind: MediaKind, filename: string) {
  const folder = kind === "video" ? "videos" : "thumbnails";
  return { folder, disk: path.join(MEDIA_ROOT, folder, filename), publicUrl: `/media/tutorials/${folder}/${filename}` };
}

export async function POST(request: NextRequest) {
  if (!(await isAuthorized(request))) return json({ ok: false, code: "UNAUTHORIZED" }, 401);
  const kind = kindFrom(request);
  if (!kind) return json({ ok: false, code: "INVALID_MEDIA_KIND" }, 400);
  const contentType = (request.headers.get("content-type") || "").split(";", 1)[0].trim().toLowerCase();
  const extension = MIME[kind].get(contentType as never);
  if (!extension) {
    return json({ ok: false, code: "INVALID_FILE_TYPE", message: kind === "video" ? "Use an MP4 or WebM video." : "Use a JPEG, PNG or WebP image." }, 415);
  }
  if (!request.body) return json({ ok: false, code: "FILE_REQUIRED" }, 400);
  const announced = Number(request.headers.get("content-length") || 0);
  if (announced > LIMITS[kind]) return json({ ok: false, code: "FILE_TOO_LARGE", max_bytes: LIMITS[kind] }, 413);

  const filename = `${Date.now()}-${randomUUID()}.${extension}`;
  const target = mediaPath(kind, filename);
  const temporary = `${target.disk}.uploading`;
  await mkdir(path.dirname(target.disk), { recursive: true, mode: 0o755 });

  let received = 0;
  const meter = new Transform({
    transform(chunk, _encoding, callback) {
      received += chunk.length;
      if (received > LIMITS[kind]) callback(Object.assign(new Error("FILE_TOO_LARGE"), { code: "FILE_TOO_LARGE" }));
      else callback(null, chunk);
    },
  });

  try {
    await pipeline(Readable.fromWeb(request.body as never), meter, createWriteStream(temporary, { flags: "wx", mode: 0o644 }));
    if (received <= 0) throw Object.assign(new Error("EMPTY_FILE"), { code: "EMPTY_FILE" });
    await rename(temporary, target.disk);
    return json({ ok: true, kind, url: target.publicUrl, bytes: received, content_type: contentType });
  } catch (error) {
    await unlink(temporary).catch(() => undefined);
    const code = error && typeof error === "object" && "code" in error ? String((error as { code?: unknown }).code) : "UPLOAD_FAILED";
    if (code === "FILE_TOO_LARGE") return json({ ok: false, code, max_bytes: LIMITS[kind] }, 413);
    return json({ ok: false, code: code === "EMPTY_FILE" ? code : "UPLOAD_FAILED" }, 500);
  }
}

export async function DELETE(request: NextRequest) {
  if (!(await isAuthorized(request))) return json({ ok: false, code: "UNAUTHORIZED" }, 401);
  const body = await request.json().catch(() => null) as { url?: string } | null;
  const url = String(body?.url || "");
  const match = url.match(/^\/media\/tutorials\/(videos|thumbnails)\/([A-Za-z0-9._-]+)$/);
  if (!match) return json({ ok: false, code: "INVALID_MEDIA_URL" }, 400);
  const folder = match[1];
  const filename = path.basename(match[2]);
  const disk = path.join(MEDIA_ROOT, folder, filename);
  await unlink(disk).catch((error: NodeJS.ErrnoException) => {
    if (error?.code !== "ENOENT") throw error;
  });
  return json({ ok: true });
}
