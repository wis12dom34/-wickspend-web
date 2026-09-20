import { randomUUID } from "crypto";
import { execFile as execFileCallback } from "node:child_process";
import { createWriteStream } from "fs";
import { access, mkdir, rename, unlink, writeFile } from "fs/promises";
import path from "path";
import { Readable, Transform } from "stream";
import { pipeline } from "stream/promises";
import { promisify } from "node:util";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const API_BASE = (process.env.NEXT_PUBLIC_WICKSPEND_API_BASE || "https://n8n.wickspend.com/webhook").replace(/\/$/, "");
const execFile = promisify(execFileCallback);
const MEDIA_ROOT = "/var/lib/wickspend/media/tutorials";
const LIMITS = { video: 750 * 1024 * 1024, thumbnail: 12 * 1024 * 1024 } as const;
const MIME = {
  video: new Map([["video/mp4", "mp4"], ["video/webm", "webm"], ["video/quicktime", "mov"], ["video/x-quicktime", "mov"]]),
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

function conversionPaths(jobId: string) {
  const processing = path.join(MEDIA_ROOT, "processing");
  return {
    source: path.join(processing, `${jobId}.source.mov`),
    output: path.join(processing, `${jobId}.converting.mp4`),
    failed: path.join(processing, `${jobId}.failed`),
    target: mediaPath("video", `${jobId}.mp4`),
  };
}

async function exists(filename: string) {
  try { await access(filename); return true; } catch { return false; }
}

function startMovConversion(jobId: string) {
  const files = conversionPaths(jobId);
  void execFile("ffmpeg", [
    "-hide_banner", "-loglevel", "error", "-nostdin", "-y",
    "-i", files.source,
    "-map", "0:v:0", "-map", "0:a:0?", "-map_metadata", "-1",
    "-c:v", "libx264", "-preset", "veryfast", "-crf", "23", "-pix_fmt", "yuv420p",
    "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart",
    files.output,
  ], { timeout: 14 * 60 * 1000, maxBuffer: 1024 * 1024 }).then(async () => {
    await rename(files.output, files.target.disk);
    await Promise.all([unlink(files.source).catch(() => undefined), unlink(files.failed).catch(() => undefined)]);
  }).catch(async () => {
    await Promise.all([unlink(files.source).catch(() => undefined), unlink(files.output).catch(() => undefined)]);
    await writeFile(files.failed, new Date().toISOString(), { mode: 0o600 }).catch(() => undefined);
  });
}

export async function GET(request: NextRequest) {
  const jobId = request.nextUrl.searchParams.get("job") || "";
  if (!/^\d{13}-[0-9a-f-]{36}$/i.test(jobId)) return json({ ok: false, code: "INVALID_JOB" }, 400);
  const files = conversionPaths(jobId);
  if (await exists(files.target.disk)) return json({ ok: true, processing: false, url: files.target.publicUrl, content_type: "video/mp4", converted: true });
  if (await exists(files.failed)) return json({ ok: false, code: "TRANSCODE_FAILED", message: "We couldn’t convert this MOV video. Try exporting it again or upload an MP4." }, 422);
  if (await exists(files.source) || await exists(files.output)) return json({ ok: true, processing: true }, 202);
  return json({ ok: false, code: "JOB_NOT_FOUND", message: "This video conversion expired. Please upload the video again." }, 404);
}

export async function POST(request: NextRequest) {
  if (!(await isAuthorized(request))) return json({ ok: false, code: "UNAUTHORIZED" }, 401);
  const kind = kindFrom(request);
  if (!kind) return json({ ok: false, code: "INVALID_MEDIA_KIND" }, 400);
  const contentType = (request.headers.get("content-type") || "").split(";", 1)[0].trim().toLowerCase();
  const extension = MIME[kind].get(contentType as never);
  if (!extension) {
    return json({ ok: false, code: "INVALID_FILE_TYPE", message: kind === "video" ? "Use an MP4, MOV or WebM video." : "Use a JPEG, PNG or WebP image." }, 415);
  }
  if (!request.body) return json({ ok: false, code: "FILE_REQUIRED" }, 400);
  const announced = Number(request.headers.get("content-length") || 0);
  if (announced > LIMITS[kind]) return json({ ok: false, code: "FILE_TOO_LARGE", max_bytes: LIMITS[kind] }, 413);

  const transcodeMov = kind === "video" && extension === "mov";
  const jobId = `${Date.now()}-${randomUUID()}`;
  const filename = `${jobId}.${transcodeMov ? "mp4" : extension}`;
  const target = mediaPath(kind, filename);
  const conversion = transcodeMov ? conversionPaths(jobId) : null;
  const temporary = conversion?.source || `${target.disk}.uploading`;
  await Promise.all([
    mkdir(path.dirname(target.disk), { recursive: true, mode: 0o755 }),
    mkdir(path.dirname(temporary), { recursive: true, mode: 0o755 }),
  ]);

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
    if (transcodeMov) {
      startMovConversion(jobId);
      return json({ ok: true, kind, processing: true, job_id: jobId, status_url: `/api/admin/tutorial-media?job=${encodeURIComponent(jobId)}`, bytes: received }, 202);
    } else {
      await rename(temporary, target.disk);
    }
    return json({ ok: true, kind, url: target.publicUrl, bytes: received, content_type: contentType, converted: false });
  } catch (error) {
    await unlink(temporary).catch(() => undefined);
    await unlink(target.disk).catch(() => undefined);
    if (conversion) await Promise.all([unlink(conversion.output).catch(() => undefined), unlink(conversion.failed).catch(() => undefined)]);
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
