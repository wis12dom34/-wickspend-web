import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const API_BASE = (process.env.NEXT_PUBLIC_WICKSPEND_API_BASE || "https://n8n.wickspend.com/webhook").replace(/\/$/, "");
const UPSTREAM = `${API_BASE}/wickspend/backend/admin/marketplace/product`;

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

async function upstream(authorization: string, body: Record<string, unknown>) {
  const response = await fetch(UPSTREAM, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json", Authorization: authorization },
    body: JSON.stringify(body),
    cache: "no-store",
    signal: AbortSignal.timeout(12000),
  });
  const payload = await response.json().catch(() => null) as Record<string, unknown> | null;
  return { response, payload };
}

export async function POST(request: NextRequest) {
  const authorization = request.headers.get("authorization") || "";
  if (!/^Bearer\s+\S+/i.test(authorization)) return json({ ok: false, code: "UNAUTHORIZED" }, 401);

  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body || typeof body !== "object") return json({ ok: false, code: "INVALID_REQUEST" }, 400);

  try {
    const items = Array.isArray(body.inventory_items) ? body.inventory_items : [];
    if (body.action === "update" && items.length > 0) {
      const productId = String(body.product_id || "");
      const updateBody = { ...body };
      delete updateBody.inventory_items;
      const first = await upstream(authorization, updateBody);
      if (!first.response.ok || first.payload?.ok === false) return json(first.payload || { ok: false, code: "UPSTREAM_ERROR" }, first.response.status);

      const second = await upstream(authorization, { action: "inventory", product_id: productId, inventory_items: items });
      if (!second.response.ok || second.payload?.ok === false) return json(second.payload || { ok: false, code: "UPSTREAM_ERROR" }, second.response.status);
      return json({ ...first.payload, inventory_added: second.payload?.inventory_added ?? 0, available_inventory: second.payload?.available_inventory ?? 0 });
    }

    const result = await upstream(authorization, body);
    return json(result.payload || { ok: false, code: "UPSTREAM_ERROR" }, result.response.status);
  } catch (error) {
    const timeout = error instanceof DOMException && error.name === "TimeoutError";
    return json({ ok: false, code: timeout ? "UPSTREAM_TIMEOUT" : "UPSTREAM_UNAVAILABLE" }, timeout ? 504 : 502);
  }
}
