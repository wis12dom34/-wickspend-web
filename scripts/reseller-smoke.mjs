const base = (process.env.BASE_URL || "http://127.0.0.1:3080").replace(/\/$/, "");
const backendBase = (process.env.RESELLER_BACKEND_BASE || "https://n8n.wickspend.com/webhook").replace(/\/$/, "");
const invalidKey = "wick_smoke_invalid_key";
let failures = 0;

function fail(message) {
  failures += 1;
  console.error(`FAIL ${message}`);
}

function pass(message) {
  console.log(`PASS ${message}`);
}

async function request(path, options = {}) {
  const response = await fetch(`${base}${path}`, { redirect: "manual", ...options });
  const text = await response.text();
  let json = null;
  try { json = JSON.parse(text); } catch {}
  return { response, text, json };
}

async function expectStatus(path, status, options = {}) {
  const result = await request(path, options);
  if (result.response.status !== status) fail(`${options.method || "GET"} ${path}: expected ${status}, got ${result.response.status}`);
  else pass(`${options.method || "GET"} ${path}: ${status}`);
  return result;
}

const pageChecks = [
  ["/reseller", []],
  ["/reseller/developer", ["v1.6 live", "Notifications"]],
  ["/reseller/orders", ["Rentals"]],
  ["/reseller/billing", ["Billing"]],
  ["/reseller/store", ["Loading store settings"]],
  ["/reseller/customers", ["Customers"]],
  ["/reseller/finance", ["Money movement"]],
  ["/reseller/notifications", ["Notifications"]],
  ["/api/v1/docs", []],
];
for (const [path, snippets] of pageChecks) {
  const result = await expectStatus(path, 200);
  for (const snippet of snippets) {
    if (!result.text.includes(snippet)) fail(`${path}: missing UI text ${JSON.stringify(snippet)}`);
    else pass(`${path}: contains ${JSON.stringify(snippet)}`);
  }
}

// The Mini Store intentionally supports Numbers, Marketplace and Boostly only.
// These public, purchase-free checks guard its fail-closed routing and ensure
// Rentals or Temp Mail are not silently exposed by later frontend changes.
const invalidStore = await expectStatus("/store/a", 404);
if (!/no-store/i.test(invalidStore.response.headers.get("cache-control") || "")) fail("/store/a: missing no-store cache policy");
else pass("/store/a: fail-closed cache policy");
if (invalidStore.response.headers.get("x-content-type-options") !== "nosniff") fail("/store/a: missing nosniff policy");
else pass("/store/a: nosniff policy");

const missingSlug = "this-store-should-not-exist-smoke";
const missingStore = await expectStatus(`/store/${missingSlug}`, 404);
if (!missingStore.text.includes("Store unavailable")) fail("missing storefront: expected branded unavailable page");
else pass("missing storefront: branded unavailable page");

const storeScript = await expectStatus("/webhook/wickspend/store/app.js", 200);
if (!storeScript.text.includes("authNotice")) fail("Mini Store app: auth feedback is not rendered inside the open account dialog");
else pass("Mini Store app: auth feedback remains visible inside the account dialog");
for (const supported of ["wickspend/store/numbers/buy", "wickspend/store/marketplace/buy", "wickspend/store/boostly/buy"]) {
  if (!storeScript.text.includes(supported)) fail(`Mini Store app: missing supported route ${supported}`);
  else pass(`Mini Store app: exposes ${supported}`);
}
for (const skipped of ["wickspend/store/rentals/", "wickspend/store/temp-mail/"]) {
  if (storeScript.text.includes(skipped)) fail(`Mini Store app: unexpectedly exposes skipped route ${skipped}`);
  else pass(`Mini Store app: does not expose ${skipped}`);
}

const storeSession = await expectStatus("/webhook/wickspend/store/auth/session", 401);
if (storeSession.json?.code !== "UNAUTHORIZED") fail("Mini Store session: expected UNAUTHORIZED");
else pass("Mini Store session boundary rejects missing customer token");

for (const catalogPath of [
  `/webhook/wickspend/store/catalog/numbers?store_slug=${missingSlug}`,
  `/webhook/wickspend/store/catalog/marketplace?slug=${missingSlug}`,
  `/webhook/wickspend/store/catalog/boostly?store_slug=${missingSlug}`,
]) {
  const result = await expectStatus(catalogPath, 404);
  if (!["STORE_NOT_FOUND", "STORE_UNAVAILABLE"].includes(result.json?.code)) fail(`${catalogPath}: expected unavailable-store rejection`);
}

const sessionProtectedReads = [
  "wickspend/backend/reseller/profile",
  "wickspend/backend/reseller/customers?page=1&limit=5",
  "wickspend/backend/reseller/finance/summary",
  "wickspend/backend/reseller/orders?page=1&limit=5",
  "wickspend/backend/reseller/api-keys",
  "wickspend/backend/reseller/webhook",
  "wickspend/backend/reseller/subscription/history",
  "wickspend/backend/reseller/pricing",
  "wickspend/backend/reseller/domain/status",
];
for (const path of sessionProtectedReads) {
  const response = await fetch(`${backendBase}/${path}`, { redirect: "manual" });
  const text = await response.text();
  let json = null;
  try { json = JSON.parse(text); } catch {}
  if (response.status !== 401) fail(`GET ${path}: expected unauthenticated 401, got ${response.status}`);
  else if (json?.code !== "UNAUTHORIZED") fail(`GET ${path}: expected UNAUTHORIZED`);
  else pass(`GET ${path}: session auth boundary 401`);
}

