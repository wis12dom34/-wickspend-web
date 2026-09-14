const base = (process.env.BASE_URL || "http://127.0.0.1:3080").replace(/\/$/, "");
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
  ["/api/v1/docs", []],
];
for (const [path, snippets] of pageChecks) {
  const result = await expectStatus(path, 200);
  for (const snippet of snippets) {
    if (!result.text.includes(snippet)) fail(`${path}: missing UI text ${JSON.stringify(snippet)}`);
    else pass(`${path}: contains ${JSON.stringify(snippet)}`);
  }
}

const specResult = await expectStatus("/api/v1/openapi.json", 200);
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