const specResult = await expectStatus("/api/v1/openapi.json", 200);
for (const [header, expected] of [["x-content-type-options", "nosniff"], ["referrer-policy", "no-referrer"]]) {
  if (specResult.response.headers.get(header) !== expected) fail(`OpenAPI response: expected ${header}=${expected}`);
  else pass(`OpenAPI response: ${header}=${expected}`);
}
const requiredPaths = [
  "/numbers/orders",
  "/rentals/orders",
  "/temp-mail/services",
  "/temp-mail/orders",
  "/marketplace/orders",
  "/boostly/orders",
  "/notifications",
  "/notifications/read",
];
if (!specResult.json?.paths) fail("OpenAPI response has no paths object");
else {
  const missing = requiredPaths.filter((path) => !specResult.json.paths[path]);
  if (missing.length) fail(`OpenAPI missing: ${missing.join(", ")}`);
  else pass(`OpenAPI exposes required reseller paths (${specResult.json.info?.version || "unknown version"})`);
}

const invalidHeaders = { "X-API-Key": invalidKey };
for (const path of [
  "/api/v1/numbers/orders?page=1&limit=5",
  "/api/v1/rentals/orders?page=1&limit=5",
  "/api/v1/temp-mail/services",
  "/api/v1/temp-mail/orders?page=1&limit=5",
  "/api/v1/marketplace/orders?page=1&limit=5",
  "/api/v1/boostly/orders?page=1&limit=5",
  "/api/v1/notifications?page=1&limit=5",
]) {
  const result = await expectStatus(path, 401, { headers: invalidHeaders });
  if (result.json?.code !== "INVALID_API_KEY") fail(`${path}: expected INVALID_API_KEY`);
}

const invalidWrites = [
  ["/api/v1/numbers/buy", { country_code:"187", service_code:"wa", provider_id:"invalid", request_key:"smoke-numbers-invalid-key" }],
  ["/api/v1/rentals/buy", { country_code:"US", service_code:"wa", duration_minutes:1440, request_key:"smoke-rentals-invalid-key" }],
  ["/api/v1/temp-mail/buy", { service_code:"wa", request_key:"smoke-mail-invalid-key" }],
  ["/api/v1/temp-mail/cancel", { reference:"SMOKE-NOT-REAL" }],
  ["/api/v1/marketplace/buy", { product_id:"smoke", quantity:1, request_key:"smoke-market-invalid-key" }],
  ["/api/v1/boostly/buy", { service_id:"smoke", target_link:"https://example.com", quantity:1, request_key:"smoke-boost-invalid-key" }],
  ["/api/v1/notifications/read", { notification_id: 1 }],
];
for (const [path, body] of invalidWrites) {
  const result = await expectStatus(path, 401, {
    method: "POST",
    headers: { ...invalidHeaders, "Content-Type":"application/json" },
    body: JSON.stringify(body),
  });
  if (result.json?.code !== "INVALID_API_KEY") fail(`${path}: expected auth rejection before mutation`);
}

// Optional production-safe tenant-isolation verification. Configure two dedicated
// reseller test API keys in CI to enable it. No notification is intentionally
// mutated: key A attempts to mark a notification owned by key B, and the test
// requires updated=0 plus an unchanged B-side read state.
const tenantKeyA = process.env.RESELLER_TENANT_TEST_API_KEY_A?.trim();
const tenantKeyB = process.env.RESELLER_TENANT_TEST_API_KEY_B?.trim();
if (tenantKeyA && tenantKeyB) {
  const headersA = { "X-API-Key": tenantKeyA };
  const headersB = { "X-API-Key": tenantKeyB };
  const [aBefore, bBefore] = await Promise.all([
    expectStatus("/api/v1/notifications?page=1&limit=50", 200, { headers: headersA }),
    expectStatus("/api/v1/notifications?page=1&limit=50", 200, { headers: headersB }),
  ]);

  const aIds = new Set((aBefore.json?.notifications || []).map((item) => Number(item.notification_id ?? item.id)));
  const foreign = (bBefore.json?.notifications || []).find((item) => {
    const id = Number(item.notification_id ?? item.id);
    return Number.isFinite(id) && id > 0 && !aIds.has(id);
  });

  if (!foreign) {
    console.log("SKIP tenant isolation mutation check: test tenant B has no notification unique from tenant A.");
  } else {
    const foreignId = Number(foreign.notification_id ?? foreign.id);
    const foreignBefore = { is_read: Boolean(foreign.is_read ?? foreign.read), read_at: foreign.read_at ?? null };
    const attempt = await expectStatus("/api/v1/notifications/read", 200, {
      method: "POST",
      headers: { ...headersA, "Content-Type":"application/json" },
      body: JSON.stringify({ notification_id: foreignId }),
    });
    if (Number(attempt.json?.updated) !== 0) fail("tenant isolation: reseller A updated reseller B notification");

    const bAfter = await expectStatus("/api/v1/notifications?page=1&limit=50", 200, { headers: headersB });
    const foreignAfter = (bAfter.json?.notifications || []).find((item) => Number(item.notification_id ?? item.id) === foreignId);
    if (!foreignAfter) fail("tenant isolation: reseller B notification disappeared after cross-tenant read attempt");
    else {
      const stateAfter = { is_read: Boolean(foreignAfter.is_read ?? foreignAfter.read), read_at: foreignAfter.read_at ?? null };
      if (stateAfter.is_read !== foreignBefore.is_read || stateAfter.read_at !== foreignBefore.read_at) fail("tenant isolation: reseller B notification read state changed");
      else pass("Notifications tenant isolation blocks cross-reseller read mutation");
    }
  }
} else {
  console.log("SKIP live tenant-isolation check (set RESELLER_TENANT_TEST_API_KEY_A/B to dedicated test reseller keys)." );
}

if (failures) {
  console.error(`\n${failures} reseller smoke test(s) failed.`);
  process.exit(1);
}
console.log("\nAll reseller smoke tests passed.");
